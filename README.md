# YourTab

YourTab is a TypeScript monorepo for video storage, processing, streaming, accounts, and administration.

## Production architecture

The recommended free-frontend / DigitalOcean-backend setup is:

- **Cloudflare Pages**: static Next.js frontend at `https://yourtab.pages.dev`
- **Cloudflare Pages Function**: same-origin `/api/*` proxy to the DigitalOcean API
- **DigitalOcean**: API, PostgreSQL, Redis, MinIO, FFmpeg worker, and Caddy
- **Caddy + sslip.io**: temporary HTTPS hostnames for API and media when you do not own a domain yet

This avoids browser CORS and cookie cross-site problems because the browser talks to `/api/*` on the same `pages.dev` origin.

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Public Next.js application; configured for static export |
| `apps/admin` | Admin Next.js application |
| `apps/api` | NestJS REST API on port 4000 |
| `apps/worker` | Background FFmpeg/video worker |
| `packages/*` | Shared database, auth, storage, video, UI, validation and type packages |
| `functions/api/[[path]].ts` | Cloudflare Pages same-origin API proxy |
| `infrastructure/production` | DigitalOcean Docker Compose + Caddy deployment |

## Cloudflare Pages setup

Cloudflare Pages supports static Next.js exports and gives the deployed project a `*.pages.dev` hostname. The project name must be available; if `yourtab` is available, the production hostname will be `yourtab.pages.dev`.

For this monorepo use:

- Production branch: `main`
- Root directory: repository root `/`
- Framework preset: **Next.js (Static HTML Export)**
- Build command:
  `corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter @vaultstream/web build`
- Build output directory: `apps/web/out`

Set this Pages environment variable:

`API_ORIGIN=https://api.<YOUR_DROPLET_IP_WITH_DASHES>.sslip.io`

Example for Droplet IP `203.0.113.10`:

`API_ORIGIN=https://api.203-0-113-10.sslip.io`

The frontend already defaults to `/api`, so you do **not** need to set `NEXT_PUBLIC_API_URL` in Pages.

## DigitalOcean setup

Create an Ubuntu 24.04 Droplet. For an initial deployment, 2 vCPU / 4 GB RAM is a practical starting point.

Install Docker, clone the repository, then:

```bash
cd /opt/yourtab
cp infrastructure/production/.env.example infrastructure/production/.env
```

If the Droplet public IP is `203.0.113.10`, set:

```env
API_DOMAIN=api.203-0-113-10.sslip.io
MEDIA_DOMAIN=media.203-0-113-10.sslip.io
FRONTEND_URL=https://yourtab.pages.dev
NEXT_PUBLIC_API_URL=/api
S3_PUBLIC_BASE_URL=https://media.203-0-113-10.sslip.io/vaultstream-media
CDN_PUBLIC_BASE_URL=
```

Replace the example IP with the real Droplet IP and replace every `CHANGE_ME` secret with a long random value.

Start production services:

```bash
docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml up -d --build
```

Initialize Prisma on a new database:

```bash
docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml exec api \
  pnpm --filter @vaultstream/database db:push

docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml exec api \
  pnpm --filter @vaultstream/database seed
```

Verify:

```bash
curl https://api.<YOUR_DROPLET_IP_WITH_DASHES>.sslip.io/api/v1/health
```

Do not expose PostgreSQL, Redis, MinIO port 9000, or the MinIO console port 9001 publicly.

## Cloudflare Pages deployment

1. Open Cloudflare Dashboard → Workers & Pages.
2. Create a **Pages** project from the GitHub repository `ponteraTV/Yourtab_website`.
3. Use the build settings above.
4. Add the `API_ORIGIN` production variable.
5. Deploy.
6. If the project name `yourtab` is available, use it so the site is `yourtab.pages.dev`.
7. Open the resulting `pages.dev` URL and test login, registration, video listing, and playback.

Cloudflare Pages Functions are used only for `/api/*`; static assets remain static.

## Important media note

The DigitalOcean MinIO bucket is configured for anonymous download by the production Compose initialization job. Caddy exposes it through `MEDIA_DOMAIN`. Keep the bucket prefix in `S3_PUBLIC_BASE_URL` because MinIO is running with path-style access.

For a serious production launch, replace MinIO with DigitalOcean Spaces + CDN and use a real domain for API/media hostnames.

## Local development

```bash
corepack enable
pnpm install
pnpm build
```

Run the apps separately:

```bash
pnpm --filter @vaultstream/web dev
pnpm --filter @vaultstream/admin dev
pnpm --filter @vaultstream/api dev
pnpm --filter @vaultstream/worker dev
```

For local web development, set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in your local environment if you are not using a local proxy.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Never commit production `.env` files or secrets.
