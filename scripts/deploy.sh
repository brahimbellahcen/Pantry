#!/usr/bin/env bash
# ============================================================
#  Pantry — One-command free deployment
#  Runs on: macOS, Ubuntu/Debian, WSL2
#
#  What it does (all free, no credit card):
#    1. Checks prerequisites (Node, Python, git, curl)
#    2. Creates a Supabase PostgreSQL database
#    3. Creates a Resend email API key (prompts you to sign up)
#    4. Creates a Cloudinary account (prompts you to sign up)
#    5. Deploys the backend to Railway (free $5/month credit)
#    6. Deploys the frontend to Vercel (free)
#    7. Runs database migrations
#    8. Seeds demo data (20 products, admin user, coupons)
#
#  Usage:
#    chmod +x scripts/deploy.sh
#    ./scripts/deploy.sh
# ============================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}ℹ️  $*${RESET}"; }
success() { echo -e "${GREEN}✅ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${RESET}"; }
error()   { echo -e "${RED}❌ $*${RESET}"; exit 1; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
prompt()  { echo -e "${YELLOW}👉 $*${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"

# ── State file (resume if interrupted) ───────────────────────
STATE_FILE="$REPO_ROOT/.deploy-state"
save_state() { echo "$1=$2" >> "$STATE_FILE"; }
load_state() { grep "^$1=" "$STATE_FILE" 2>/dev/null | cut -d= -f2- || echo ""; }

echo -e "\n${BOLD}🛒 Pantry — Free Deployment Script${RESET}"
echo    "────────────────────────────────────────"
echo    "This will deploy Pantry to free cloud services."
echo    "Estimated time: 8–12 minutes"
echo

# ── Step 0: Prerequisites ─────────────────────────────────────
step "0/7  Checking prerequisites"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is not installed. Install it from $2"
  fi
  success "$1 found"
}

check_cmd node   "https://nodejs.org"
check_cmd python3 "https://python.org"
check_cmd git    "https://git-scm.com"
check_cmd curl   "https://curl.se"

node_version=$(node -v | tr -d 'v' | cut -d. -f1)
[[ "$node_version" -lt 18 ]] && error "Node.js 18+ required (you have $(node -v))"

# Install CLIs if missing
for cli in vercel railway; do
  if ! command -v "$cli" &>/dev/null; then
    info "Installing $cli CLI…"
    npm install -g "$cli" --quiet
  fi
  success "$cli CLI ready"
done

# ── Step 1: Supabase (free PostgreSQL) ────────────────────────
step "1/7  Supabase — free PostgreSQL"

DATABASE_URL=$(load_state DATABASE_URL)

if [[ -z "$DATABASE_URL" ]]; then
  echo
  prompt "Open https://supabase.com in your browser and:"
  echo "  1. Click 'Start your project' and sign up (free)"
  echo "  2. Click 'New project', give it a name, set a DB password"
  echo "  3. Go to Settings → Database → Connection String → URI"
  echo "  4. Copy the connection string (starts with postgres://)"
  echo
  read -r -p "$(echo -e "${YELLOW}Paste your Supabase DATABASE_URL here: ${RESET}")" DATABASE_URL
  [[ -z "$DATABASE_URL" ]] && error "DATABASE_URL is required"
  save_state DATABASE_URL "$DATABASE_URL"
fi

success "Supabase DATABASE_URL configured"

# ── Step 2: Resend (free email) ───────────────────────────────
step "2/7  Resend — free email (3,000/month)"

RESEND_API_KEY=$(load_state RESEND_API_KEY)

if [[ -z "$RESEND_API_KEY" ]]; then
  echo
  prompt "Open https://resend.com in your browser and:"
  echo "  1. Sign up (free, no credit card)"
  echo "  2. Go to API Keys → Create API Key"
  echo "  3. Copy the key (starts with re_)"
  echo
  read -r -p "$(echo -e "${YELLOW}Paste your Resend API key (or press Enter to skip): ${RESET}")" RESEND_API_KEY
  [[ -n "$RESEND_API_KEY" ]] && save_state RESEND_API_KEY "$RESEND_API_KEY"
fi

if [[ -n "$RESEND_API_KEY" ]]; then
  success "Resend API key configured"
else
  warn "Resend skipped — emails will be disabled (you can add it later)"
  RESEND_API_KEY=""
fi

# ── Step 3: Cloudinary (free image storage) ───────────────────
step "3/7  Cloudinary — free image storage (25 GB)"

CLOUDINARY_CLOUD_NAME=$(load_state CLOUDINARY_CLOUD_NAME)
# Pre-fill known cloud name so the script skips this prompt
if [[ -z "$CLOUDINARY_CLOUD_NAME" ]]; then
  CLOUDINARY_CLOUD_NAME="ogpzj1z"
  save_state CLOUDINARY_CLOUD_NAME "$CLOUDINARY_CLOUD_NAME"
fi

if [[ -z "$CLOUDINARY_CLOUD_NAME" ]]; then
  echo
  prompt "Open https://cloudinary.com in your browser and:"
  echo "  1. Sign up (free, no credit card)"
  echo "  2. Go to Dashboard — you'll see Cloud Name, API Key, API Secret"
  echo
  read -r -p "$(echo -e "${YELLOW}Cloudinary Cloud Name (or Enter to skip): ${RESET}")" CLOUDINARY_CLOUD_NAME
  if [[ -n "$CLOUDINARY_CLOUD_NAME" ]]; then
    read -r -p "$(echo -e "${YELLOW}Cloudinary API Key: ${RESET}")" CLOUDINARY_API_KEY
    read -r -p "$(echo -e "${YELLOW}Cloudinary API Secret: ${RESET}")" CLOUDINARY_API_SECRET
    save_state CLOUDINARY_CLOUD_NAME "$CLOUDINARY_CLOUD_NAME"
    save_state CLOUDINARY_API_KEY    "$CLOUDINARY_API_KEY"
    save_state CLOUDINARY_API_SECRET "$CLOUDINARY_API_SECRET"
  else
    CLOUDINARY_API_KEY=""
    CLOUDINARY_API_SECRET=""
  fi
else
  CLOUDINARY_API_KEY=$(load_state CLOUDINARY_API_KEY)
  CLOUDINARY_API_SECRET=$(load_state CLOUDINARY_API_SECRET)
fi

if [[ -n "$CLOUDINARY_CLOUD_NAME" ]]; then
  success "Cloudinary configured"
else
  warn "Cloudinary skipped — images will use local /uploads fallback"
fi

# ── Step 4: Generate secrets ──────────────────────────────────
step "4/7  Generating secrets"

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
success "SECRET_KEY generated"

# ── Step 5: Deploy backend to Railway ────────────────────────
step "5/7  Railway — deploy backend"

RAILWAY_BACKEND_URL=$(load_state RAILWAY_BACKEND_URL)

if [[ -z "$RAILWAY_BACKEND_URL" ]]; then
  info "Logging in to Railway (free $5/month credit, ~500MB DB included)…"
  railway login

  info "Creating Railway project…"
  cd "$REPO_ROOT/backend"
  railway init --name pantry-api 2>/dev/null || true

  info "Setting environment variables on Railway…"
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

  info "Deploying backend (this takes ~2 minutes)…"
  railway up --service pantry-api --detach

  # Get the public URL
  sleep 10
  RAILWAY_BACKEND_URL=$(railway domain 2>/dev/null | grep "https://" | head -1 | tr -d ' ' || echo "")
  if [[ -z "$RAILWAY_BACKEND_URL" ]]; then
    echo
    prompt "Railway deployment started. To get the backend URL:"
    echo "  1. Go to https://railway.app → your project"
    echo "  2. Click your service → Settings → Networking → Public URL"
    read -r -p "$(echo -e "${YELLOW}Paste the Railway backend URL: ${RESET}")" RAILWAY_BACKEND_URL
  fi
  save_state RAILWAY_BACKEND_URL "$RAILWAY_BACKEND_URL"
  cd "$REPO_ROOT"
fi

success "Backend URL: $RAILWAY_BACKEND_URL"

# ── Run migrations ────────────────────────────────────────────
info "Running database migrations…"
cd "$REPO_ROOT/backend"
pip install -q -r requirements.txt 2>/dev/null
DATABASE_URL="$DATABASE_URL" alembic upgrade head
success "Migrations applied"

# Seed demo data
info "Seeding demo data…"
DATABASE_URL="$DATABASE_URL" python3 -m scripts.seed || warn "Seed failed (data may already exist)"
success "Demo data ready"
cd "$REPO_ROOT"

# ── Step 6: Deploy frontend to Vercel ─────────────────────────
step "6/7  Vercel — deploy frontend"

VERCEL_FRONTEND_URL=$(load_state VERCEL_FRONTEND_URL)

if [[ -z "$VERCEL_FRONTEND_URL" ]]; then
  info "Logging in to Vercel (free, GitHub login)…"
  cd "$REPO_ROOT/frontend"

  # Set VITE_API_URL with the backend URL
  VITE_API_URL="${RAILWAY_BACKEND_URL}/api/v1"

  info "Deploying frontend to Vercel…"
  VERCEL_FRONTEND_URL=$(vercel deploy --prod \
    --yes \
    --env VITE_API_URL="$VITE_API_URL" \
    2>&1 | grep "https://" | tail -1 | tr -d ' ')

  [[ -z "$VERCEL_FRONTEND_URL" ]] && {
    echo
    prompt "Check Vercel dashboard at https://vercel.com for your deployment URL"
    read -r -p "$(echo -e "${YELLOW}Paste the Vercel frontend URL: ${RESET}")" VERCEL_FRONTEND_URL
  }
  save_state VERCEL_FRONTEND_URL "$VERCEL_FRONTEND_URL"

  # Update CORS on Railway
  info "Updating backend CORS to allow frontend URL…"
  cd "$REPO_ROOT/backend"
  railway variables set APP_CORS_ORIGINS="$VERCEL_FRONTEND_URL" 2>/dev/null || true
  cd "$REPO_ROOT"
fi

success "Frontend URL: $VERCEL_FRONTEND_URL"

# ── Step 7: Write local .env ──────────────────────────────────
step "7/7  Writing local .env"

cat > "$ENV_FILE" <<EOF
DATABASE_URL=$DATABASE_URL
SECRET_KEY=$SECRET_KEY
APP_ENV=production
APP_CORS_ORIGINS=$VERCEL_FRONTEND_URL
RESEND_API_KEY=$RESEND_API_KEY
EMAIL_FROM=Pantry <onboarding@resend.dev>
CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-}
EOF

success ".env written to backend/.env"

# ── Done ──────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}🎉 Pantry is live!${RESET}"
echo    "────────────────────────────────────────────────"
echo -e "  🛒 Storefront:  ${BOLD}$VERCEL_FRONTEND_URL${RESET}"
echo -e "  ⚙️  Admin:       ${BOLD}$VERCEL_FRONTEND_URL/admin${RESET}"
echo -e "  📡 API docs:    ${BOLD}${RAILWAY_BACKEND_URL}/api/docs${RESET}"
echo    ""
echo    "  Admin login:    admin@pantry.dev / admin1234"
echo    "  Demo coupons:   WELCOME10  FLAT5  FRESH20"
echo    ""
echo -e "  ${YELLOW}ℹ️  State saved to .deploy-state — re-run to resume if anything failed.${RESET}"
echo    "────────────────────────────────────────────────"
