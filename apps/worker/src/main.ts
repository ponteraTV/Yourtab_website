import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@vaultstream/database";
import { storage, storageBucket } from "@vaultstream/storage";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const queue = process.env.VIDEO_QUEUE || "vaultstream:video-jobs";

async function run(cmd: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
  });
}

async function download(key: string, file: string) {
  const obj = await storage.send(new GetObjectCommand({ Bucket: storageBucket(), Key: key }));
  if (!obj.Body) throw new Error("Storage object has no body");
  const bytes = await obj.Body.transformToByteArray();
  await import("node:fs/promises").then(fs => fs.writeFile(file, bytes));
}

async function uploadDir(dir: string, prefix: string) {
  const { readdir, readFile } = await import("node:fs/promises");
  for (const name of await readdir(dir)) {
    const path = `${dir}/${name}`;
    const stat = await import("node:fs/promises").then(fs => fs.stat(path));
    if (stat.isDirectory()) await uploadDir(path, `${prefix}/${name}`);
    else {
      const body = await readFile(path);
      const contentType = name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";
      await storage.send(new PutObjectCommand({ Bucket: storageBucket(), Key: `${prefix}/${name}`, Body: body, ContentType: contentType }));
    }
  }
}

async function processVideo(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video?.sourceKey) return;
  const job = await prisma.videoJob.findFirst({ where: { videoId, status: "QUEUED" }, orderBy: { createdAt: "asc" } });
  if (!job) return;
  const work = `/tmp/vaultstream-${randomUUID()}`;
  await mkdir(work, { recursive: true });
  try {
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "PROCESSING", attempts: { increment: 1 }, startedAt: new Date() } });
    await prisma.video.update({ where: { id: videoId }, data: { status: "PROCESSING" } });
    const input = `${work}/source`;
    const out = `${work}/hls`;
    await mkdir(out);
    await download(video.sourceKey, input);
    await run("ffmpeg", ["-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-profile:v", "baseline", "-level", "4.0", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "128k", "-ac", "2", "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments", "-hls_segment_filename", `${out}/segment-%05d.ts`, `${out}/index.m3u8`]);
    const prefix = `hls/${video.id}`;
    await uploadDir(out, prefix);
    await prisma.video.update({ where: { id: videoId }, data: { status: "READY", hlsKey: `${prefix}/index.m3u8`, publishedAt: video.publishedAt || new Date() } });
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "COMPLETED", finishedAt: new Date() } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.video.update({ where: { id: videoId }, data: { status: "FAILED" } });
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "FAILED", error: message, finishedAt: new Date() } });
  } finally { await rm(work, { recursive: true, force: true }); }
}

async function main() {
  console.info("YourTab video worker started");
  while (true) {
    const item = await redis.brpop(queue, 0);
    if (item?.[1]) await processVideo(item[1]);
  }
}
main().catch(err => { console.error(err); process.exit(1); });
