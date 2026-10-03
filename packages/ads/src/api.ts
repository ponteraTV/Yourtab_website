import { AdsError, AdsService } from "./service.js";
import { placementKinds } from "./types.js";
import type { CreateCampaignInput, PlacementKind, UpdateCampaignInput } from "./types.js";

export interface ApiRequest { method: string; path: string; body?: unknown; query?: Record<string, string | undefined>; headers?: Record<string, string | undefined>; }
export interface ApiResponse { status: number; body?: unknown; }
export type AdminAuthorizer = (request: ApiRequest) => boolean | Promise<boolean>;

/** Framework-neutral adapter. Mount it from Express, Fastify, Next, or a serverless handler. */
export function createAdsApi(ads: AdsService, isAdmin: AdminAuthorizer = () => false) {
  return async (request: ApiRequest): Promise<ApiResponse> => {
    try {
      const { method, path } = request;
      if (path.startsWith("/admin/ads/")) {
        if (!(await isAdmin(request))) return { status: 403, body: { error: "Admin access required" } };
        if (method === "GET" && path === "/admin/ads/campaigns") return { status: 200, body: ads.listCampaigns() };
        if (method === "POST" && path === "/admin/ads/campaigns") return { status: 201, body: ads.createCampaign(request.body as CreateCampaignInput) };
        const match = path.match(/^\/admin\/ads\/campaigns\/([^/]+)(?:\/(metrics))?$/);
        if (match) {
          const [, id, action] = match;
          if (action === "metrics" && method === "GET") return { status: 200, body: ads.metrics(id!) };
          if (method === "GET") return { status: 200, body: ads.getCampaign(id!) };
          if (method === "PATCH") return { status: 200, body: ads.updateCampaign(id!, request.body as UpdateCampaignInput) };
          if (method === "DELETE") { ads.deleteCampaign(id!); return { status: 204 }; }
        }
      }
      const placementMatch = path.match(/^\/ads\/placements\/(PRE_ROLL|MID_ROLL|BANNER)$/);
      if (placementMatch && method === "GET") {
        const placement = placementMatch[1] as PlacementKind;
        return { status: 200, body: ads.getPlacement(placement, { viewerId: request.query?.viewerId, sessionId: request.query?.sessionId }) };
      }
      const clickMatch = path.match(/^\/ads\/impressions\/([^/]+)\/clicks$/);
      if (clickMatch && method === "POST") return { status: 200, body: ads.recordClick(clickMatch[1]!) };
      return { status: 404, body: { error: "Ads route not found" } };
    } catch (error) {
      if (error instanceof AdsError) return { status: error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400, body: { error: error.message, code: error.code } };
      throw error;
    }
  };
}

export { placementKinds };
