from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.coupon import CouponApply, CouponPreview
from app.services.coupon import get_coupon_or_404, validate_coupon, calculate_discount
from app.dependencies import get_current_user

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.post("/preview", response_model=CouponPreview)
def preview_coupon(
    body: CouponApply,
    subtotal: Decimal,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Preview the discount without applying it."""
    coupon = get_coupon_or_404(body.code, db)
    validate_coupon(coupon, subtotal)
    discount = calculate_discount(coupon, subtotal)
    return CouponPreview(code=coupon.code, discount_amount=discount, new_total=subtotal - discount)
