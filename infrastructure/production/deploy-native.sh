#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/yourtab}"
ENV_FILE="$APP_DIR/infrastructure/production/.env"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Create it from infrastructure/production/.env.example first."
  exit 1
fi

corepack enable
corepack prepare pnpm@10.4.1 --activate

pnpm install --no-frozen-lockfile
pnpm --filter @vaultstream/database generate
pnpm --filter @vaultstream/api build
pnpm --filter @vaultstream/worker build
pnpm --filter @vaultstream/web build

set -a
. "$ENV_FILE"
set +a

pnpm --filter @vaultstream/database db:push

pm2 startOrRestart infrastructure/production/ecosystem.config.cjs --update-env
pm2 save

echo
echo "YourTab native deployment completed."
pm2 status
