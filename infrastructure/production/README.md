# YourTab — DigitalOcean backend + Cloudflare Pages frontend

## Architecture

The public frontend is deployed to Cloudflare Pages as a static Next.js export.

The DigitalOcean server runs:

- NestJS API
- PostgreSQL
- Redis
- MinIO
- FFmpeg worker
- Caddy HTTPS reverse proxy

Cloudflare Pages provides a same-origin `/api/*` Function that proxies requests to the API. This means the browser does not need direct CORS access to the API.

## 1. Create the server

Use an Ubuntu 24.04 DigitalOcean Droplet. For the first deployment, use at least 2 vCPU / 4 GB RAM.

You do not need a custom domain for the first test. The deployment supports temporary `sslip.io` hostnames.

For Droplet IP `203.0.113.10`:

- API: `api.203-0-113-10.sslip.io`
- Media: `media.203-0-113-10.sslip.io`

Replace the example IP with the real Droplet IP.

## 2. Install Docker

Install Docker Engine and Compose on the Droplet.

## 3. Clone the repository

Clone this repository into:

```bash
sudo mkdir -p /opt/yourtab
sudo chown $USER:$USER /opt/yourtab
cd /opt/yourtab
git clone https://github.com/ponteraTV/Yourtab_website.git .
```

## 4. Configure production environment

```bash
cp infrastructure/production/.env.example infrastructure/production/.env
nano infrastructure/production/.env
```

Set at minimum:

```env
API_DOMAIN=api.203-0-113-10.sslip.io
MEDIA_DOMAIN=media.203-0-113-10.sslip.io
FRONTEND_URL=https://yourtab.pages.dev
NEXT_PUBLIC_API_URL=/api
S3_PUBLIC_BASE_URL=https://media.203-0-113-10.sslip.io/vaultstream-media
CDN_PUBLIC_BASE_URL=
```

Replace every `CHANGE_ME` value with a unique strong secret.

## 5. Start the backend

```bash
docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml up -d --build
```

Check:

```bash
docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml ps
```

## 6. Initialize the database

For a brand-new database:

```bash
docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml exec api \
  pnpm --filter @vaultstream/database db:push

docker compose --env-file infrastructure/production/.env \
  -f infrastructure/production/docker-compose.yml exec api \
  pnpm --filter @vaultstream/database seed
```

## 7. Verify the API

```bash
curl https://api.203-0-113-10.sslip.io/api/v1/health
```

Replace the example IP.

Caddy should obtain HTTPS certificates automatically when the hostname resolves to the Droplet.

## 8. Firewall

Allow inbound:

- TCP 22 — SSH
- TCP 80 — HTTP/ACME
- TCP 443 — HTTPS

Keep these private:

- PostgreSQL 5432
- Redis 6379
- MinIO 9000
- MinIO console 9001
- internal web port 3000

## 9. Create Cloudflare Pages

In Cloudflare Dashboard → Workers & Pages:

1. Create a Pages project.
2. Connect GitHub and select `ponteraTV/Yourtab_website`.
3. Production branch: `main`.
4. Root directory: repository root.
5. Framework preset: **Next.js (Static HTML Export)**.
6. Build command:

```bash
corepack enable && pnpm install --no-frozen-lockfile && pnpm --filter @vaultstream/web build
```

7. Build output directory: `apps/web/out`.
8. Add production environment variable:

```
API_ORIGIN=https://api.203-0-113-10.sslip.io
```

9. Use project name `yourtab` if it is available.

Cloudflare will then give the project its `*.pages.dev` hostname. If `yourtab.pages.dev` is already taken, choose another available Pages project name.

## 10. Test

Open the Pages URL and test:

- registration
- login/logout
- video list/search
- view tracking
- HLS/video playback
- admin/API health

## 11. Backups

Before accepting real users, configure automated PostgreSQL and media backups. Docker volume persistence alone is not a backup.

## 12. Later production upgrade

For a real launch:

- use a real custom domain instead of `sslip.io`
- use DigitalOcean Spaces + CDN instead of single-server MinIO
- use a managed PostgreSQL database
- use a managed Redis service
- configure SMTP for account emails
- configure monitoring and backups
