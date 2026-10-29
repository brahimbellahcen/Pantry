"""Search autocomplete — fast prefix matching."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.product import Product
from app.models.category import Category

router = APIRouter(prefix="/autocomplete", tags=["autocomplete"])


@router.get("")
def autocomplete(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = 8,
    db: Session = Depends(get_db),
):
    """Return product name + category suggestions matching a prefix."""
    like = f"{q.lower()}%"
    products = (
        db.query(Product.id, Product.name, Product.slug)
        .filter(func.lower(Product.name).like(like), Product.is_active == True)
        .order_by(Product.name)
        .limit(limit)
        .all()
    )
    categories = (
        db.query(Category.id, Category.name, Category.slug)
        .filter(func.lower(Category.name).like(like), Category.is_active == True)
        .limit(4)
        .all()
    )
    return {
        "products": [{"id": p.id, "name": p.name, "slug": p.slug, "type": "product"} for p in products],
        "categories": [{"id": c.id, "name": c.name, "slug": c.slug, "type": "category"} for c in categories],
    }
