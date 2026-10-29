# 🛒 Pantry — Free Grocery SaaS

A full-stack grocery e-commerce platform. **Completely free to run** — no credit card needed for any service.

## 🚀 Deploy in one command

```bash
git clone https://github.com/brahimbellahcen/Pantry.git
cd Pantry
make deploy
```

The script guides you through 3 free sign-ups (< 5 min each), then deploys everything automatically:

| Service | Purpose | Free limit |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL database | 500 MB forever |
| [Railway](https://railway.app) | Backend API hosting | $5/month credit |
| [Vercel](https://vercel.com) | Frontend hosting | Unlimited |
| [Resend](https://resend.com) | Transactional email | 3,000/month |
| [Cloudinary](https://cloudinary.com) | Image storage | 25 GB forever |

After `make deploy` completes you'll see:

```
🎉 Pantry is live!
  🛒 Storefront:  https://your-app.vercel.app
  ⚙️  Admin:       https://your-app.vercel.app/admin
  📡 API docs:    https://your-api.railway.app/api/docs

  Admin login:  admin@pantry.dev / admin1234
  Demo coupons: WELCOME10  FLAT5  FRESH20
```

---

## 💻 Local development

```bash
# Install dependencies
make install

# Copy env file and fill in values (all optional for local dev)
cp backend/.env.example backend/.env

# Start both servers
make dev
# Backend  → http://localhost:8000/api/docs
# Frontend → http://localhost:5173

# Or with Docker
make docker
```

---

## 🧪 Tests

```bash
make test          # 65 tests, all passing
make seed          # seed demo data after migrations
make migrate       # run Alembic migrations
```

---

## Architecture

```
Pantry/
├── backend/          FastAPI + SQLAlchemy + Alembic (Python)
│   ├── app/
│   │   ├── models/   14 database tables
│   │   ├── routers/  73 API endpoints
│   │   ├── services/ email (Resend), storage (Cloudinary), payment (COD)
│   │   └── ...
│   ├── alembic/      5 migrations
│   ├── scripts/      seed.py
│   └── tests/        65 tests
└── frontend/         React + TypeScript + Tailwind CSS
    └── src/
        ├── pages/    20+ pages (storefront + admin)
        ├── components/ ProductCard, OrderTimeline, SearchAutocomplete…
        ├── api/      typed API clients
        └── contexts/ Auth, Cart, Wishlist
```

## Feature checklist

**Customer storefront**
- [x] Browse products with full-text search + autocomplete + filters + sort
- [x] Product detail with reviews, star ratings, related products
- [x] Cart with stock validation
- [x] Checkout — Cash on Delivery or Bank Transfer (no Stripe needed)
- [x] Order history + visual timeline
- [x] Wishlist
- [x] Return requests
- [x] Account profile + saved addresses
- [x] Password reset via email

**Admin dashboard**
- [x] KPI cards + Recharts revenue/orders charts
- [x] Product management (CRUD + image upload to Cloudinary)
- [x] CSV bulk import & export
- [x] Category management
- [x] Inventory levels + low-stock alerts
- [x] Coupon management (percent/fixed, usage limits, expiry)
- [x] Review moderation queue
- [x] Delivery slot calendar
- [x] Order management + status updates
- [x] Return request resolution
- [x] Customer list

**Engineering**
- [x] JWT auth + refresh tokens + rate limiting (slowapi)
- [x] OWASP security headers
- [x] Background email tasks (non-blocking)
- [x] PostgreSQL GIN full-text search (SQLite fallback for tests)
- [x] 9 performance indexes
- [x] GDPR account deletion
- [x] Structured JSON logging (structlog)
- [x] PWA manifest + SEO meta tags
- [x] Docker Compose (dev + prod)
- [x] GitHub Actions CI

## Environment variables

See [`backend/.env.example`](backend/.env.example) — all services are optional; the app runs with zero environment variables in development.
