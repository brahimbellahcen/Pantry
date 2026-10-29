from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product, Inventory
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/cart", tags=["cart"])


def _get_or_create_cart(user: User, db: Session) -> Cart:
    cart = (
        db.query(Cart)
        .filter(Cart.user_id == user.id)
        .first()
    )
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _load_cart(cart_id: int, db: Session) -> Cart:
    return (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.product))
        .filter(Cart.id == cart_id)
        .first()
    )


@router.get("", response_model=CartOut)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(current_user, db)
    cart = _load_cart(cart.id, db)
    return CartOut.from_orm(cart)


@router.post("/items", response_model=CartOut, status_code=201)
def add_item(
    payload: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == payload.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Check stock
    inv: Inventory | None = product.inventory
    if inv and inv.track_inventory and inv.quantity < payload.quantity:
        raise HTTPException(400, f"Only {inv.quantity} in stock")

    cart = _get_or_create_cart(current_user, db)
    existing = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == payload.product_id).first()
    if existing:
        new_qty = existing.quantity + payload.quantity
        if inv and inv.track_inventory and inv.quantity < new_qty:
            raise HTTPException(400, f"Only {inv.quantity} in stock")
        existing.quantity = new_qty
    else:
        item = CartItem(cart_id=cart.id, product_id=payload.product_id, quantity=payload.quantity, unit_price=product.price)
        db.add(item)
    db.commit()
    return CartOut.from_orm(_load_cart(cart.id, db))


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(current_user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found")
    if payload.quantity <= 0:
        db.delete(item)
    else:
        inv: Inventory | None = item.product.inventory if item.product else None
        if inv and inv.track_inventory and inv.quantity < payload.quantity:
            raise HTTPException(400, f"Only {inv.quantity} in stock")
        item.quantity = payload.quantity
    db.commit()
    return CartOut.from_orm(_load_cart(cart.id, db))


@router.delete("/items/{item_id}", status_code=204)
def remove_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(current_user, db)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(404, "Cart item not found")
    db.delete(item)
    db.commit()


@router.delete("", status_code=204)
def clear_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart = _get_or_create_cart(current_user, db)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
