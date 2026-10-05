# YourTab

VaultStream is a TypeScript monorepo for secure video storage, processing, streaming, and administration. This commit completes **Phase 1 only**: repository foundation, application boundaries, Prisma connectivity foundation, and local Docker services. Authentication, database domain entities, media uploads, video processing, CMS, analytics, and admin features are intentionally not implemented yet.

## Architecture

| Path | Purpose |
| --- | --- |
| `apps/web` | Public Next.js application on port 3000 |
| `apps/admin` | Admin Next.js application on port 3001 |
| `apps/api` | NestJS REST API on port 4000 (`GET /api/v1/health`) |
| `apps/worker` | Dedicated background-worker process boundary |
| `packages/*` | Shared contracts for config, database, auth, storage, video, analytics, ads, UI, types, and validation |
| `infrastructure` | Dockerfiles and deployment/observability boundaries |

## Requirements

- Node.js 22 or newer (Node 24 is used by the container images)
- PNPM 10 or newer (Corepack recommended)
- Docker Compose for local PostgreSQL, Redis, MinIO, API, and worker containers

## Local setup

```bash
corepack enable
cp .env.example .env
pnpm install
pnpm build
```

Start the public web app, admin app, API, and worker in separate terminals:

```bash
pnpm --filter @vaultstream/web dev
pnpm --filter @vaultstream/admin dev
pnpm --filter @vaultstream/api dev
pnpm --filter @vaultstream/worker dev
```

Start backing services and containerized API/worker:

```bash
docker compose up --build
```

MinIO is available at `http://localhost:9001`; Compose creates the `vaultstream-media` bucket automatically for local development.

## Environment variables

Copy `.env.example`; never commit `.env`. The important values are:

- `DATABASE_URL`, `REDIS_URL` for local infrastructure.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_PUBLIC_BASE_URL` for S3-compatible storage.
- `APP_URL`, `ADMIN_URL`, and `API_URL` for service origins.
- `SESSION_SECRET` and `JWT_SECRET`, which must be cryptographically random strings of at least 32 characters outside local development.
- `SMTP_*` for the future verification/reset mailer, and `ADMIN_EMAIL`/`ADMIN_PASSWORD` for the Phase 2 development-only seed.

## Prisma

Phase 1 validates the Prisma package and database connection configuration only. The production relational schema and first migration are a Phase 2 deliverable. Once that phase is available, use:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

There is no first-admin creation process yet; it will be enabled only with Phase 2 RBAC and the environment-controlled seed account.

## Current operational status

- The health endpoint is live at `GET http://localhost:4000/api/v1/health` after starting the API.
- Docker service definitions are production-oriented local-development foundations, but require Docker to be installed on the host.
- External production infrastructure still required: a managed PostgreSQL/Redis service, S3 provider, CDN/TLS domain, SMTP provider, secrets manager, and container deployment platform.
- Direct-to-storage uploads and FFmpeg/HLS processing are deliberately deferred to Phases 6 and 7. Do not upload media through the Phase 1 API.

## Quality commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
