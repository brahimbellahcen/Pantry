#!/usr/bin/env bash
# ================================================================
#  Pantry — One-command deploy from any machine
#  Prerequisites: Node 18+, Python 3.10+, git
#
#  Usage:
#    1. Run the setup command first (creates backend/.env)
#    2. Then: chmod +x scripts/deploy-now.sh && ./scripts/deploy-now.sh
# ================================================================
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
info() { echo -e "${BLUE}ℹ  $*${RESET}"; }
step() { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

[[ -f "$ENV_FILE" ]] || fail "backend/.env not found — run the setup command first (see README)"

# Load all credentials from .env
load() { grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d "'" | tr -d '"' || echo ""; }

VTOKEN="$(load VERCEL_TOKEN)"
DB_URL="$(load DATABASE_URL)"
SECRET_KEY="$(load SECRET_KEY)"
RESEND_KEY="$(load RESEND_API_KEY)"
CLD_NAME="$(load CLOUDINARY_CLOUD_NAME)"
CLD_KEY="$(load CLOUDINARY_API_KEY)"
CLD_SECRET="$(load CLOUDINARY_API_SECRET)"

[[ -n "$VTOKEN"    ]] || fail "VERCEL_TOKEN missing in backend/.env"
[[ -n "$DB_URL"    ]] || fail "DATABASE_URL missing in backend/.env"
[[ -n "$SECRET_KEY" ]] || SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

echo -e "\n${BOLD}🛒 Pantry — Full Deployment${RESET}"
echo    "─────────────────────────────────────────"
ok "Vercel token loaded"
ok "Supabase DB loaded"
ok "Resend $([ -n "$RESEND_KEY" ] && echo 'loaded' || echo 'not set — emails disabled')"
ok "Cloudinary $([ -n "$CLD_NAME" ] && echo "loaded ($CLD_NAME)" || echo 'not set — local uploads')"

# ── Prerequisites ────────────────────────────────────────────────
step "1/5  Tools"
command -v node    &>/dev/null || fail "Node 18+ required — https://nodejs.org"
command -v python3 &>/dev/null || fail "Python 3.10+ required"
command -v vercel  &>/dev/null || { info "Installing Vercel CLI…"; npm install -g vercel@latest -q; }
ok "node $(node -v)  |  vercel $(vercel --version)"

# ── Migrations ───────────────────────────────────────────────────
step "2/5  Database migrations"
cd "$ROOT/backend"
pip install -q -r requirements.txt 2>/dev/null
DATABASE_URL="$DB_URL" alembic upgrade head
ok "All migrations applied"
info "Seeding demo data…"
DATABASE_URL="$DB_URL" python3 -m scripts.seed 2>/dev/null \
  && ok "Demo data ready (admin@pantry.dev / admin1234)" \
  || info "Seed skipped (data already exists)"

# ── Deploy backend ───────────────────────────────────────────────
step "3/5  Backend → Vercel"
info "Deploying FastAPI (takes ~90 s)…"

BACKEND_URL=$(vercel deploy --prod --yes \
  --token="$VTOKEN" \
  --name=pantry-api \
  -e DATABASE_URL="$DB_URL" \
  -e SECRET_KEY="$SECRET_KEY" \
  -e APP_ENV=production \
  -e APP_CORS_ORIGINS="https://pantry-web.vercel.app" \
  -e RESEND_API_KEY="${RESEND_KEY:-}" \
  -e "EMAIL_FROM=Pantry <onboarding@resend.dev>" \
  -e CLOUDINARY_CLOUD_NAME="${CLD_NAME:-}" \
  -e CLOUDINARY_API_KEY="${CLD_KEY:-}" \
  -e CLOUDINARY_API_SECRET="${CLD_SECRET:-}" \
  -e CRON_SECRET="" -e GOOGLE_CLIENT_ID="" \
  -e GOOGLE_CLIENT_SECRET="" -e SENTRY_DSN="" \
  2>&1 | grep -E "^https://" | tail -1 | tr -d ' ')

BACKEND_URL="${BACKEND_URL:-https://pantry-api.vercel.app}"
ok "Backend: $BACKEND_URL"

# ── Deploy frontend ──────────────────────────────────────────────
step "4/5  Frontend → Vercel"
cd "$ROOT/frontend"
info "Installing dependencies…"
npm ci --silent
info "Deploying React app…"

FRONTEND_URL=$(vercel deploy --prod --yes \
  --token="$VTOKEN" \
  --name=pantry-web \
  -e VITE_API_URL="${BACKEND_URL}/api/v1" \
  2>&1 | grep -E "^https://" | tail -1 | tr -d ' ')

FRONTEND_URL="${FRONTEND_URL:-https://pantry-web.vercel.app}"
ok "Frontend: $FRONTEND_URL"

# ── Fix CORS ─────────────────────────────────────────────────────
step "5/5  CORS"
cd "$ROOT/backend"
vercel env rm APP_CORS_ORIGINS production --token="$VTOKEN" --yes 2>/dev/null || true
echo "$FRONTEND_URL" | vercel env add APP_CORS_ORIGINS production --token="$VTOKEN" 2>/dev/null || true
vercel deploy --prod --yes --token="$VTOKEN" --name=pantry-api >/dev/null 2>&1 || true
ok "CORS set to $FRONTEND_URL"

# Update local .env
sed -i "s|^APP_CORS_ORIGINS=.*|APP_CORS_ORIGINS=$FRONTEND_URL|" "$ENV_FILE" 2>/dev/null || true

# ── Done ─────────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}🎉 Pantry is live!${RESET}"
echo    "─────────────────────────────────────────────────"
echo -e "  🛒 Store    ${BOLD}$FRONTEND_URL${RESET}"
echo -e "  ⚙️  Admin    ${BOLD}$FRONTEND_URL/admin${RESET}"
echo -e "  📡 API      ${BOLD}${BACKEND_URL}/api/docs${RESET}"
echo -e "  ❤️  Health   ${BOLD}${BACKEND_URL}/health${RESET}"
echo    ""
echo    "  Login:    admin@pantry.dev  /  admin1234"
echo    "  Coupons:  WELCOME10  FLAT5  FRESH20"
echo    "─────────────────────────────────────────────────"
