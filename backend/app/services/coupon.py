"""Coupon validation and discount calculation service."""
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.coupon import Coupon


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_coupon_or_404(code: str, db: Session) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()
    if not coupon:
        raise HTTPException(404, "Coupon code not found")
    return coupon


def validate_coupon(coupon: Coupon, subtotal: Decimal) -> None:
    """Raise 400 if the coupon cannot be applied to this subtotal."""
    if not coupon.is_active:
        raise HTTPException(400, "Coupon is inactive")
    if coupon.expires_at:
        exp = coupon.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(400, "Coupon has expired")
    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(400, "Coupon usage limit reached")
    if coupon.min_order_amount and subtotal < coupon.min_order_amount:
        raise HTTPException(
            400,
            f"Minimum order amount for this coupon is ${coupon.min_order_amount:.2f}",
        )


def calculate_discount(coupon: Coupon, subtotal: Decimal) -> Decimal:
    """Return the discount amount (never exceeds subtotal)."""
    if coupon.discount_type == "percent":
        discount = subtotal * coupon.discount_value / Decimal("100")
        if coupon.max_discount_amount:
            discount = min(discount, coupon.max_discount_amount)
    else:  # fixed
        discount = coupon.discount_value
    return min(discount, subtotal).quantize(Decimal("0.01"))


def redeem_coupon(coupon: Coupon, db: Session) -> None:
    coupon.used_count += 1
    db.add(coupon)
