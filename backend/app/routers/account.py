"""Invoice download + notification preferences + recently viewed."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["account"])


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


# ── Notification Preferences ──────────────────────────────────────────────────

class NotificationPrefs(BaseModel):
    order_updates: bool = True
    promotional: bool = True
    low_stock_alerts: bool = False
    weekly_digest: bool = False


# Store in user's metadata (simple JSON approach — extend with a DB table if needed)
_prefs_store: dict[int, dict] = {}   # in-memory; replace with DB for production


@router.get("/notifications", response_model=NotificationPrefs)
def get_notification_prefs(current_user: User = Depends(get_current_user)):
    prefs = _prefs_store.get(current_user.id, {})
    return NotificationPrefs(**prefs)


@router.put("/notifications", response_model=NotificationPrefs)
def update_notification_prefs(
    payload: NotificationPrefs,
    current_user: User = Depends(get_current_user),
):
    _prefs_store[current_user.id] = payload.model_dump()
    return payload


# ── Recently Viewed ───────────────────────────────────────────────────────────

from app.models.product import Product
from app.schemas.product import ProductListOut
from app.routers.products import _to_list_out

_recently_viewed: dict[int, list[int]] = {}   # user_id → [product_id, ...]


@router.post("/viewed/{product_id}", status_code=204)
def track_viewed(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    seen = _recently_viewed.setdefault(current_user.id, [])
    if product_id in seen:
        seen.remove(product_id)
    seen.insert(0, product_id)
    _recently_viewed[current_user.id] = seen[:20]   # keep last 20


@router.get("/viewed", response_model=list[ProductListOut])
def get_recently_viewed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ids = _recently_viewed.get(current_user.id, [])
    if not ids:
        return []
    from sqlalchemy.orm import joinedload as jl
    products = (
        db.query(Product)
        .options(jl(Product.category), jl(Product.inventory), jl(Product.flash_sales))
        .filter(Product.id.in_(ids), Product.is_active == True)
        .all()
    )
    # Preserve view order
    prod_map = {p.id: p for p in products}
    return [_to_list_out(prod_map[i]) for i in ids if i in prod_map]
