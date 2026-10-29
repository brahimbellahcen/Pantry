#!/usr/bin/env bash
# =================================================================
#  Pantry — Deploy to Vercel (backend + frontend) + Supabase
#
#  Run from your machine:
#    chmod +x scripts/deploy-vercel.sh
#    ./scripts/deploy-vercel.sh
#
#  Credentials are read from backend/.env  (never committed).
#  Copy backend/.env.example → backend/.env and fill in values.
# =================================================================
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; RED='\033[0;31m'; RESET='\033[0m'

info()    { echo -e "${BLUE}ℹ  $*${RESET}"; }
success() { echo -e "${GREEN}✅ $*${RESET}"; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
ask()     { read -r -p "$(echo -e "${YELLOW}👉 $1: ${RESET}")" "$2"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ENV_FILE="$BACKEND/.env"

# ── Load credentials from backend/.env ────────────────────────
load_env() { grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d "'" | tr -d '"' || echo ""; }

[[ ! -f "$ENV_FILE" ]] && {
  cp "$BACKEND/.env.example" "$ENV_FILE"
  echo -e "${RED}❌ backend/.env not found — created from .env.example. Fill in values and re-run.${RESET}"
  exit 1
}

DATABASE_URL="$(load_env DATABASE_URL)"
RESEND_API_KEY="$(load_env RESEND_API_KEY)"
CLOUDINARY_CLOUD_NAME="$(load_env CLOUDINARY_CLOUD_NAME)"
CLOUDINARY_API_KEY="$(load_env CLOUDINARY_API_KEY)"
CLOUDINARY_API_SECRET="$(load_env CLOUDINARY_API_SECRET)"
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Validate required fields
[[ -z "$DATABASE_URL" || "$DATABASE_URL" == *"grocery_user"* ]] && {
  echo -e "${RED}❌ DATABASE_URL not set in backend/.env${RESET}"
  echo "  Get it from: https://supabase.com/dashboard/project/zphksoztkfdsxoxgymol/settings/database"
  ask "Paste Supabase DATABASE_URL" DATABASE_URL
  grep -v "^DATABASE_URL=" "$ENV_FILE" > /tmp/.env_tmp && mv /tmp/.env_tmp "$ENV_FILE"
  echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
}

echo -e "\n${BOLD}🛒 Pantry → Vercel Deployment${RESET}"
echo    "─────────────────────────────────────────"
printf  "  Database   %s\n" "$([ -n "$DATABASE_URL" ] && echo '✅ Supabase' || echo '❌ missing')"
printf  "  Email      %s\n" "$([ -n "$RESEND_API_KEY" ] && echo '✅ Resend' || echo '⚠️  disabled')"
printf  "  Images     %s\n" "$([ -n "$CLOUDINARY_CLOUD_NAME" ] && echo "✅ Cloudinary ($CLOUDINARY_CLOUD_NAME)" || echo '⚠️  local fallback')"
echo    "─────────────────────────────────────────"

# ── Step 0: Prerequisites ──────────────────────────────────────
step "0/5  Prerequisites"
command -v node    &>/dev/null || { echo "Install Node 18+ → https://nodejs.org"; exit 1; }
command -v python3 &>/dev/null || { echo "Install Python 3.10+"; exit 1; }
command -v vercel  &>/dev/null || npm install -g vercel -q
success "Vercel $(vercel --version)"

# ── Step 1: Migrations + seed ──────────────────────────────────
step "1/5  Supabase migrations"
cd "$BACKEND"
pip install -q -r requirements.txt 2>/dev/null || pip3 install -q -r requirements.txt
DATABASE_URL="$DATABASE_URL" alembic upgrade head
success "6 migrations applied"
info "Seeding demo data…"
DATABASE_URL="$DATABASE_URL" python3 -m scripts.seed 2>/dev/null || warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }; warn "Seed skipped (data exists)"
success "admin@pantry.dev / admin1234 ready"
cd "$ROOT"

# ── Step 2: Vercel login ───────────────────────────────────────
step "2/5  Vercel login"
vercel whoami &>/dev/null || vercel login
success "Logged in as $(vercel whoami 2>/dev/null || echo 'Vercel user')"

# ── Step 3: Deploy backend ─────────────────────────────────────
step "3/5  Backend (FastAPI → Vercel)"
cd "$BACKEND"
info "Deploying backend (~90 s)…"

BACKEND_URL=$(vercel deploy --prod --yes \
  --name pantry-api \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SECRET_KEY="$SECRET_KEY" \
  -e APP_ENV="production" \
  -e APP_CORS_ORIGINS="https://pantry-web.vercel.app" \
  -e RESEND_API_KEY="${RESEND_API_KEY:-}" \
  -e EMAIL_FROM="Pantry <onboarding@resend.dev>" \
  -e CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}" \
  -e CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-}" \
  -e CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-}" \
  2>&1 | grep "^https://" | tail -1 | tr -d ' ')

[[ -z "$BACKEND_URL" ]] && ask "Paste backend URL from output above" BACKEND_URL
success "Backend: $BACKEND_URL"
cd "$ROOT"

# ── Step 4: Deploy frontend ────────────────────────────────────
step "4/5  Frontend (React → Vercel)"
cd "$FRONTEND"
info "Deploying frontend…"

FRONTEND_URL=$(vercel deploy --prod --yes \
  --name pantry-web \
  -e VITE_API_URL="${BACKEND_URL}/api/v1" \
  2>&1 | grep "^https://" | tail -1 | tr -d ' ')

[[ -z "$FRONTEND_URL" ]] && ask "Paste frontend URL from output above" FRONTEND_URL
success "Frontend: $FRONTEND_URL"
cd "$ROOT"

# ── Step 5: Fix CORS ──────────────────────────────────────────
step "5/5  Update CORS on backend"
cd "$BACKEND"
vercel env rm APP_CORS_ORIGINS production --yes 2>/dev/null || true
echo "$FRONTEND_URL" | vercel env add APP_CORS_ORIGINS production --yes 2>/dev/null || true
vercel deploy --prod --yes --name pantry-api >/dev/null 2>&1 || true
success "CORS set to $FRONTEND_URL"
cd "$ROOT"

# ── Update local .env ─────────────────────────────────────────
sed -i "s|^APP_CORS_ORIGINS=.*|APP_CORS_ORIGINS=$FRONTEND_URL|" "$ENV_FILE" 2>/dev/null || true

echo
echo -e "${BOLD}${GREEN}🎉 Pantry is live!${RESET}"
echo    "─────────────────────────────────────────────────"
echo -e "  🛒 Store   ${BOLD}$FRONTEND_URL${RESET}"
echo -e "  ⚙️  Admin   ${BOLD}$FRONTEND_URL/admin${RESET}"
echo -e "  📡 API     ${BOLD}${BACKEND_URL}/api/docs${RESET}"
echo    ""
echo    "  Login:    admin@pantry.dev  /  admin1234"
echo    "  Coupons:  WELCOME10   FLAT5   FRESH20"
echo    "─────────────────────────────────────────────────"
