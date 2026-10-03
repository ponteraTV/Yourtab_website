export interface WorkerConfig {
  redisUrl: string;
  concurrency: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const concurrency = Number(env.WORKER_CONCURRENCY ?? '2');
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('WORKER_CONCURRENCY must be a positive integer.');
  return { redisUrl: env.REDIS_URL ?? 'redis://localhost:6379', concurrency };
}
