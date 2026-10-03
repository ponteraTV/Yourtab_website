# Ads package

`@yourtab/ads` owns the Phase 9 campaign lifecycle, placement selection, impression recording, click attribution, and campaign metrics.

## Backend integration

Create one `AdsService` at application startup and mount `createAdsApi(service, isAdmin)` in the backend's existing HTTP adapter. The adapter is framework-neutral and expects `{ method, path, body, query, headers }`.

| Audience | Method and route | Purpose |
| --- | --- | --- |
| Admin | `GET/POST /admin/ads/campaigns` | List or create campaigns. |
| Admin | `GET/PATCH/DELETE /admin/ads/campaigns/:id` | Read, edit, or archive a campaign record. |
| Admin | `GET /admin/ads/campaigns/:id/metrics` | Return impression count, click count, and CTR. |
| Frontend | `GET /ads/placements/:placement` | Fetch an eligible `PRE_ROLL`, `MID_ROLL`, or `BANNER` creative and create its impression. |
| Frontend | `POST /ads/impressions/:id/clicks` | Attribute an outbound click to the served impression. |

Campaigns only serve while `ACTIVE`, within their configured date window, and below their impression cap. A click is idempotent for an impression and respects the campaign click cap. Pass the app's authenticated admin check as `isAdmin`; do not trust a frontend-provided admin flag.
