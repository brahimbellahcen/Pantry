from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from slugify import slugify
from app.database import get_db
from app.models.product import Product, Inventory
from app.models.category import Category
from app.schemas.product import ProductOut, ProductListOut, ProductPage
from app.dependencies import Paginator

router = APIRouter(prefix="/products", tags=["products"])


def _base_query(db: Session):
    return (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.inventory))
        .filter(Product.is_active == True)
    )


@router.get("", response_model=ProductPage)
def list_products(
    q: str | None = Query(None, description="Search query"),
    category: str | None = Query(None, description="Category slug"),
    featured: bool | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    pager: Paginator = Depends(),
    db: Session = Depends(get_db),
):
    query = _base_query(db)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(Product.name.ilike(like), Product.description.ilike(like))
        )
    if category:
        cat = db.query(Category).filter(Category.slug == category).first()
        if cat:
            # include subcategories
            cat_ids = [cat.id] + [c.id for c in cat.children]
            query = query.filter(Product.category_id.in_(cat_ids))
    if featured is not None:
        query = query.filter(Product.is_featured == featured)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    total = query.count()
    items = query.order_by(Product.name).offset(pager.offset).limit(pager.page_size).all()
    pages = max(1, (total + pager.page_size - 1) // pager.page_size)
    return ProductPage(items=items, total=total, page=pager.page, page_size=pager.page_size, pages=pages)


@router.get("/featured", response_model=list[ProductListOut])
def featured_products(limit: int = 8, db: Session = Depends(get_db)):
    return _base_query(db).filter(Product.is_featured == True).limit(limit).all()


@router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.inventory))
        .filter(Product.slug == slug, Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(404, "Product not found")
    return product
