from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Address
from app.models.cart import Cart, CartItem
from app.models.wishlist import WishlistItem
from app.schemas.user import UserOut, UserUpdate, AddressCreate, AddressOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# --- Addresses ---

@router.get("/me/addresses", response_model=list[AddressOut])
def list_addresses(current_user: User = Depends(get_current_user)):
    return current_user.addresses


@router.post("/me/addresses", response_model=AddressOut, status_code=201)
def add_address(
    payload: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.is_default:
        # unset existing defaults
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})
    addr = Address(**payload.model_dump(), user_id=current_user.id)
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/me/addresses/{address_id}", status_code=204)
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.get(Address, address_id)
    if not addr or addr.user_id != current_user.id:
        raise HTTPException(404, "Address not found")
    db.delete(addr)
    db.commit()


# ── GDPR — account deletion ───────────────────────────────────────────────────

@router.delete("/me", status_code=204)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the authenticated user's account and all associated data.
    Orders are anonymised (user_id set to NULL) rather than deleted to preserve
    financial records. All other personal data is removed.
    """
    from app.models.order import Order
    from app.models.review import Review
    from app.models.wishlist import WishlistItem
    from app.models.cart import Cart
    from app.models.password_reset import PasswordResetToken

    # Anonymise orders (keep for accounting)
    db.query(Order).filter(Order.user_id == current_user.id).update({"user_id": None})

    # Hard-delete everything else
    for model in [PasswordResetToken, WishlistItem, Review]:
        db.query(model).filter(model.user_id == current_user.id).delete()

    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.delete(cart)

    db.delete(current_user)
    db.commit()
