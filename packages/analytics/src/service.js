import { normalizeEvent } from './events.js';

export class AnalyticsService {
  constructor(repository, { clock = () => new Date() } = {}) { this.repository = repository; this.clock = clock; }

  async ingest(input, context = {}) {
    const event = normalizeEvent(input, { now: this.clock() });
    return this.repository.insert(event, context);
  }

  async ingestBatch(inputs, context = {}) {
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 100) throw new RangeError('events must contain 1 to 100 events');
    // Validate the complete batch before any events are persisted.
    const events = inputs.map((input) => normalizeEvent(input, { now: this.clock() }));
    await Promise.all(events.map((event) => this.repository.insert(event, context)));
    return { accepted: events.length, eventIds: events.map(({ id }) => id) };
  }

  dashboard(query) { return this.repository.dashboard(normalizeRange(query)); }
  videoAnalytics(query) { const range = normalizeRange(query); return this.repository.video({ ...range, videoId: query.videoId ?? null }); }
  userAnalytics(query) { return this.repository.users(normalizeRange(query)); }
}

export function normalizeRange({ from, to, timezone = 'UTC' } = {}) {
  const start = new Date(from); const end = new Date(to);
  if (Number.isNaN(+start) || Number.isNaN(+end) || start >= end) throw new RangeError('from must be before to');
  if (end - start > 366 * 24 * 60 * 60 * 1000) throw new RangeError('range cannot exceed 366 days');
  return { from: start, to: end, timezone };
}
