"""Product recommendations — related, trending, and personalised."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.product import ProductListOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _to_list(products: list[Product]) -> list[ProductListOut]:
    from app.routers.products import _to_list_out
    return [_to_list_out(p) for p in products]


def _load_products(ids: list[int], db: Session) -> list[Product]:
    if not ids:
        return []
    return (
        db.query(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.inventory),
            joinedload(Product.flash_sales),
        )
        .filter(Product.id.in_(ids), Product.is_active == True)
        .all()
    )


@router.get("/products/{product_id}", response_model=list[ProductListOut])
def related_products(product_id: int, limit: int = 6, db: Session = Depends(get_db)):
    """Same-category products, prioritising featured ones."""
    product = db.get(Product, product_id)
    if not product:
        return []
    prods = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.inventory), joinedload(Product.flash_sales))
        .filter(
            Product.category_id == product.category_id,
            Product.id != product_id,
            Product.is_active == True,
        )
        .order_by(Product.is_featured.desc(), Product.name)
        .limit(limit)
        .all()
    )
    return _to_list(prods)


@router.get("/trending", response_model=list[ProductListOut])
def trending_products(limit: int = 8, db: Session = Depends(get_db)):
    """Top products by order volume in the last 30 days."""
    from sqlalchemy import func
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(days=30)
    top = (
        db.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("qty"))
        .join(Order)
        .filter(Order.created_at >= since)
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    if not top:
        return _to_list(
            db.query(Product)
            .options(joinedload(Product.category), joinedload(Product.inventory), joinedload(Product.flash_sales))
            .filter(Product.is_active == True, Product.is_featured == True)
            .limit(limit).all()
        )
    id_rank = {pid: i for i, (pid, _) in enumerate(top)}
    products = _load_products([r[0] for r in top], db)
    return _to_list(sorted(products, key=lambda p: id_rank.get(p.id, 999)))


@router.get("/for-you", response_model=list[ProductListOut])
def personalised(
    limit: int = 8,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    @ai — Personalised recommendations:
    1. Find categories from user's past orders
    2. Recommend unseen products from those categories
    3. Fall back to trending if no order history
    """
    from sqlalchemy import func

    # Categories from past orders
    bought_cat_ids = (
        db.query(Product.category_id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.user_id == current_user.id)
        .distinct()
        .all()
    )
    bought_cat_ids = [r[0] for r in bought_cat_ids]

    # Product IDs already bought
    bought_product_ids = (
        db.query(OrderItem.product_id)
        .join(Order)
        .filter(Order.user_id == current_user.id)
        .distinct()
        .all()
    )
    bought_product_ids = {r[0] for r in bought_product_ids}

    if not bought_cat_ids:
        # No history — return trending
        return trending_products(limit, db)

    # Unseen products from familiar categories, ranked by popularity
    top = (
        db.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("qty"))
        .join(Order)
        .join(Product, Product.id == OrderItem.product_id)
        .filter(
            Product.category_id.in_(bought_cat_ids),
            Product.is_active == True,
            OrderItem.product_id.notin_(bought_product_ids),
        )
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )

    if not top:
        # Same categories, unseen, sorted by name
        prods = (
            db.query(Product)
            .options(joinedload(Product.category), joinedload(Product.inventory), joinedload(Product.flash_sales))
            .filter(
                Product.category_id.in_(bought_cat_ids),
                Product.id.notin_(bought_product_ids),
                Product.is_active == True,
            )
            .order_by(Product.is_featured.desc())
            .limit(limit)
            .all()
        )
        return _to_list(prods)

    id_rank = {pid: i for i, (pid, _) in enumerate(top)}
    products = _load_products([r[0] for r in top], db)
    return _to_list(sorted(products, key=lambda p: id_rank.get(p.id, 999)))

