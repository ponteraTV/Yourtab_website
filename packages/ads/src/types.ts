export const placementKinds = ["PRE_ROLL", "MID_ROLL", "BANNER"] as const;
export type PlacementKind = (typeof placementKinds)[number];
export const campaignStatuses = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export interface AdCreative {
  id: string;
  placement: PlacementKind;
  assetUrl: string;
  clickUrl: string;
  durationSeconds?: number;
  weight: number;
}

export interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  impressionCap?: number;
  clickCap?: number;
  creatives: AdCreative[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  advertiser: string;
  status?: CampaignStatus;
  startsAt: string;
  endsAt: string;
  impressionCap?: number;
  clickCap?: number;
  creatives: Omit<AdCreative, "id">[];
}
export type UpdateCampaignInput = Partial<CreateCampaignInput>;

export interface Impression {
  id: string;
  campaignId: string;
  creativeId: string;
  placement: PlacementKind;
  viewerId?: string;
  sessionId?: string;
  servedAt: string;
  clickedAt?: string;
}

export interface ServedPlacement {
  impressionId: string;
  campaignId: string;
  creativeId: string;
  placement: PlacementKind;
  assetUrl: string;
  clickUrl: string;
  durationSeconds?: number;
}

export interface CampaignMetrics { impressions: number; clicks: number; ctr: number; }
