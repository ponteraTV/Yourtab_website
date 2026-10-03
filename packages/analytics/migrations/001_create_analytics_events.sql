-- Append-only event store. PostgreSQL 14+.
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'page_view', 'video_impression', 'video_start', 'video_progress',
    'video_complete', 'ad_impression', 'ad_click', 'ad_complete',
    'search', 'signup', 'login'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NULL,
  anonymous_id TEXT NULL,
  session_id TEXT NULL,
  video_id UUID NULL,
  ad_id UUID NULL,
  page_path TEXT NULL,
  duration_seconds NUMERIC(12, 3) NULL CHECK (duration_seconds >= 0),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT NULL,
  user_agent TEXT NULL,
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL),
  CHECK (duration_seconds IS NULL OR event_name IN ('video_progress', 'video_complete'))
);

CREATE INDEX analytics_events_occurred_at_idx ON analytics_events (occurred_at);
CREATE INDEX analytics_events_event_occurred_idx ON analytics_events (event_name, occurred_at);
CREATE INDEX analytics_events_user_occurred_idx ON analytics_events (user_id, occurred_at) WHERE user_id IS NOT NULL;
CREATE INDEX analytics_events_session_occurred_idx ON analytics_events (session_id, occurred_at) WHERE session_id IS NOT NULL;
CREATE INDEX analytics_events_video_occurred_idx ON analytics_events (video_id, occurred_at) WHERE video_id IS NOT NULL;
CREATE INDEX analytics_events_ad_occurred_idx ON analytics_events (ad_id, occurred_at) WHERE ad_id IS NOT NULL;
