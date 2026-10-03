FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
RUN pnpm install --filter @vaultstream/worker...
COPY apps/worker apps/worker
RUN pnpm --filter @vaultstream/worker build
CMD ["pnpm", "--filter", "@vaultstream/worker", "start"]
