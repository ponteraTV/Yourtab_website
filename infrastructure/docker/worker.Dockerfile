FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/storage/package.json packages/storage/package.json
RUN pnpm install --filter @vaultstream/worker...
COPY packages/database packages/database
COPY packages/storage packages/storage
COPY apps/worker apps/worker
RUN pnpm --filter @vaultstream/worker build
CMD ["pnpm", "--filter", "@vaultstream/worker", "start"]
