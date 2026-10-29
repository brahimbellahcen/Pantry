from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.wishlist import WishlistItem
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductListOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ProductListOut])
def get_wishlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WishlistItem).options(
        joinedload(WishlistItem.product).joinedload(Product.category),
        joinedload(WishlistItem.product).joinedload(Product.inventory),
    ).filter(WishlistItem.user_id == current_user.id).all()
    return [item.product for item in items]


@router.post("/{product_id}", status_code=201)
def add_to_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    if db.query(WishlistItem).filter_by(user_id=current_user.id, product_id=product_id).first():
        return {"detail": "Already in wishlist"}
    db.add(WishlistItem(user_id=current_user.id, product_id=product_id))
    db.commit()
    return {"detail": "Added to wishlist"}


@router.delete("/{product_id}", status_code=204)
def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(WishlistItem).filter_by(user_id=current_user.id, product_id=product_id).first()
    if not item:
        raise HTTPException(404, "Not in wishlist")
    db.delete(item)
    db.commit()
