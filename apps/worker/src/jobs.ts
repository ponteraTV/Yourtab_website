import type { ProcessVideoInput, ProcessVideoResult } from '@yourtab/video';

export const VIDEO_PROCESSING_QUEUE = 'video-processing';
export const PROCESS_VIDEO_JOB = 'process-video';

/** Payload enqueued by the API after the upload has been persisted. Paths must be accessible to the worker. */
export interface ProcessVideoJob extends ProcessVideoInput {
  videoId: string;
}

export interface ProcessedVideoJob extends ProcessVideoResult {
  videoId: string;
}
