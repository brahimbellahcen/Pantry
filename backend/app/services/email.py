"""Email service — wraps SMTP. Swap with SendGrid/SES by replacing send()."""
import emails as em
from app.config import get_settings

settings = get_settings()

STATUS_SUBJECTS = {
    "confirmed":  "Your Pantry order #{num} has been confirmed ✅",
    "processing": "Your Pantry order #{num} is being prepared 🧺",
    "shipped":    "Your Pantry order #{num} is on its way 🚚",
    "delivered":  "Your Pantry order #{num} has been delivered 🎉",
    "cancelled":  "Your Pantry order #{num} has been cancelled",
    "refunded":   "Your Pantry order #{num} has been refunded",
}

STATUS_BODIES = {
    "confirmed": "<p>Great news! Your order is confirmed and will be prepared shortly.</p>",
    "processing": "<p>Your order is being picked and packed. We'll notify you when it ships.</p>",
    "shipped": "<p>Your order is out for delivery. Expected arrival: <strong>{delivery}</strong>.</p><p>Tracking reference: <code>{ref}</code></p>",
    "delivered": "<p>Your order has been delivered. Enjoy your groceries! 🥗</p>",
    "cancelled": "<p>Your order has been cancelled. If you paid, a refund will be processed within 5–10 business days.</p>",
    "refunded": "<p>Your refund has been processed and will appear in 3–5 business days.</p>",
}


def _smtp_options() -> dict:
    return {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "user": settings.SMTP_USER,
        "password": settings.SMTP_PASSWORD,
        "tls": settings.SMTP_PORT == 465,
        "starttls": settings.SMTP_PORT == 587,
    }


def _send(to_email: str, subject: str, html: str) -> None:
    if not settings.SMTP_USER:
        return  # not configured — skip silently
    message = em.html(subject=subject, html=html, mail_from=settings.EMAIL_FROM)
    message.send(to=to_email, smtp=_smtp_options())


def send_order_confirmation(to_email: str, order_number: str, total: str) -> None:
    _send(
        to_email,
        subject=f"Your Pantry order #{order_number} is confirmed ✅",
        html=f"""
        <h2>Order Confirmed 🎉</h2>
        <p>Thank you! Your order <strong>#{order_number}</strong> has been placed.</p>
        <p>Total: <strong>{total}</strong></p>
        <p>You'll receive updates as your order progresses.</p>
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
    subject = subject_tpl.format(num=order_number)
    body = body_tpl.format(delivery=delivery_date, ref=tracking_ref)
    _send(
        to_email,
        subject=subject,
        html=f"""
        <h2>Order #{order_number} Update</h2>
        {body}
        <p style="margin-top:24px;color:#666;font-size:12px;">
          This email was sent by Pantry. Questions? Reply to this email.
        </p>
        """,
    )


def send_password_reset(to_email: str, reset_link: str) -> None:
    _send(
        to_email,
        subject="Reset your Pantry password",
        html=f"""
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. It expires in 1 hour.</p>
        <p><a href="{reset_link}">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        """,
    )
