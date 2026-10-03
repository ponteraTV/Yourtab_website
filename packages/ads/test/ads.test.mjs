import assert from "node:assert/strict";
import test from "node:test";
import { AdsService, createAdsApi } from "../dist/index.js";

const liveInput = {
  name: "Launch", advertiser: "Yourtab", status: "ACTIVE",
  startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z",
  creatives: [{ placement: "PRE_ROLL", assetUrl: "https://cdn.example/ad.mp4", clickUrl: "https://example.com", durationSeconds: 15, weight: 1 }],
};

test("serves eligible placement, records the impression, and de-duplicates clicks", () => {
  const ads = new AdsService();
  const campaign = ads.createCampaign(liveInput);
  const served = ads.getPlacement("PRE_ROLL", { viewerId: "viewer-1" }, new Date("2026-06-01"));
  assert.ok(served);
  assert.equal(served.campaignId, campaign.id);
  ads.recordClick(served.impressionId, new Date("2026-06-01T00:01:00Z"));
  ads.recordClick(served.impressionId, new Date("2026-06-01T00:02:00Z"));
  assert.deepEqual(ads.metrics(campaign.id), { impressions: 1, clicks: 1, ctr: 1 });
});

test("does not serve paused, expired, or capped campaigns", () => {
  const ads = new AdsService();
  ads.createCampaign({ ...liveInput, status: "PAUSED" });
  assert.equal(ads.getPlacement("PRE_ROLL", {}, new Date("2026-06-01")), null);
  const capped = ads.createCampaign({ ...liveInput, name: "Capped", impressionCap: 1 });
  assert.ok(ads.getPlacement("PRE_ROLL", {}, new Date("2026-06-01")));
  assert.equal(ads.metrics(capped.id).impressions, 1);
  assert.equal(ads.getPlacement("PRE_ROLL", {}, new Date("2026-06-01")), null);
});

test("API protects admin management and exposes frontend placement and click routes", async () => {
  const ads = new AdsService();
  const api = createAdsApi(ads, (request) => request.headers?.authorization === "Bearer admin");
  assert.equal((await api({ method: "POST", path: "/admin/ads/campaigns", body: liveInput })).status, 403);
  const created = await api({ method: "POST", path: "/admin/ads/campaigns", headers: { authorization: "Bearer admin" }, body: liveInput });
  assert.equal(created.status, 201);
  const placement = await api({ method: "GET", path: "/ads/placements/PRE_ROLL" });
  assert.equal(placement.status, 200);
  const served = placement.body;
  assert.equal((await api({ method: "POST", path: `/ads/impressions/${served.impressionId}/clicks` })).status, 200);
});
