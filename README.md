# Pantry — Professional Grocery SaaS

A full-stack grocery e-commerce SaaS with a **Python/FastAPI** backend and **React/TypeScript** frontend.

---

## Architecture

```
grocery-saas/
├── backend/          # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── routers/  # Route handlers (auth, products, cart, orders, admin)
│   │   ├── services/ # Payment (Stripe) and Email integrations
│   │   └── utils/    # Security helpers (JWT, bcrypt)
│   ├── alembic/      # Database migrations
│   └── tests/        # pytest test suite
└── frontend/         # React + TypeScript + Tailwind CSS
    └── src/
        ├── api/      # Typed API clients
        ├── contexts/ # Auth and Cart React contexts
        ├── pages/    # Storefront + Admin pages
        └── components/
```

---

## Quick Start (Docker)

```bash
# 1. Clone and set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets

# 2. Start all services
docker compose up --build

# Access:
# Storefront:   http://localhost
# API docs:     http://localhost:8000/api/docs
```

---

## Local Development

### Backend

```bash
cd backend

# Create a virtualenv
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY at minimum

# Run migrations (requires PostgreSQL)
alembic upgrade head

# Start the dev server
uvicorn app.main:app --reload
# → http://localhost:8000/api/docs
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# VITE_API_URL defaults to /api/v1 (proxied by Vite to localhost:8000)

# Start the dev server
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | Long random string for JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | JWT access token TTL (default: 60) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | | Refresh token TTL (default: 30) |
| `APP_CORS_ORIGINS` | | Comma-separated allowed origins |
| `STRIPE_SECRET_KEY` | | Stripe secret key (payments) |
| `STRIPE_WEBHOOK_SECRET` | | Stripe webhook endpoint secret |
| `SMTP_HOST` | | SMTP server for transactional email |
| `SMTP_PORT` | | SMTP port (587 for STARTTLS) |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASSWORD` | | SMTP password |
| `EMAIL_FROM` | | From address for sent emails |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## Running Tests

### Backend

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v --cov=app
```

Tests use an in-memory SQLite database — no external services needed.

### Frontend

```bash
cd frontend
npm run test
```

---

## API Contract

Interactive docs are available at `/api/docs` (Swagger UI) and `/api/redoc`.

Key endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login (returns JWT pair) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/products` | List products (search, filter, paginate) |
| GET | `/api/v1/products/{slug}` | Get product detail |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/cart` | Get current user's cart |
| POST | `/api/v1/cart/items` | Add item to cart |
| POST | `/api/v1/orders/checkout` | Place order from cart |
| GET | `/api/v1/orders` | List user's orders |
| GET | `/api/v1/admin/stats` | Dashboard stats (admin only) |
| GET | `/api/v1/admin/products` | List all products (admin) |
| POST | `/api/v1/admin/products` | Create product (admin) |
| PATCH | `/api/v1/admin/orders/{id}/status` | Update order status (admin) |

---

## Feature Checklist

### Customer Storefront
- [x] Product listing with search, category filter, and pagination
- [x] Product detail page with image, description, and quantity selector
- [x] Shopping cart with live totals, stock checks
- [x] Checkout with saved or inline address
- [x] Order history and order detail
- [x] User registration and login
- [x] JWT auth with auto-refresh

### Admin Dashboard
- [x] Summary stats (revenue, orders, products, low stock)
- [x] Product management (create, edit, soft-delete)
- [x] Category management
- [x] Order management with status updates
- [x] Inventory management (quantity + low-stock threshold)

### Engineering
- [x] Alembic database migrations
- [x] Bcrypt password hashing
- [x] JWT access + refresh tokens with revocation
- [x] Input validation via Pydantic
- [x] Stripe PaymentIntent integration (configurable, off by default)
- [x] Stripe webhook handler for payment confirmation
- [x] Transactional email (configurable SMTP)
- [x] pytest backend test suite (auth, products, cart, orders)
- [x] Vitest frontend test suite
- [x] Docker Compose for local and production

---

## Third-Party Services

| Service | Purpose | Required? |
|---|---|---|
| **PostgreSQL** | Primary database | ✅ (or SQLite for tests) |
| **Stripe** | Payment processing | Optional — set `STRIPE_SECRET_KEY` |
| **SMTP provider** | Transactional email | Optional — set `SMTP_*` vars |
| **S3 / CDN** | Product image storage | Optional — store image URLs in DB |

Payments and email degrade gracefully when credentials are absent (orders are still created; email is skipped silently).

---

## Assumptions

1. **Pricing** is in USD by default. Currency can be changed in `orders.py` (`create_payment_intent` call).
2. **Tax rate** is a flat 8% — replace with a tax API (e.g. TaxJar) for production.
3. **Shipping** is free above $50, otherwise $5.99 — replace with a carrier API for dynamic rates.
4. **Image hosting** — the backend stores URLs. Upload images to S3/Cloudinary and pass the URL on product creation.
5. **Delivery scheduling** — estimated delivery is `today + 3 days`. Integrate a delivery service (e.g. Route4Me) for real scheduling.
