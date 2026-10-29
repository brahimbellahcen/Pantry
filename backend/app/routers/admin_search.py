"""Global admin search across products, orders, users, and categories."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Any
from app.database import get_db
from app.models.product import Product
from app.models.order import Order
from app.models.user import User
from app.models.category import Category
from app.dependencies import require_admin

router = APIRouter(prefix="/admin/search", tags=["admin"])


class SearchResult(BaseModel):
    type: str
    id: int
    title: str
    subtitle: str
    url: str


@router.get("", response_model=list[SearchResult])
def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Search across products, orders, users and categories."""
    like = f"%{q}%"
    results: list[SearchResult] = []

    # Products
    for p in db.query(Product).filter(
        or_(Product.name.ilike(like), Product.slug.ilike(like))
    ).limit(5).all():
        results.append(SearchResult(type="product", id=p.id,
            title=p.name, subtitle=f"${p.price}", url=f"/admin/products"))

    # Orders
    for o in db.query(Order).filter(Order.order_number.ilike(like)).limit(5).all():
        results.append(SearchResult(type="order", id=o.id,
            title=o.order_number, subtitle=f"${o.total} — {o.status}", url=f"/admin/orders"))

    # Users
    for u in db.query(User).filter(
        or_(User.email.ilike(like), User.full_name.ilike(like))
    ).limit(5).all():
        results.append(SearchResult(type="user", id=u.id,
            title=u.full_name, subtitle=u.email, url=f"/admin/users"))

    # Categories
    for c in db.query(Category).filter(
        or_(Category.name.ilike(like), Category.slug.ilike(like))
    ).limit(3).all():
        results.append(SearchResult(type="category", id=c.id,
            title=c.name, subtitle=f"/{c.slug}", url=f"/admin/categories"))

    return results
