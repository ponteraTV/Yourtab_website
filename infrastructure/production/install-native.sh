#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/yourtab}"
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git build-essential ffmpeg postgresql postgresql-contrib redis-server caddy

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

corepack enable
corepack prepare pnpm@10.4.1 --activate
npm install -g pm2

systemctl enable --now postgresql
systemctl enable --now redis-server
systemctl enable --now caddy

mkdir -p "$APP_DIR"
echo
echo "Native runtime installed."
echo "Next:"
echo "  git clone https://github.com/ponteraTV/Yourtab_website.git $APP_DIR"
echo "  create $APP_DIR/infrastructure/production/.env"
echo "  configure PostgreSQL user/database and Redis password"
echo "  run $APP_DIR/infrastructure/production/deploy-native.sh"
