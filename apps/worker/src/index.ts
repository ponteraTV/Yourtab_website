import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { FfmpegVideoProcessor } from '@yourtab/video';
import { loadConfig } from './config.js';
import { PROCESS_VIDEO_JOB, VIDEO_PROCESSING_QUEUE, type ProcessVideoJob, type ProcessedVideoJob } from './jobs.js';

const config = loadConfig();
const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
const processor = new FfmpegVideoProcessor();

const worker = new Worker<ProcessVideoJob, ProcessedVideoJob>(
  VIDEO_PROCESSING_QUEUE,
  async (job) => {
    if (job.name !== PROCESS_VIDEO_JOB) throw new Error(`Unsupported job name: ${job.name}`);
    await job.updateProgress(5);
    const result = await processor.process(job.data);
    await job.updateProgress(100);
    return { videoId: job.data.videoId, ...result };
  },
  { connection, concurrency: config.concurrency },
);

worker.on('ready', () => console.info(`Video worker is ready (queue=${VIDEO_PROCESSING_QUEUE}, concurrency=${config.concurrency}).`));
worker.on('completed', (job) => console.info(`Processed video ${job.data.videoId} (job ${job.id}).`));
worker.on('failed', (job, error) => console.error(`Video job ${job?.id ?? 'unknown'} failed:`, error));
worker.on('error', (error) => console.error('Video worker error:', error));

async function shutdown(signal: string): Promise<void> {
  console.info(`Received ${signal}; stopping video worker.`);
  await worker.close();
  await connection.quit();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void shutdown(signal).catch((error: unknown) => { console.error(error); process.exitCode = 1; }); });
}
