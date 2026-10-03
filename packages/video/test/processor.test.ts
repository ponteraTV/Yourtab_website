import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHlsArguments, buildThumbnailArguments } from '../src/processor.js';

test('buildHlsArguments creates VOD HLS paths and a 720p scale filter', () => {
  const args = buildHlsArguments('/tmp/input.mp4', '/tmp/output', { name: '720p', height: 720, videoBitrate: '2800k', maxRate: '2996k', bufferSize: '4200k', audioBitrate: '128k' });
  assert.ok(args.includes('scale=-2:720:force_original_aspect_ratio=decrease'));
  assert.equal(args.at(-1), '/tmp/output/720p/index.m3u8');
  assert.ok(args.includes('independent_segments'));
});

test('buildThumbnailArguments clamps a negative timestamp', () => {
  const args = buildThumbnailArguments('/tmp/input.mp4', '/tmp/output/thumbnail.jpg', -10);
  assert.deepEqual(args.slice(0, 4), ['-y', '-ss', '0', '-i']);
  assert.equal(args.at(-1), '/tmp/output/thumbnail.jpg');
});
