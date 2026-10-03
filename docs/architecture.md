# VaultStream architecture foundation

Phase 1 establishes isolated application boundaries: two Next.js applications (`web`, `admin`), a NestJS REST API, and a standalone worker. Shared packages own cross-cutting contracts and integrations so API handlers and UI components do not call infrastructure providers directly.

Docker Compose runs PostgreSQL, Redis, and MinIO locally. The API and worker containers are included to verify container boundaries; web applications run with PNPM during development. Video jobs, authentication, RBAC, and the full Prisma domain schema are intentionally deferred to later phases.

