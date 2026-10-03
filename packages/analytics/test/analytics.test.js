import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsService, createAnalyticsHandlers, normalizeEvent } from '../src/index.js';

const now = new Date('2026-10-02T12:00:00.000Z');
function repository() { return { saved: [], async insert(event) { this.saved.push(event); return event; }, async dashboard(q) { return q; }, async video(q) { return q; }, async users(q) { return q; } }; }

test('normalizes valid event and rejects invalid tracking payloads', () => {
  const event = normalizeEvent({ name: 'page_view', anonymousId: 'visitor-1', pagePath: '/home' }, { now, id: 'event-1' });
  assert.equal(event.id, 'event-1'); assert.equal(event.occurredAt.toISOString(), now.toISOString());
  assert.throws(() => normalizeEvent({ name: 'unknown', anonymousId: 'a' }, { now }));
  assert.throws(() => normalizeEvent({ name: 'video_start' }, { now }));
  assert.throws(() => normalizeEvent({ name: 'page_view', anonymousId: 'a', durationSeconds: 2 }, { now }));
});

test('batch validation prevents partial event writes', async () => {
  const repo = repository(); const service = new AnalyticsService(repo, { clock: () => now });
  await assert.rejects(service.ingestBatch([{ name: 'page_view', anonymousId: 'a' }, { name: 'bad', anonymousId: 'b' }]));
  assert.equal(repo.saved.length, 0);
  const result = await service.ingestBatch([{ name: 'page_view', anonymousId: 'a' }, { name: 'video_start', userId: '00000000-0000-0000-0000-000000000001' }]);
  assert.equal(result.accepted, 2); assert.equal(repo.saved.length, 2);
});

test('admin analytics endpoints require authorization', async () => {
  const handlers = createAnalyticsHandlers(new AnalyticsService(repository()), { requireAdmin: async () => false });
  const response = await handlers.dashboard({ query: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' } });
  assert.deepEqual(response, { status: 403, body: { error: 'Forbidden' } });
});
