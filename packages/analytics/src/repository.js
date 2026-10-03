/** PostgreSQL repository. `db.query(sql, values)` may be supplied by pg/your data layer. */
export class PostgresAnalyticsRepository {
  constructor(db) { this.db = db; }

  async insert(event, context = {}) {
    const sql = `INSERT INTO analytics_events
      (id,event_name,occurred_at,user_id,anonymous_id,session_id,video_id,ad_id,page_path,duration_seconds,properties,ip_hash,user_agent)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`;
    await this.db.query(sql, [event.id, event.name, event.occurredAt, event.userId, event.anonymousId,
      event.sessionId, event.videoId, event.adId, event.pagePath, event.durationSeconds,
      event.properties, context.ipHash ?? null, context.userAgent ?? null]);
    return event;
  }

  async dashboard({ from, to, timezone = 'UTC' }) {
    const sql = `WITH scoped AS (
      SELECT * FROM analytics_events WHERE occurred_at >= $1 AND occurred_at < $2
    ), days AS (
      SELECT date_trunc('day', occurred_at AT TIME ZONE $3) AS day,
        count(*) FILTER (WHERE event_name = 'page_view')::int AS views,
        count(DISTINCT COALESCE(user_id::text, anonymous_id))::int AS active_users,
        COALESCE(sum(duration_seconds) FILTER (WHERE event_name IN ('video_progress','video_complete')), 0) AS watch_time_seconds
      FROM scoped GROUP BY 1
    )
    SELECT (SELECT count(*)::int FROM scoped WHERE event_name = 'page_view') AS total_views,
      (SELECT count(DISTINCT COALESCE(user_id::text, anonymous_id))::int FROM scoped) AS active_users,
      (SELECT COALESCE(sum(duration_seconds) FILTER (WHERE event_name IN ('video_progress','video_complete')), 0) FROM scoped) AS watch_time_seconds,
      COALESCE((SELECT json_agg(days ORDER BY day) FROM days), '[]'::json) AS series`;
    const { rows } = await this.db.query(sql, [from, to, timezone]);
    return rows[0];
  }

  async video({ from, to, videoId = null }) {
    const sql = `SELECT video_id, count(*) FILTER (WHERE event_name = 'video_impression')::int AS impressions,
      count(*) FILTER (WHERE event_name = 'video_start')::int AS starts,
      count(*) FILTER (WHERE event_name = 'video_complete')::int AS completions,
      COALESCE(sum(duration_seconds) FILTER (WHERE event_name IN ('video_progress','video_complete')), 0) AS watch_time_seconds
      FROM analytics_events WHERE occurred_at >= $1 AND occurred_at < $2 AND ($3::uuid IS NULL OR video_id = $3)
      GROUP BY video_id ORDER BY starts DESC`;
    const { rows } = await this.db.query(sql, [from, to, videoId]);
    return rows.map((row) => ({ ...row, completionRate: row.starts ? Number(row.completions) / Number(row.starts) : 0 }));
  }

  async users({ from, to }) {
    const sql = `SELECT COALESCE(user_id::text, anonymous_id) AS user_key,
      min(occurred_at) AS first_seen_at, max(occurred_at) AS last_seen_at,
      count(*)::int AS events, COALESCE(sum(duration_seconds) FILTER (WHERE event_name IN ('video_progress','video_complete')), 0) AS watch_time_seconds
      FROM analytics_events WHERE occurred_at >= $1 AND occurred_at < $2
      GROUP BY 1 ORDER BY last_seen_at DESC`;
    const { rows } = await this.db.query(sql, [from, to]); return rows;
  }
}
