import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PROCESS_VIDEO_JOB, VIDEO_PROCESSING_QUEUE, type ProcessVideoJob } from './jobs.js';

/** Create this in the API process to enqueue stored uploads for asynchronous processing. */
export function createVideoQueue(redisUrl: string): Queue<ProcessVideoJob> {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  return new Queue<ProcessVideoJob>(VIDEO_PROCESSING_QUEUE, { connection, defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: { age: 604_800, count: 5_000 },
  } });
}

export async function enqueueVideoProcessing(queue: Queue<ProcessVideoJob>, job: ProcessVideoJob): Promise<void> {
  await queue.add(PROCESS_VIDEO_JOB, job, { jobId: job.videoId });
}
