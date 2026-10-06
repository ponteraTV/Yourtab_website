FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/storage/package.json packages/storage/package.json
RUN pnpm install --filter @vaultstream/api...

COPY packages/auth packages/auth
COPY packages/database packages/database
COPY packages/storage packages/storage
COPY apps/api apps/api
RUN pnpm --filter @vaultstream/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@vaultstream/api", "start"]
