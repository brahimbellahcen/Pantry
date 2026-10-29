from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import get_settings
from app.routers import (
    auth, users, products, categories, cart, orders, admin,
    reviews, wishlist, delivery_slots, coupons,
    returns, recommendations, autocomplete, csv_import,
    flash_sales, loyalty, referrals, subscriptions, oauth, jobs, account,
)
from app.middleware.security import SecurityHeadersMiddleware, limiter
from app.utils.logging import configure_logging, log

settings = get_settings()
configure_logging()

app = FastAPI(
    title="Pantry API",
    description="Grocery e-commerce SaaS backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
for router in [
    auth.router, users.router, products.router, categories.router,
    cart.router, orders.router, admin.router, reviews.router,
    wishlist.router, delivery_slots.router, coupons.router,
    returns.router, returns.upload_router,
    recommendations.router, autocomplete.router, csv_import.router,
    flash_sales.router, loyalty.router, referrals.router,
    subscriptions.router, oauth.router, jobs.router, account.router,
]:
    app.include_router(router, prefix=PREFIX)

# Serve uploaded images in local-fallback mode
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
