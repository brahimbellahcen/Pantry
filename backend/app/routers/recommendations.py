"""Product recommendations and search autocomplete."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.schemas.product import ProductListOut

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/products/{product_id}", response_model=list[ProductListOut])
def related_products(
    product_id: int,
    limit: int = 6,
    db: Session = Depends(get_db),
):
    """Return products from the same category, excluding the current one."""
    product = db.get(Product, product_id)
    if not product:
        return []
    return (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.inventory))
        .filter(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.is_active == True,
        )
        .order_by(Product.is_featured.desc(), Product.name)
        .limit(limit)
        .all()
    )


@router.get("/trending", response_model=list[ProductListOut])
def trending_products(limit: int = 8, db: Session = Depends(get_db)):
    """Top products by order volume in the last 30 days."""
    from sqlalchemy import func
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(days=30)
    top_ids = (
        db.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("qty"))
        .join(Order)
        .filter(Order.created_at >= since)
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    if not top_ids:
        # Fall back to featured
        return (
            db.query(Product)
            .options(joinedload(Product.category), joinedload(Product.inventory))
            .filter(Product.is_active == True, Product.is_featured == True)
            .limit(limit).all()
        )
    id_order = {pid: i for i, (pid, _) in enumerate(top_ids)}
    products = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.inventory))
        .filter(Product.id.in_([r[0] for r in top_ids]), Product.is_active == True)
        .all()
    )
    return sorted(products, key=lambda p: id_order.get(p.id, 999))
