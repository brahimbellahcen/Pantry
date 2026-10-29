"""
Background task helpers — wraps FastAPI's BackgroundTasks so email
sending never blocks the HTTP response.
"""
from fastapi import BackgroundTasks
from app.services import email as email_svc


def enqueue_order_confirmation(bt: BackgroundTasks, to_email: str, order_number: str, total: str) -> None:
    bt.add_task(email_svc.send_order_confirmation, to_email, order_number, total)


def enqueue_status_update(
    bt: BackgroundTasks,
    to_email: str,
    order_number: str,
    status: str,
    delivery_date: str = "soon",
    tracking_ref: str = "N/A",
) -> None:
    bt.add_task(
        email_svc.send_order_status_update,
        to_email, order_number, status, delivery_date, tracking_ref,
    )


def enqueue_password_reset(bt: BackgroundTasks, to_email: str, reset_link: str) -> None:
    bt.add_task(email_svc.send_password_reset, to_email, reset_link)
