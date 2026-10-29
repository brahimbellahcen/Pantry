"""Account endpoints — invoice, notification prefs (DB-backed), recently viewed (DB-backed)."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from app.database import get_db
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.models.user_settings import UserSettings, RecentlyViewed
from app.dependencies import get_current_user
from app.routers.products import _to_list_out
from app.schemas.product import ProductListOut

router = APIRouter(prefix="/account", tags=["account"])

DEFAULT_PREFS = {
    "order_updates": True,
    "promotional": True,
    "low_stock_alerts": False,
    "weekly_digest": False,
}


# ── PDF Invoice ───────────────────────────────────────────────────────────────

@router.get("/orders/{order_id}/invoice")
def download_invoice(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    from app.services.invoice import generate_invoice
    pdf_bytes = generate_invoice(order)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="pantry-invoice-{order.order_number}.pdf"'},
    )


# ── Notification Preferences (DB-backed) ──────────────────────────────────────

class NotificationPrefs(BaseModel):
    order_updates: bool = True
    promotional: bool = True
    low_stock_alerts: bool = False
    weekly_digest: bool = False


def _get_or_create_settings(user_id: int, db: Session) -> UserSettings:
    s = db.query(UserSettings).filter_by(user_id=user_id).first()
    if not s:
        s = UserSettings(user_id=user_id, notification_prefs=DEFAULT_PREFS.copy())
        db.add(s); db.flush()
    return s


@router.get("/notifications", response_model=NotificationPrefs)
def get_notification_prefs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = _get_or_create_settings(current_user.id, db)
    db.commit()
    return NotificationPrefs(**{**DEFAULT_PREFS, **settings.notification_prefs})


@router.put("/notifications", response_model=NotificationPrefs)
def update_notification_prefs(
    payload: NotificationPrefs,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = _get_or_create_settings(current_user.id, db)
    settings.notification_prefs = payload.model_dump()
    db.commit()
    return payload


# ── Recently Viewed (DB-backed) ───────────────────────────────────────────────

@router.post("/viewed/{product_id}", status_code=204)
def track_viewed(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")

    existing = db.query(RecentlyViewed).filter_by(
        user_id=current_user.id, product_id=product_id
    ).first()
    if existing:
        existing.viewed_at = datetime.now(timezone.utc)
    else:
        # Keep max 20 — delete oldest if needed
        count = db.query(RecentlyViewed).filter_by(user_id=current_user.id).count()
        if count >= 20:
            oldest = db.query(RecentlyViewed).filter_by(user_id=current_user.id)\
                .order_by(RecentlyViewed.viewed_at.asc()).first()
            if oldest:
                db.delete(oldest)
        db.add(RecentlyViewed(user_id=current_user.id, product_id=product_id))
    db.commit()


@router.get("/viewed", response_model=list[ProductListOut])
def get_recently_viewed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(RecentlyViewed)
        .options(
            joinedload(RecentlyViewed.product).joinedload(Product.category),
            joinedload(RecentlyViewed.product).joinedload(Product.inventory),
            joinedload(RecentlyViewed.product).joinedload(Product.flash_sales),
        )
        .filter(RecentlyViewed.user_id == current_user.id)
        .order_by(RecentlyViewed.viewed_at.desc())
        .limit(20)
        .all()
    )
    return [_to_list_out(r.product) for r in rows if r.product and r.product.is_active]
