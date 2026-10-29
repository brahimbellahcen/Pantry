from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import get_settings
from app.routers import auth, users, products, categories, cart, orders, admin, reviews, wishlist, delivery_slots, coupons
from app.middleware.security import SecurityHeadersMiddleware, limiter
from app.utils.logging import configure_logging, log

settings = get_settings()

configure_logging()

# Sentry (no-op if DSN not set)
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(dsn=settings.SENTRY_DSN, integrations=[FastApiIntegration()], traces_sample_rate=0.2)

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
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(products.router, prefix=PREFIX)
app.include_router(categories.router, prefix=PREFIX)
app.include_router(cart.router, prefix=PREFIX)
app.include_router(orders.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(reviews.router, prefix=PREFIX)
app.include_router(wishlist.router, prefix=PREFIX)
app.include_router(delivery_slots.router, prefix=PREFIX)
app.include_router(coupons.router, prefix=PREFIX)


@app.get("/health")
def health():
    return {"status": "ok"}


# Stripe webhook — raw body needed before JSON parsing
@app.post("/api/v1/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(request: Request):
    from app.services.payment import verify_webhook
    from app.database import SessionLocal
    from app.models.order import Order
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = verify_webhook(payload, sig)
    except Exception:
        return JSONResponse({"detail": "Invalid signature"}, status_code=400)

    if event["type"] in ("payment_intent.succeeded", "checkout.session.completed"):
        obj = event["data"]["object"]
        order_id = obj.get("metadata", {}).get("order_id")
        if order_id:
            db = SessionLocal()
            try:
                order = db.get(Order, int(order_id))
                if order:
                    order.payment_status = "paid"
                    order.status = "confirmed"
                    db.commit()
            finally:
                db.close()
    return {"received": True}
