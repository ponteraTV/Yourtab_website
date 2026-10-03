import { InvalidAnalyticsEventError } from './events.js';

/**
 * Framework-neutral request handlers. Mount the returned functions on your router;
 * `requireAdmin` must authenticate dashboard endpoints in the host application.
 */
export function createAnalyticsHandlers(service, { requireAdmin = async () => true } = {}) {
  const context = (request) => ({ ipHash: request.ipHash, userAgent: request.headers?.['user-agent'] });
  const ingest = async (request) => {
    try { return { status: 202, body: await service.ingest(request.body, context(request)) }; }
    catch (error) { return badRequest(error); }
  };
  const ingestBatch = async (request) => {
    try { return { status: 202, body: await service.ingestBatch(request.body?.events, context(request)) }; }
    catch (error) { return badRequest(error); }
  };
  const admin = (method) => async (request) => {
    if (!(await requireAdmin(request))) return { status: 403, body: { error: 'Forbidden' } };
    try { return { status: 200, body: await method(request.query ?? {}) }; }
    catch (error) { return badRequest(error); }
  };
  return { ingest, ingestBatch, dashboard: admin((q) => service.dashboard(q)), videoAnalytics: admin((q) => service.videoAnalytics(q)), userAnalytics: admin((q) => service.userAnalytics(q)) };
}
function badRequest(error) {
  if (error instanceof InvalidAnalyticsEventError || error instanceof RangeError) return { status: 400, body: { error: error.message } };
  throw error;
}
