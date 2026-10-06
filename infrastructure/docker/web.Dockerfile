FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --filter @vaultstream/web...

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY apps/web apps/web
COPY packages/ui packages/ui
RUN pnpm --filter @vaultstream/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@vaultstream/web", "start"]
