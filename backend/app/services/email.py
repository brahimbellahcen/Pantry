"""Email service — wraps SMTP via the `emails` library. Swap with SendGrid / SES by changing send()."""
import emails as em
from app.config import get_settings

settings = get_settings()


def _smtp_options() -> dict:
    return {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "user": settings.SMTP_USER,
        "password": settings.SMTP_PASSWORD,
        "tls": settings.SMTP_PORT == 465,
        "starttls": settings.SMTP_PORT == 587,
    }


def send_order_confirmation(to_email: str, order_number: str, total: str) -> None:
    if not settings.SMTP_USER:
        return  # email not configured; skip silently in dev
    message = em.html(
        subject=f"Your Pantry order #{order_number} is confirmed",
        html=f"""
        <h2>Order Confirmed 🎉</h2>
        <p>Thank you for your order! Your order number is <strong>{order_number}</strong>.</p>
        <p>Total: <strong>{total}</strong></p>
        <p>You'll receive another email when your order ships.</p>
        """,
        mail_from=settings.EMAIL_FROM,
    )
    message.send(to=to_email, smtp=_smtp_options())


def send_password_reset(to_email: str, reset_link: str) -> None:
    if not settings.SMTP_USER:
        return
    message = em.html(
        subject="Reset your Pantry password",
        html=f"""
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. It expires in 1 hour.</p>
        <p><a href="{reset_link}">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        """,
        mail_from=settings.EMAIL_FROM,
    )
    message.send(to=to_email, smtp=_smtp_options())
