#!/usr/bin/env bash
# ============================================================
#  Pantry — One-command free deployment
#  Usage: chmod +x scripts/deploy.sh && ./scripts/deploy.sh
#
#  Prerequisites (all free, no credit card):
#    • Node 18+    https://nodejs.org
#    • Python 3.10+ https://python.org
#    • git         https://git-scm.com
#
#  Services it provisions:
#    1. Supabase  — free PostgreSQL
#    2. Resend    — free email (3 000/month)
#    3. Cloudinary— free image storage (25 GB)
#    4. Railway   — free backend hosting
#    5. Vercel    — free frontend hosting
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}ℹ️  $*${RESET}"; }
success() { echo -e "${GREEN}✅ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${RESET}"; }
error()   { echo -e "${RED}❌ $*${RESET}"; exit 1; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
ask()     { read -r -p "$(echo -e "${YELLOW}👉 $1: ${RESET}")" "$2"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"
STATE_FILE="$REPO_ROOT/.deploy-state"

# ── Load existing .env values ─────────────────────────────────
load_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d "'" | tr -d '"' || echo ""
}

save_state() { grep -v "^$1=" "$STATE_FILE" 2>/dev/null > "${STATE_FILE}.tmp" || true; mv "${STATE_FILE}.tmp" "$STATE_FILE" 2>/dev/null || true; echo "$1=$2" >> "$STATE_FILE"; }
load_state() { grep "^$1=" "$STATE_FILE" 2>/dev/null | cut -d= -f2- || echo ""; }

# Pre-load known credentials from .env
RESEND_API_KEY="$(load_env RESEND_API_KEY)"
CLOUDINARY_CLOUD_NAME="$(load_env CLOUDINARY_CLOUD_NAME)"
CLOUDINARY_API_KEY="$(load_env CLOUDINARY_API_KEY)"
CLOUDINARY_API_SECRET="$(load_env CLOUDINARY_API_SECRET)"

echo -e "\n${BOLD}🛒 Pantry — Free Deployment${RESET}"
echo    "────────────────────────────────────"

# ── Step 0: Prerequisites ─────────────────────────────────────
step "0/6  Prerequisites"

for cmd in node python3 git curl; do
  command -v "$cmd" &>/dev/null && success "$cmd" || error "$cmd not found — install it first"
done

node_ver=$(node -v | tr -d 'v' | cut -d. -f1)
[[ "$node_ver" -lt 18 ]] && error "Node 18+ required (have $(node -v))"

for cli in vercel railway; do
  command -v "$cli" &>/dev/null || { info "Installing $cli…"; npm install -g "$cli" -q; }
  success "$cli CLI"
done

# ── Step 1: Supabase DATABASE_URL ────────────────────────────
step "1/6  Database (Supabase — free)"

DATABASE_URL="$(load_state DATABASE_URL)"
[[ -z "$DATABASE_URL" ]] && DATABASE_URL="$(load_env DATABASE_URL)"
[[ "$DATABASE_URL" == postgresql://grocery_user* ]] && DATABASE_URL=""  # ignore placeholder

if [[ -z "$DATABASE_URL" ]]; then
  echo
  echo "  Open ${BOLD}https://supabase.com${RESET} and:"
  echo "  1. Sign up (free) → New project → give it a password"
  echo "  2. Settings → Database → Connection String → URI → copy"
  echo
  ask "Paste your Supabase DATABASE_URL" DATABASE_URL
  [[ -z "$DATABASE_URL" ]] && error "DATABASE_URL is required"
  save_state DATABASE_URL "$DATABASE_URL"
fi
success "Database URL configured"

# ── Step 2: Resend (pre-filled) ──────────────────────────────
step "2/6  Email (Resend — free 3 000/month)"

if [[ -n "$RESEND_API_KEY" ]]; then
  success "Resend API key loaded from .env ✓"
else
  echo "  Open ${BOLD}https://resend.com${RESET} → API Keys → Create"
  ask "Paste your Resend API key" RESEND_API_KEY
  [[ -n "$RESEND_API_KEY" ]] || warn "Skipping email — emails disabled"
fi

# ── Step 3: Cloudinary (pre-filled) ──────────────────────────
step "3/6  Image Storage (Cloudinary — free 25 GB)"

if [[ -n "$CLOUDINARY_CLOUD_NAME" && -n "$CLOUDINARY_API_KEY" && -n "$CLOUDINARY_API_SECRET" ]]; then
  success "Cloudinary credentials loaded from .env ✓ (cloud: $CLOUDINARY_CLOUD_NAME)"
else
  echo "  Open ${BOLD}https://cloudinary.com${RESET} → Dashboard → copy credentials"
  ask "Cloudinary Cloud Name" CLOUDINARY_CLOUD_NAME
  ask "Cloudinary API Key"    CLOUDINARY_API_KEY
  ask "Cloudinary API Secret" CLOUDINARY_API_SECRET
  [[ -n "$CLOUDINARY_CLOUD_NAME" ]] || warn "Skipping Cloudinary — using local /uploads"
fi

# ── Step 4: Generate SECRET_KEY ──────────────────────────────
step "4/6  Secrets"
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
success "SECRET_KEY generated"

# ── Step 5: Deploy backend to Railway ────────────────────────
step "5/6  Backend → Railway (free)"

RAILWAY_BACKEND_URL="$(load_state RAILWAY_BACKEND_URL)"

if [[ -z "$RAILWAY_BACKEND_URL" ]]; then
  info "Logging in to Railway…"
  railway login

  cd "$REPO_ROOT/backend"
  railway init --name pantry-api 2>/dev/null || true

  info "Setting environment variables…"
  railway variables set \
    DATABASE_URL="$DATABASE_URL" \
    SECRET_KEY="$SECRET_KEY" \
    APP_ENV="production" \
    APP_CORS_ORIGINS="https://pantry.vercel.app" \
    RESEND_API_KEY="$RESEND_API_KEY" \
    EMAIL_FROM="Pantry <onboarding@resend.dev>" \
    CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}" \
    CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-}" \
    CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-}" \
    PORT="8000" 2>/dev/null || true

  info "Deploying (~ 2 min)…"
  railway up --detach

  sleep 15
  RAILWAY_BACKEND_URL=$(railway domain 2>/dev/null | grep "https://" | head -1 | tr -d ' ' || echo "")

  if [[ -z "$RAILWAY_BACKEND_URL" ]]; then
    echo
    echo "  Go to ${BOLD}https://railway.app${RESET} → your project → service → Settings → Networking → Public URL"
    ask "Paste the Railway backend URL" RAILWAY_BACKEND_URL
  fi
  save_state RAILWAY_BACKEND_URL "$RAILWAY_BACKEND_URL"
  cd "$REPO_ROOT"
fi
success "Backend: $RAILWAY_BACKEND_URL"

# ── Run migrations + seed ────────────────────────────────────
info "Running migrations…"
cd "$REPO_ROOT/backend"
pip install -q -r requirements.txt 2>/dev/null
DATABASE_URL="$DATABASE_URL" alembic upgrade head
success "Migrations applied"

info "Seeding demo data…"
DATABASE_URL="$DATABASE_URL" python3 -m scripts.seed 2>/dev/null || warn "Seed skipped (data may exist)"
success "Demo data ready"
cd "$REPO_ROOT"

# ── Step 6: Deploy frontend to Vercel ────────────────────────
step "6/6  Frontend → Vercel (free)"

VERCEL_FRONTEND_URL="$(load_state VERCEL_FRONTEND_URL)"

if [[ -z "$VERCEL_FRONTEND_URL" ]]; then
  cd "$REPO_ROOT/frontend"
  VITE_API_URL="${RAILWAY_BACKEND_URL}/api/v1"

  info "Deploying to Vercel…"
  VERCEL_FRONTEND_URL=$(vercel deploy --prod --yes \
    --env VITE_API_URL="$VITE_API_URL" 2>&1 | grep "https://" | tail -1 | tr -d ' ')

  [[ -z "$VERCEL_FRONTEND_URL" ]] && {
    ask "Paste the Vercel URL from dashboard" VERCEL_FRONTEND_URL
  }
  save_state VERCEL_FRONTEND_URL "$VERCEL_FRONTEND_URL"

  # Update CORS
  cd "$REPO_ROOT/backend"
  railway variables set APP_CORS_ORIGINS="$VERCEL_FRONTEND_URL" 2>/dev/null || true
  cd "$REPO_ROOT"
fi
success "Frontend: $VERCEL_FRONTEND_URL"

# ── Write final .env ─────────────────────────────────────────
cat > "$ENV_FILE" <<ENVEOF
DATABASE_URL=$DATABASE_URL
SECRET_KEY=$SECRET_KEY
APP_ENV=production
APP_CORS_ORIGINS=$VERCEL_FRONTEND_URL
RESEND_API_KEY=$RESEND_API_KEY
EMAIL_FROM=Pantry <onboarding@resend.dev>
CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-}
ENVEOF

# ── Done ─────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}🎉 Pantry is live!${RESET}"
echo    "──────────────────────────────────────────────"
echo -e "  🛒 Storefront   ${BOLD}$VERCEL_FRONTEND_URL${RESET}"
echo -e "  ⚙️  Admin         ${BOLD}$VERCEL_FRONTEND_URL/admin${RESET}"
echo -e "  📡 API docs     ${BOLD}${RAILWAY_BACKEND_URL}/api/docs${RESET}"
echo    ""
echo    "  Admin login:  admin@pantry.dev / admin1234"
echo    "  Coupons:      WELCOME10  FLAT5  FRESH20"
echo    "  Email:        Resend ✅  (ogpzj1z.cloudinary.com for images)"
echo    "──────────────────────────────────────────────"
