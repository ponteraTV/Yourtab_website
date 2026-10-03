FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @vaultstream/api...
COPY apps/api apps/api
RUN pnpm --filter @vaultstream/api build
EXPOSE 4000
CMD ["pnpm", "--filter", "@vaultstream/api", "start"]
