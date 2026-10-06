# YourTab — DigitalOcean production deployment

## 1. Create the server
Use a DigitalOcean Ubuntu 24.04 Droplet with at least 2 vCPU / 4 GB RAM for the first production deployment. Point these DNS records to the Droplet IP:

- A record: your-domain.com -> DROPLET_IP
- A record: api.your-domain.com -> DROPLET_IP

Do not expose PostgreSQL, Redis, or the MinIO console to the public internet.

## 2. Install Docker
Install Docker Engine + Compose on the Droplet.

## 3. Clone the repository
Clone this repository into a directory such as /opt/yourtab.

## 4. Configure production environment
From the repository root:

    cp infrastructure/production/.env.example infrastructure/production/.env

Edit infrastructure/production/.env and replace every CHANGE_ME value. Keep the file private and never commit it.

## 5. Build and start
From the repository root:

    docker compose --env-file infrastructure/production/.env -f infrastructure/production/docker-compose.yml up -d --build

The compose file keeps PostgreSQL/Redis/MinIO private and exposes only Caddy on ports 80/443.

## 6. Initialize the database
After the containers are healthy, initialize a brand-new database with:\n\n    docker compose --env-file infrastructure/production/.env -f infrastructure/production/docker-compose.yml exec api pnpm --filter @vaultstream/database db:push\n    docker compose --env-file infrastructure/production/.env -f infrastructure/production/docker-compose.yml exec api pnpm --filter @vaultstream/database seed\n\nFor later schema changes, prefer versioned Prisma migrations and deploy them before starting new application code.

The admin credentials come from ADMIN_EMAIL and ADMIN_PASSWORD in the production .env.

## 7. Verify
Open https://your-domain.com and https://api.your-domain.com/api/v1/health.

## 8. Backups
Before accepting real users, configure scheduled PostgreSQL backups and object-storage backups. The named Docker volumes are persistent, but persistence is not the same as backup.

## 9. Production storage
The bundled MinIO setup is suitable for an initial single-server deployment. For a larger YourTab deployment, move media to DigitalOcean Spaces and put a CDN in front of HLS assets. Update S3_ENDPOINT, S3_BUCKET, credentials, and S3_PUBLIC_BASE_URL accordingly.
