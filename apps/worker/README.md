# Video worker

The worker consumes the BullMQ `video-processing` queue and requires `ffmpeg` and `ffprobe` on `PATH`. Redis defaults to the service in the repository `docker-compose.yml`.

```sh
docker compose up -d redis
REDIS_URL=redis://localhost:6379 npm run dev --workspace=@yourtab/worker
```

Enqueue a `process-video` job with `videoId`, `sourcePath`, and `outputDirectory`. Both paths must be visible to the worker (mount the same upload/object-storage filesystem in production). The result contains `master.m3u8`, one HLS VOD playlist per source-appropriate 360p/720p/1080p rendition, TS segments, and `thumbnail.jpg`. Jobs retry three times with exponential backoff.
