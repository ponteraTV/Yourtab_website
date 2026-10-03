export const EVENT_NAMES = Object.freeze([
  'page_view', 'video_impression', 'video_start', 'video_progress',
  'video_complete', 'ad_impression', 'ad_click', 'ad_complete',
  'search', 'signup', 'login',
]);

const EVENT_SET = new Set(EVENT_NAMES);
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export class InvalidAnalyticsEventError extends Error {}

/** Validates and normalizes an untrusted browser/server analytics event. */
export function normalizeEvent(input, { now = new Date(), id = crypto.randomUUID() } = {}) {
  if (!input || typeof input !== 'object') throw new InvalidAnalyticsEventError('Event must be an object');
  if (!EVENT_SET.has(input.name)) throw new InvalidAnalyticsEventError('Unsupported event name');
  if (!input.userId && !input.anonymousId) throw new InvalidAnalyticsEventError('userId or anonymousId is required');

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : now;
  if (Number.isNaN(occurredAt.valueOf())) throw new InvalidAnalyticsEventError('occurredAt must be an ISO date');
  if (occurredAt.valueOf() > now.valueOf() + MAX_FUTURE_SKEW_MS) throw new InvalidAnalyticsEventError('occurredAt cannot be in the future');
  const durationSeconds = input.durationSeconds == null ? null : Number(input.durationSeconds);
  if (durationSeconds != null && (!Number.isFinite(durationSeconds) || durationSeconds < 0)) {
    throw new InvalidAnalyticsEventError('durationSeconds must be a non-negative number');
  }
  if (durationSeconds != null && !['video_progress', 'video_complete'].includes(input.name)) {
    throw new InvalidAnalyticsEventError('durationSeconds is only valid for video progress/completion');
  }
  const properties = input.properties ?? {};
  if (Array.isArray(properties) || typeof properties !== 'object') throw new InvalidAnalyticsEventError('properties must be an object');

  return {
    id, name: input.name, occurredAt, userId: input.userId ?? null,
    anonymousId: input.anonymousId ?? null, sessionId: input.sessionId ?? null,
    videoId: input.videoId ?? null, adId: input.adId ?? null,
    pagePath: input.pagePath ?? null, durationSeconds, properties,
  };
}
