"""Payment service — wraps Stripe; swap out for another provider by replacing this module."""
from decimal import Decimal
from app.config import get_settings

settings = get_settings()


def _get_stripe():
    import stripe  # lazy import so missing key doesn't crash startup
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def create_payment_intent(amount: Decimal, currency: str = "usd", metadata: dict | None = None) -> dict:
    """Create a Stripe PaymentIntent and return {client_secret, payment_intent_id}."""
    stripe = _get_stripe()
    amount_cents = int(amount * 100)
    pi = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency,
        metadata=metadata or {},
        automatic_payment_methods={"enabled": True},
    )
    return {"client_secret": pi.client_secret, "payment_intent_id": pi.id}


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    stripe = _get_stripe()
    event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    return event
