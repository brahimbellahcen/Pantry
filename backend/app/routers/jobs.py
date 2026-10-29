"""
Background jobs — call these endpoints from a cron service (free options below).

Free cron services:
  • cron-job.org   — free, 1-minute intervals
  • EasyCron        — free tier available

Set up a job to call POST /api/v1/jobs/process-subscriptions every day at 08:00.
Set up a job to call POST /api/v1/jobs/low-stock-alert every day at 09:00.

Protect with a shared CRON_SECRET env var.
"""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/jobs", tags=["jobs"])


def _verify_cron(x_cron_secret: str | None = Header(None)):
    secret = getattr(settings, "CRON_SECRET", "")
    if secret and x_cron_secret != secret:
        raise HTTPException(401, "Unauthorized")


@router.post("/low-stock-alert")
def low_stock_alert(db: Session = Depends(get_db), _: None = Depends(_verify_cron)):
    """Email admin users about products below their low-stock threshold."""
    from app.models.product import Product, Inventory
    from app.models.user import User
    from app.services.email import _send

    low = (
        db.query(Product)
        .join(Inventory, Inventory.product_id == Product.id)
        .filter(
            Product.is_active == True,
            Inventory.track_inventory == True,
            Inventory.quantity <= Inventory.low_stock_threshold,
        )
        .all()
    )
    if not low:
        return {"alerted": 0}

    rows = "".join(
        f"<tr><td style='padding:4px 8px'>{p.name}</td>"
        f"<td style='padding:4px 8px;color:{'#dc2626' if (p.inventory.quantity == 0) else '#d97706'}'>"
        f"{p.inventory.quantity} left</td></tr>"
        for p in low
    )
    html = f"""
    <h3>⚠️ Low Stock Alert — {len(low)} product(s) need restocking</h3>
    <table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      <tr style="background:#f3f4f6"><th style="padding:4px 8px">Product</th><th style="padding:4px 8px">Stock</th></tr>
      {rows}
    </table>
    <p><a href="{settings.APP_CORS_ORIGINS.split(',')[0]}/admin/inventory">View Inventory →</a></p>
    """
    admins = db.query(User).filter(User.is_admin == True, User.is_active == True).all()
    for admin in admins:
        _send(admin.email, f"⚠️ Pantry: {len(low)} low-stock products", html)

    return {"alerted": len(low), "notified_admins": len(admins)}


@router.post("/process-subscriptions")
def process_subscriptions(db: Session = Depends(get_db), _: None = Depends(_verify_cron)):
    """Create orders for active subscriptions due today."""
    from app.models.subscription import Subscription, SubscriptionItem
    from app.models.cart import Cart, CartItem
    from app.models.product import Product
    from app.models.user import User
    from app.routers.orders import _generate_order_number, TAX_RATE, SHIPPING_FREE_THRESHOLD
    from app.models.order import Order, OrderItem
    from app.services.loyalty import earn_points
    import random, string
    from decimal import Decimal

    today = date.today()
    due = db.query(Subscription).options(
        joinedload(Subscription.items).joinedload(SubscriptionItem.product)
    ).filter(
        Subscription.status == "active",
        Subscription.next_order_date <= today,
    ).all()

    created = 0
    FREQ_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}

    for sub in due:
        if not sub.items:
            continue
        subtotal = sum(
            float(i.product.price) * i.quantity
            for i in sub.items if i.product and i.product.is_active
        )
        if subtotal == 0:
            continue

        tax = round(subtotal * TAX_RATE, 2)
        shipping = 0.0 if subtotal >= SHIPPING_FREE_THRESHOLD else 5.99
        total = subtotal + tax + shipping

        order = Order(
            order_number=_generate_order_number(),
            user_id=sub.user_id,
            status="confirmed",
            subtotal=round(subtotal, 2),
            tax_amount=tax,
            shipping_amount=shipping,
            total=round(total, 2),
            payment_status="unpaid",
            notes=f"Auto-generated from subscription #{sub.id} ({sub.frequency})",
        )
        db.add(order)
        db.flush()
        for item in sub.items:
            if item.product and item.product.is_active:
                db.add(OrderItem(
                    order_id=order.id, product_id=item.product_id,
                    product_name=item.product.name,
                    product_image_url=item.product.image_url,
                    quantity=item.quantity,
                    unit_price=item.product.price,
                    total_price=float(item.product.price) * item.quantity,
                ))
        earn_points(sub.user_id, order.id, Decimal(str(round(total, 2))), db)
        days = FREQ_DAYS.get(sub.frequency, 7)
        sub.next_order_date = today + timedelta(days=days)
        created += 1

    db.commit()
    return {"subscriptions_processed": len(due), "orders_created": created}
