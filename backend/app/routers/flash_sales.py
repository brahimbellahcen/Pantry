"""Flash sales router — active sales with countdown."""
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.flash_sale import FlashSale
from app.models.product import Product

router = APIRouter(prefix="/flash-sales", tags=["flash-sales"])


class FlashSaleOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    product_image_url: str | None
    original_price: Decimal
    sale_price: Decimal
    discount_type: str
    discount_value: Decimal
    ends_at: datetime
    seconds_remaining: int
    max_quantity: int | None
    sold_count: int
    model_config = {"from_attributes": True}


def _active_sales(db: Session):
    now = datetime.now(timezone.utc)
    return db.query(FlashSale).filter(
        FlashSale.is_active == True,
        FlashSale.starts_at <= now,
        FlashSale.ends_at > now,
    ).all()


@router.get("", response_model=list[FlashSaleOut])
def list_flash_sales(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    sales = _active_sales(db)
    result = []
    for s in sales:
        p = s.product
        if not p or not p.is_active:
            continue
        ends = s.ends_at
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        result.append(FlashSaleOut(
            id=s.id, product_id=p.id, product_name=p.name,
            product_slug=p.slug, product_image_url=p.image_url,
            original_price=p.price, sale_price=s.sale_price(p.price),
            discount_type=s.discount_type, discount_value=s.discount_value,
            ends_at=ends, seconds_remaining=max(0, int((ends - now).total_seconds())),
            max_quantity=s.max_quantity, sold_count=s.sold_count,
        ))
    return result
