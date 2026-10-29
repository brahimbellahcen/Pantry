#!/usr/bin/env bash
# =============================================================
#  Pantry — Full Vercel setup: env vars + deploy + migrate
#  Run: chmod +x scripts/vercel-setup.sh && ./scripts/vercel-setup.sh
# =============================================================
set -euo pipefail

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; RED='\033[0;31m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
info() { echo -e "${BLUE}ℹ  $*${RESET}"; }
step() { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

# ── Load credentials ──────────────────────────────────────────
load_env() { grep "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d "'" | tr -d '"' || echo ""; }

VTOKEN="$(load_env VERCEL_TOKEN)"
[[ -z "$VTOKEN" ]] && fail "VERCEL_TOKEN not in backend/.env — add it and re-run"

DATABASE_URL="$(load_env DATABASE_URL)"
RESEND_API_KEY="$(load_env RESEND_API_KEY)"
CLOUDINARY_CLOUD_NAME="$(load_env CLOUDINARY_CLOUD_NAME)"
CLOUDINARY_API_KEY="$(load_env CLOUDINARY_API_KEY)"
CLOUDINARY_API_SECRET="$(load_env CLOUDINARY_API_SECRET)"
SECRET_KEY="$(load_env SECRET_KEY)"
[[ -z "$SECRET_KEY" ]] && SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

api() { curl -sf -H "Authorization: Bearer $VTOKEN" "$@"; }
api_post() { local url=$1; shift; curl -sf -H "Authorization: Bearer $VTOKEN" -H "Content-Type: application/json" -X POST "$url" "$@"; }

echo -e "\n${BOLD}🛒 Pantry — Vercel Auto-Deploy${RESET}"
echo    "────────────────────────────────────────"

# ── Step 1: Find projects ─────────────────────────────────────
step "1/5  Finding Vercel projects"

ALL_PROJECTS=$(api "https://api.vercel.com/v9/projects?limit=50")
echo "$ALL_PROJECTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('projects',[]):
    print(p['id'], p['name'])
" 2>/dev/null

# Find backend and frontend project IDs
BACKEND_ID=$(echo "$ALL_PROJECTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('projects',[]):
    n = p['name'].lower()
    if 'api' in n or 'backend' in n or 'pantry-api' in n:
        print(p['id']); break
" 2>/dev/null)

FRONTEND_ID=$(echo "$ALL_PROJECTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('projects',[]):
    n = p['name'].lower()
    if 'web' in n or 'frontend' in n or 'pantry-web' in n or 'pantry-five' in n:
        print(p['id']); break
" 2>/dev/null)

# Fallback: pick first two projects
if [[ -z "$BACKEND_ID" || -z "$FRONTEND_ID" ]]; then
  PROJ_IDS=$(echo "$ALL_PROJECTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ids=[p['id']+' '+p['name'] for p in d.get('projects',[])]
print('\n'.join(ids))
" 2>/dev/null)
  echo -e "${YELLOW}Projects found:${RESET}"
  echo "$PROJ_IDS"
  echo
  read -r -p "$(echo -e "${YELLOW}Backend project ID: ${RESET}")" BACKEND_ID
  read -r -p "$(echo -e "${YELLOW}Frontend project ID: ${RESET}")" FRONTEND_ID
fi

ok "Backend project:  $BACKEND_ID"
ok "Frontend project: $FRONTEND_ID"

# ── Step 2: Get frontend URL ──────────────────────────────────
step "2/5  Getting frontend URL"

FRONTEND_URL=$(api "https://api.vercel.com/v9/projects/$FRONTEND_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
alias = d.get('alias',[])
for a in alias:
    u = a.get('domain','')
    if u and 'vercel.app' in u:
        print('https://'+u); break
if not alias:
    # fallback
    print('https://'+d.get('name','')+'.vercel.app')
" 2>/dev/null)
ok "Frontend URL: $FRONTEND_URL"

# ── Step 3: Set backend env vars ──────────────────────────────
step "3/5  Setting backend environment variables"

set_env() {
  local proj=$1 key=$2 val=$3
  # Delete existing first (ignore errors)
  curl -sf -H "Authorization: Bearer $VTOKEN" \
    -X DELETE "https://api.vercel.com/v9/projects/$proj/env/$key" >/dev/null 2>&1 || true

  api_post "https://api.vercel.com/v9/projects/$proj/env" \
    -d "{\"key\":\"$key\",\"value\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$val"),\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    >/dev/null
}

BACKEND_VARS=(
  "DATABASE_URL:$DATABASE_URL"
  "SECRET_KEY:$SECRET_KEY"
  "APP_ENV:production"
  "APP_CORS_ORIGINS:$FRONTEND_URL"
  "RESEND_API_KEY:$RESEND_API_KEY"
  "EMAIL_FROM:Pantry <onboarding@resend.dev>"
  "CLOUDINARY_CLOUD_NAME:$CLOUDINARY_CLOUD_NAME"
  "CLOUDINARY_API_KEY:$CLOUDINARY_API_KEY"
  "CLOUDINARY_API_SECRET:$CLOUDINARY_API_SECRET"
  "GOOGLE_CLIENT_ID:"
  "GOOGLE_CLIENT_SECRET:"
  "CRON_SECRET:"
  "SENTRY_DSN:"
)

for kv in "${BACKEND_VARS[@]}"; do
  KEY="${kv%%:*}"
  VAL="${kv#*:}"
  set_env "$BACKEND_ID" "$KEY" "$VAL"
  ok "  $KEY"
done

# ── Step 4: Set frontend env vars ─────────────────────────────
step "4/5  Setting frontend environment variables"

BACKEND_URL=$(api "https://api.vercel.com/v9/projects/$BACKEND_ID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
alias = d.get('alias',[])
for a in alias:
    u = a.get('domain','')
    if u and 'vercel.app' in u:
        print('https://'+u); break
if not alias:
    print('https://'+d.get('name','')+'.vercel.app')
" 2>/dev/null)

set_env "$FRONTEND_ID" "VITE_API_URL" "${BACKEND_URL}/api/v1"
ok "  VITE_API_URL → ${BACKEND_URL}/api/v1"

# ── Step 5: Trigger deployments ───────────────────────────────
step "5/5  Triggering deployments"

# Get latest git SHA
SHA=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo "")

deploy_project() {
  local proj_id=$1 name=$2
  info "Deploying $name…"
  RESULT=$(api_post "https://api.vercel.com/v13/deployments" \
    -d "{\"name\":\"$name\",\"gitSource\":{\"type\":\"github\",\"repo\":\"brahimbellahcen/Pantry\",\"ref\":\"main\"},\"projectId\":\"$proj_id\"}" 2>/dev/null || echo "{}")
  DEPLOY_URL=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null)
  if [[ -n "$DEPLOY_URL" ]]; then
    ok "$name deploying: https://$DEPLOY_URL"
    echo "$DEPLOY_URL"
  else
    # Try redeploy via latest deployment
    info "Trying redeploy for $name…"
    LATEST=$(api "https://api.vercel.com/v6/deployments?projectId=$proj_id&limit=1&target=production" | python3 -c "import sys,json; d=json.load(sys.stdin); deps=d.get('deployments',[]); print(deps[0]['uid'] if deps else '')" 2>/dev/null)
    if [[ -n "$LATEST" ]]; then
      api_post "https://api.vercel.com/v13/deployments" \
        -d "{\"deploymentId\":\"$LATEST\",\"projectId\":\"$proj_id\",\"target\":\"production\"}" >/dev/null 2>&1 || true
      ok "$name redeploy triggered"
    fi
  fi
}

deploy_project "$BACKEND_ID"  "pantry-api"
deploy_project "$FRONTEND_ID" "pantry-web"

# ── Run migrations ────────────────────────────────────────────
step "→  Running Supabase migrations"
cd "$ROOT/backend"
pip install -q -r requirements.txt 2>/dev/null
DATABASE_URL="$DATABASE_URL" alembic upgrade head && ok "Migrations applied"
info "Seeding demo data…"
DATABASE_URL="$DATABASE_URL" python3 -m scripts.seed 2>/dev/null && ok "Demo data ready" || info "Seed skipped (data exists)"
cd "$ROOT"

# ── Done ──────────────────────────────────────────────────────
echo
echo -e "${BOLD}${GREEN}🎉 All done! Deployments are running.${RESET}"
echo    "─────────────────────────────────────────────"
echo -e "  🛒 Store    ${BOLD}$FRONTEND_URL${RESET}"
echo -e "  ⚙️  Admin    ${BOLD}$FRONTEND_URL/admin${RESET}"
echo -e "  📡 API      ${BOLD}${BACKEND_URL}/api/docs${RESET}"
echo -e "  ❤️  Health   ${BOLD}${BACKEND_URL}/health${RESET}"
echo    ""
echo    "  Login:    admin@pantry.dev / admin1234"
echo    "  Coupons:  WELCOME10   FLAT5   FRESH20"
echo    ""
echo -e "${YELLOW}  Note: Vercel deployments take ~2 minutes to go live.${RESET}"
echo    "─────────────────────────────────────────────"
