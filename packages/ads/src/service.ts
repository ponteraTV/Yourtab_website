import type { AdCreative, Campaign, CampaignMetrics, CreateCampaignInput, Impression, PlacementKind, ServedPlacement, UpdateCampaignInput } from "./types.js";

export class AdsError extends Error {
  constructor(message: string, readonly code: "NOT_FOUND" | "VALIDATION" | "CONFLICT") { super(message); }
}

/** A repository-free ads domain service. Persist the returned records in a DB adapter in production. */
let nextId = 0;
const createId = () => `ad_${Date.now().toString(36)}_${(++nextId).toString(36)}`;

export class AdsService {
  private readonly campaigns = new Map<string, Campaign>();
  private readonly impressions = new Map<string, Impression>();

  createCampaign(input: CreateCampaignInput, now = new Date()): Campaign {
    this.validateCampaign(input);
    const timestamp = now.toISOString();
    const campaign: Campaign = {
      ...input, id: createId(), status: input.status ?? "DRAFT", createdAt: timestamp, updatedAt: timestamp,
      creatives: input.creatives.map((creative) => ({ ...creative, id: createId() })),
    };
    this.campaigns.set(campaign.id, campaign);
    return this.clone(campaign);
  }

  listCampaigns(): Campaign[] { return [...this.campaigns.values()].map((campaign) => this.clone(campaign)); }
  getCampaign(id: string): Campaign {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new AdsError("Campaign not found", "NOT_FOUND");
    return this.clone(campaign);
  }

  updateCampaign(id: string, patch: UpdateCampaignInput, now = new Date()): Campaign {
    const existing = this.getCampaign(id);
    const candidate: CreateCampaignInput = { ...existing, ...patch, creatives: patch.creatives ?? existing.creatives };
    this.validateCampaign(candidate);
    const updated: Campaign = {
      ...existing, ...patch, id, creatives: (patch.creatives ?? existing.creatives).map((creative) => ({ ...creative, id: (creative as AdCreative).id ?? createId() })), updatedAt: now.toISOString(),
    };
    this.campaigns.set(id, updated);
    return this.clone(updated);
  }

  deleteCampaign(id: string): void { this.getCampaign(id); this.campaigns.delete(id); }

  getPlacement(placement: PlacementKind, context: { viewerId?: string; sessionId?: string } = {}, now = new Date()): ServedPlacement | null {
    const candidates = [...this.campaigns.values()].flatMap((campaign) => {
      if (!this.isEligible(campaign, now)) return [];
      return campaign.creatives.filter((creative) => creative.placement === placement).map((creative) => ({ campaign, creative }));
    });
    if (!candidates.length) return null;
    const selected = this.weightedPick(candidates);
    const impression: Impression = { id: createId(), campaignId: selected.campaign.id, creativeId: selected.creative.id, placement, ...context, servedAt: now.toISOString() };
    this.impressions.set(impression.id, impression);
    return { impressionId: impression.id, campaignId: selected.campaign.id, creativeId: selected.creative.id, placement, assetUrl: selected.creative.assetUrl, clickUrl: selected.creative.clickUrl, durationSeconds: selected.creative.durationSeconds };
  }

  recordClick(impressionId: string, now = new Date()): Impression {
    const impression = this.impressions.get(impressionId);
    if (!impression) throw new AdsError("Impression not found", "NOT_FOUND");
    if (impression.clickedAt) return { ...impression };
    const campaign = this.getCampaign(impression.campaignId);
    if (campaign.clickCap !== undefined && this.metrics(campaign.id).clicks >= campaign.clickCap) throw new AdsError("Campaign click cap reached", "CONFLICT");
    const clicked = { ...impression, clickedAt: now.toISOString() };
    this.impressions.set(impressionId, clicked);
    return { ...clicked };
  }

  metrics(campaignId: string): CampaignMetrics {
    this.getCampaign(campaignId);
    const impressions = [...this.impressions.values()].filter((item) => item.campaignId === campaignId);
    const clicks = impressions.filter((item) => item.clickedAt).length;
    return { impressions: impressions.length, clicks, ctr: impressions.length ? clicks / impressions.length : 0 };
  }

  private isEligible(campaign: Campaign, now: Date): boolean {
    if (campaign.status !== "ACTIVE" || new Date(campaign.startsAt) > now || new Date(campaign.endsAt) < now) return false;
    return campaign.impressionCap === undefined || this.metrics(campaign.id).impressions < campaign.impressionCap;
  }
  private weightedPick<T extends { creative: AdCreative }>(choices: T[]): T {
    const total = choices.reduce((sum, choice) => sum + choice.creative.weight, 0);
    let point = Math.random() * total;
    for (const choice of choices) { point -= choice.creative.weight; if (point < 0) return choice; }
    return choices[choices.length - 1]!;
  }
  private validateCampaign(input: CreateCampaignInput): void {
    if (!input.name.trim() || !input.advertiser.trim() || !input.creatives.length) throw new AdsError("Campaign name, advertiser, and at least one creative are required", "VALIDATION");
    if (!Number.isFinite(Date.parse(input.startsAt)) || !Number.isFinite(Date.parse(input.endsAt)) || new Date(input.startsAt) >= new Date(input.endsAt)) throw new AdsError("Campaign dates must be valid and ordered", "VALIDATION");
    if ([input.impressionCap, input.clickCap].some((cap) => cap !== undefined && (!Number.isInteger(cap) || cap < 1))) throw new AdsError("Caps must be positive integers", "VALIDATION");
    for (const creative of input.creatives) if (!creative.assetUrl || !creative.clickUrl || !Number.isFinite(creative.weight) || creative.weight <= 0) throw new AdsError("Creatives require assetUrl, clickUrl, and a positive weight", "VALIDATION");
  }
  private clone(campaign: Campaign): Campaign { return { ...campaign, creatives: campaign.creatives.map((creative) => ({ ...creative })) }; }
}
