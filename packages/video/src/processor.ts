import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { HlsRendition, ProcessVideoInput, ProcessVideoResult, VideoMetadata, VideoProcessor } from './types.js';

const RENDITIONS: readonly HlsRendition[] = [
  { name: '360p', height: 360, videoBitrate: '800k', maxRate: '856k', bufferSize: '1200k', audioBitrate: '96k' },
  { name: '720p', height: 720, videoBitrate: '2800k', maxRate: '2996k', bufferSize: '4200k', audioBitrate: '128k' },
  { name: '1080p', height: 1080, videoBitrate: '5000k', maxRate: '5350k', bufferSize: '7500k', audioBitrate: '192k' },
];

interface FfprobeOutput { streams?: Array<{ codec_type?: string; width?: number; height?: number }>; format?: { duration?: string } }

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk; });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk; });
    child.once('error', (error) => reject(new Error(`Could not start ${command}: ${error.message}`)));
    child.once('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`)));
  });
}

export function buildHlsArguments(sourcePath: string, outputDirectory: string, rendition: HlsRendition): string[] {
  return [
    '-y', '-i', sourcePath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-vf', `scale=-2:${rendition.height}:force_original_aspect_ratio=decrease`,
    '-b:v', rendition.videoBitrate, '-maxrate', rendition.maxRate, '-bufsize', rendition.bufferSize,
    '-c:a', 'aac', '-b:a', rendition.audioBitrate, '-ac', '2',
    '-g', '48', '-keyint_min', '48', '-sc_threshold', '0',
    '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
    '-hls_segment_filename', join(outputDirectory, rendition.name, 'segment_%03d.ts'),
    join(outputDirectory, rendition.name, 'index.m3u8'),
  ];
}

export function buildThumbnailArguments(sourcePath: string, thumbnailPath: string, timestampSeconds: number): string[] {
  return ['-y', '-ss', String(Math.max(0, timestampSeconds)), '-i', sourcePath, '-frames:v', '1', '-q:v', '2', thumbnailPath];
}

function masterPlaylist(renditions: readonly HlsRendition[]): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-INDEPENDENT-SEGMENTS'];
  for (const rendition of renditions) {
    const bandwidth = Math.round(Number.parseInt(rendition.videoBitrate, 10) * 1000 * 1.08 + Number.parseInt(rendition.audioBitrate, 10) * 1000);
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},NAME="${rendition.name}"`);
    lines.push(`${rendition.name}/index.m3u8`);
  }
  return `${lines.join('\n')}\n`;
}

export class FfmpegVideoProcessor implements VideoProcessor {
  async process(input: ProcessVideoInput): Promise<ProcessVideoResult> {
    const metadata = await this.probe(input.sourcePath);
    const renditions = RENDITIONS.filter((rendition) => rendition.height <= metadata.height);
    // Tiny videos still receive a playable 360p rendition rather than producing no output.
    const selected = renditions.length > 0 ? renditions : [RENDITIONS[0]];
    await mkdir(input.outputDirectory, { recursive: true });
    await Promise.all(selected.map(async (rendition) => {
      await mkdir(join(input.outputDirectory, rendition.name), { recursive: true });
      await run('ffmpeg', buildHlsArguments(input.sourcePath, input.outputDirectory, rendition));
    }));
    const thumbnailPath = join(input.outputDirectory, 'thumbnail.jpg');
    await run('ffmpeg', buildThumbnailArguments(input.sourcePath, thumbnailPath, input.thumbnailTimestampSeconds ?? 1));
    const masterPlaylistPath = join(input.outputDirectory, 'master.m3u8');
    await writeFile(masterPlaylistPath, masterPlaylist(selected), 'utf8');
    return { masterPlaylistPath, thumbnailPath, renditions: [...selected], metadata };
  }

  private async probe(sourcePath: string): Promise<VideoMetadata> {
    const raw = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', sourcePath]);
    const output = JSON.parse(raw) as FfprobeOutput;
    const stream = output.streams?.[0];
    const durationSeconds = Number(output.format?.duration);
    if (!stream?.width || !stream.height || !Number.isFinite(durationSeconds)) throw new Error('Input does not contain a valid video stream.');
    return { width: stream.width, height: stream.height, durationSeconds };
  }
}
