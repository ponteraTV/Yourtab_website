import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("browser auth and video pages use the same-origin API proxy", async () => {
  const paths = ["apps/web/app/auth-form.tsx", "apps/web/app/page.tsx", "apps/web/app/profile/page.tsx", "apps/web/app/admin/page.tsx"];
  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /const API = ["\x27]\/api["\x27];/, path + " should use same-origin /api");
    assert.doesNotMatch(source, /https:\/\/api\.143-198-191-75\.sslip\.io/, path + " must not hardcode the API origin");
  }
});

test("READY videos with the worker HLS key expose the API manifest route", async () => {
  const source = await read("apps/api/src/app.controller.ts");
  assert.ok(source.includes('hls/${v.id}/index.m3u8'));
  assert.ok(source.includes("streamUrl:playable?"));
  assert.ok(source.includes("/api/v1/videos/"));
  assert.match(source, /@Get\("videos\/:id\/stream\/:file"\)/);
  assert.match(source, /index\\\.m3u8\|segment-\\d\{5\}\\\.ts/);
});

test("Cloudflare Worker preserves auth cookies and disables auth caching", async () => {
  const source = await read("src/worker.ts");
  assert.match(source, /upstream\.headers\.getSetCookie\(\)/);
  assert.match(source, /responseHeaders\.append\("Set-Cookie", cookie\)/);
  assert.match(source, /responseHeaders\.set\("Cache-Control", "no-store"\)/);
});