/** A single HLS output variant. Bitrates are intentionally conservative for web playback. */
export interface HlsRendition {
  name: '360p' | '720p' | '1080p';
  height: number;
  videoBitrate: string;
  maxRate: string;
  bufferSize: string;
  audioBitrate: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
}

export interface ProcessVideoInput {
  sourcePath: string;
  outputDirectory: string;
  /** Seconds from the beginning used for the poster image. Defaults to 1 second. */
  thumbnailTimestampSeconds?: number;
}

export interface ProcessVideoResult {
  masterPlaylistPath: string;
  thumbnailPath: string;
  renditions: HlsRendition[];
  metadata: VideoMetadata;
}

export interface VideoProcessor {
  process(input: ProcessVideoInput): Promise<ProcessVideoResult>;
}
