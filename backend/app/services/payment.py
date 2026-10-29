"""Payment service — wraps Stripe; swap out for another provider by replacing this module."""
from decimal import Decimal
from app.config import get_settings

settings = get_settings()


def _get_stripe():
    import stripe
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


def create_checkout_session(
    amount: Decimal,
    order_number: str,
    order_id: int,
    success_url: str,
    cancel_url: str,
    currency: str = "usd",
) -> dict:
    """Create a hosted Stripe Checkout Session and return {session_id, session_url}."""
    stripe = _get_stripe()
    amount_cents = int(amount * 100)
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": currency,
                "product_data": {"name": f"Pantry Order {order_number}"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": str(order_id), "order_number": order_number},
    )
    return {"session_id": session.id, "session_url": session.url}


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    stripe = _get_stripe()
    event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    return event
