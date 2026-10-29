"""
Email service powered by Resend — https://resend.com
Free tier: 3 000 emails/month, no credit card required.

Setup:
1. Sign up at resend.com
2. Go to API Keys → Create API Key
3. Set RESEND_API_KEY=re_xxx in your .env
4. Optionally verify a domain; without it Resend uses the onboarding@resend.dev sandbox.
"""
from app.config import get_settings

settings = get_settings()

STATUS_SUBJECTS = {
    "confirmed":  "Your Pantry order #{num} is confirmed ✅",
    "processing": "Your Pantry order #{num} is being prepared 🧺",
    "shipped":    "Your Pantry order #{num} is on its way 🚚",
    "delivered":  "Your Pantry order #{num} has been delivered 🎉",
    "cancelled":  "Your Pantry order #{num} has been cancelled",
    "refunded":   "Your Pantry order #{num} has been refunded",
}

STATUS_BODIES = {
    "confirmed":  "<p>Great news! Your order is confirmed and will be prepared shortly.</p>",
    "processing": "<p>Your order is being picked and packed. We'll notify you when it ships.</p>",
    "shipped":    "<p>Your order is out for delivery. Expected arrival: <strong>{delivery}</strong>.</p>",
    "delivered":  "<p>Your order has been delivered. Enjoy your groceries! 🥗</p>",
    "cancelled":  "<p>Your order has been cancelled. Any payment will be refunded within 5–10 business days.</p>",
    "refunded":   "<p>Your refund has been processed and will appear in 3–5 business days.</p>",
}

_BASE_STYLE = """
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#16a34a;margin-bottom:8px">🛒 Pantry</h2>
  {body}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">
    You're receiving this because you have an account at Pantry.
  </p>
</div>
"""


def _send(to_email: str, subject: str, html_body: str) -> None:
    """Send via Resend. Silently skips if API key is not set (dev mode)."""
    if not settings.RESEND_API_KEY:
        return
    import resend
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": _BASE_STYLE.format(body=html_body),
    })


def send_order_confirmation(to_email: str, order_number: str, total: str) -> None:
    _send(
        to_email,
        subject=f"Your Pantry order #{order_number} is confirmed ✅",
        html_body=f"""
        <h3>Order Confirmed 🎉</h3>
        <p>Thank you! Your order <strong>#{order_number}</strong> has been placed.</p>
        <p>Total: <strong>{total}</strong></p>
        <p>We'll send you another email when your order ships.</p>
        """,
    )


def send_order_status_update(
    to_email: str,
    order_number: str,
    status: str,
    delivery_date: str = "soon",
    tracking_ref: str = "N/A",
) -> None:
    subject_tpl = STATUS_SUBJECTS.get(status)
    body_tpl = STATUS_BODIES.get(status)
    if not subject_tpl or not body_tpl:
        return
    _send(
        to_email,
        subject=subject_tpl.format(num=order_number),
        html_body=f"<h3>Order #{order_number} Update</h3>" +
                  body_tpl.format(delivery=delivery_date, ref=tracking_ref),
    )


def send_password_reset(to_email: str, reset_link: str) -> None:
    _send(
        to_email,
        subject="Reset your Pantry password",
        html_body=f"""
        <h3>Password Reset</h3>
        <p>Click the link below to reset your password. It expires in 1 hour.</p>
        <p>
          <a href="{reset_link}"
             style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;
                    border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px">If you didn't request this, ignore this email.</p>
        """,
    )
