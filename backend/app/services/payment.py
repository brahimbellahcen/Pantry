"""
Payment service — Cash on Delivery (COD) by default.
No API keys, no fees, works out of the box.

Optional paid upgrade path:
- Stripe: set STRIPE_SECRET_KEY in .env  (see docs/payment-stripe.md)
- PayPal: set PAYPAL_CLIENT_ID in .env   (see docs/payment-paypal.md)

The checkout endpoint passes payment_method in the request body.
Default is "cod" which requires no configuration.
"""

SUPPORTED_METHODS = {"cod", "bank_transfer"}


def process_payment(
    method: str,
    amount,
    order_number: str,
    order_id: int,
    success_url: str = "",
    cancel_url: str = "",
) -> dict:
    """
    Process payment for the given method.
    Returns a dict with optional `redirect_url` for hosted checkout flows.
    """
    if method == "cod":
        return {"status": "pending", "method": "cod", "message": "Pay on delivery"}

    if method == "bank_transfer":
        return {
            "status": "pending",
            "method": "bank_transfer",
            "message": "Please transfer the total to the bank account shown in your confirmation email.",
        }

    # Unknown method — fall back to COD silently
    return {"status": "pending", "method": "cod", "message": "Pay on delivery"}
