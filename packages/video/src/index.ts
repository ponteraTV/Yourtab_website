export interface VideoProcessor { probe(input: string): Promise<{ durationSeconds: number }>; }

