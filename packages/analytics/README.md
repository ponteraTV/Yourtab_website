# Analytics package

This package provides an append-only, event-based analytics boundary for Yourtab.

## Supported events

`page_view`, `video_impression`, `video_start`, `video_progress`, `video_complete`, `ad_impression`, `ad_click`, `ad_complete`, `search`, `signup`, and `login` are accepted. Each event needs either a stable `userId` or a browser-generated `anonymousId`. Video progress and completion events may include `durationSeconds`; this is the source of truth for aggregated watch time.

## Host routes

Mount the framework-neutral handlers returned by `createAnalyticsHandlers` as:

| Route | Handler | Access |
| --- | --- | --- |
| `POST /analytics/events` | `ingest` | public |
| `POST /analytics/events/batch` | `ingestBatch` | public, maximum 100 events |
| `GET /admin/analytics/dashboard` | `dashboard` | admin |
| `GET /admin/analytics/videos` | `videoAnalytics` | admin |
| `GET /admin/analytics/users` | `userAnalytics` | admin |

Dashboard queries require ISO-8601 `from` and `to` values and accept an optional IANA/PostgreSQL `timezone`. The dashboard returns total views, distinct active users, watch time, and daily trend points; the video endpoint returns impressions, starts, completions, watch time, and completion rate; the user endpoint returns first/last seen, event counts, and watch time.

Apply `migrations/001_create_analytics_events.sql` with the application's migration runner before constructing `PostgresAnalyticsRepository`. The host must hash IP addresses before passing `ipHash`, and must supply `requireAdmin` with its existing authorization middleware.
