import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@vaultstream/database";
import { storage, storageBucket } from "@vaultstream/storage";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const queue = process.env.VIDEO_QUEUE || "vaultstream:video-jobs";

async function run(cmd: string, args: string[], onOutput?: (chunk: string) => void): Promise<string> {
  let output = "";
  await new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout?.on("data", chunk => { const text = String(chunk); output += text; onOutput?.(text); });
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
  });
  return output;
}

async function download(key: string, file: string) {
  const obj = await storage.send(new GetObjectCommand({ Bucket: storageBucket(), Key: key }));
  if (!obj.Body) throw new Error("Storage object has no body");
  const body = obj.Body as NodeJS.ReadableStream;
  if (typeof (body as any).pipe !== "function") throw new Error("Storage object is not streamable");
  await pipeline(body, createWriteStream(file));
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
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "PROCESSING", progress: 0, attempts: { increment: 1 }, startedAt: new Date() } });
    await prisma.video.update({ where: { id: videoId }, data: { status: "PROCESSING" } });
    const input = `${work}/source`;
    const out = `${work}/hls`;
    await mkdir(out);
    await download(video.sourceKey, input);
    const durationOutput = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input]);
    const durationSec = Number(durationOutput.trim());
    if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error("Unable to determine video duration");
    await prisma.video.update({ where: { id: videoId }, data: { durationSec: Math.ceil(durationSec) } });
    let progressBuffer = "";
    let lastProgress = 0;
    let progressWrite = Promise.resolve();
    const captureProgress = (chunk: string) => {
      progressBuffer += chunk;
      const progressLines = progressBuffer.split(/\r?\n/);
      progressBuffer = progressLines.pop() || "";
      for (const line of progressLines) {
        if (!line.startsWith("out_time_ms=")) continue;
        const timeMicroseconds = Number(line.slice("out_time_ms=".length));
        if (!Number.isFinite(timeMicroseconds) || timeMicroseconds < 0) continue;
        const percent = Math.max(0, Math.min(99, Math.floor((timeMicroseconds / 1_000_000 / durationSec) * 100)));
        if (percent > lastProgress) {
          lastProgress = percent;
          progressWrite = progressWrite.then(() => prisma.videoJob.update({ where: { id: job.id }, data: { progress: percent } })).catch(error => console.error("Could not save video progress", error));
        }
      }
    };
    await run("ffmpeg", ["-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-profile:v", "baseline", "-level", "4.0", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "128k", "-ac", "2", "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments", "-hls_segment_filename", `${out}/segment-%05d.ts`, "-progress", "pipe:1", "-nostats", `${out}/index.m3u8`], captureProgress);
    await progressWrite;
    const prefix = `hls/${video.id}`;
    await uploadDir(out, prefix);
    await prisma.video.update({ where: { id: videoId }, data: { status: "READY", hlsKey: `${prefix}/index.m3u8`, publishedAt: video.publishedAt || new Date() } });
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "COMPLETED", progress: 100, finishedAt: new Date() } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const nextAttempt = job.attempts + 1;
    const retry = nextAttempt < 3;
    await prisma.videoJob.update({
      where: { id: job.id },
      data: retry
        ? { status: "QUEUED", progress: 0, error: message.slice(0, 4000), finishedAt: null }
        : { status: "FAILED", error: message.slice(0, 4000), finishedAt: new Date() },
    });
    await prisma.video.update({ where: { id: videoId }, data: { status: retry ? "PROCESSING" : "FAILED" } });
    if (retry) {
      console.warn(`Video ${videoId} failed attempt ${nextAttempt}; retrying once more after queue delay.`);
      await new Promise(resolve => setTimeout(resolve, Math.min(5000 * nextAttempt, 15000)));
      await redis.lpush(queue, videoId);
    } else {
      console.error(`Video ${videoId} failed after ${nextAttempt} attempts.`);
    }
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
