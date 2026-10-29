#!/usr/bin/env bash
# ================================================================
#  set-vercel-env.sh
#  Sets all Pantry environment variables on Vercel and redeploys.
#  Reads credentials from backend/.env — no secrets in this file.
#
#  Usage (from repo root):
#    chmod +x scripts/set-vercel-env.sh
#    ./scripts/set-vercel-env.sh
# ================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
info() { echo -e "${YELLOW}ℹ  $*${RESET}"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

[[ -f "$ENV_FILE" ]] || { echo "❌ backend/.env not found"; exit 1; }

load() { grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d "'" | tr -d '"' || echo ""; }

VTOKEN="$(load VERCEL_TOKEN)"
[[ -n "$VTOKEN" ]] || { echo "❌ VERCEL_TOKEN not set in backend/.env"; exit 1; }

# Auto-detect project name from existing deployment or use default
PROJECT="${VERCEL_PROJECT:-pantry-five-sand}"

echo -e "\n${BOLD}🔧 Setting Vercel env vars on: $PROJECT${RESET}\n"

set_env() {
  local key=$1 val=$2
  vercel env rm "$key" production --token="$VTOKEN" --yes 2>/dev/null || true
  printf '%s' "$val" | vercel env add "$key" production --token="$VTOKEN" 2>/dev/null \
    && ok "$key" || echo "  ⚠️  $key — skipped"
}

cd "$ROOT/backend"

set_env DATABASE_URL           "$(load DATABASE_URL)"
set_env SECRET_KEY             "$(load SECRET_KEY)"
set_env APP_ENV                "production"
set_env APP_CORS_ORIGINS       "https://${PROJECT}.vercel.app"
set_env RESEND_API_KEY         "$(load RESEND_API_KEY)"
set_env EMAIL_FROM             "$(load EMAIL_FROM)"
set_env CLOUDINARY_CLOUD_NAME  "$(load CLOUDINARY_CLOUD_NAME)"
set_env CLOUDINARY_API_KEY     "$(load CLOUDINARY_API_KEY)"
set_env CLOUDINARY_API_SECRET  "$(load CLOUDINARY_API_SECRET)"
set_env GOOGLE_CLIENT_ID       "$(load GOOGLE_CLIENT_ID)"
set_env GOOGLE_CLIENT_SECRET   "$(load GOOGLE_CLIENT_SECRET)"
set_env CRON_SECRET            "$(load CRON_SECRET)"
set_env SENTRY_DSN             "$(load SENTRY_DSN)"

echo ""
info "Redeploying $PROJECT..."
vercel deploy --prod --yes --token="$VTOKEN" --name="$PROJECT" 2>&1 | tail -5

echo ""
echo -e "${BOLD}✅ Done! Verify at:${RESET}"
echo "  https://${PROJECT}.vercel.app/health/db"
echo "  https://${PROJECT}.vercel.app/api/v1/products"
