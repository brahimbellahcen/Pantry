"""Subscription (recurring orders) router."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from app.database import get_db
from app.models.subscription import Subscription, SubscriptionItem
from app.models.product import Product
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

FREQUENCY_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}


class SubscriptionItemIn(BaseModel):
    product_id: int
    quantity: int = 1


class SubscriptionCreate(BaseModel):
    frequency: str
    items: list[SubscriptionItemIn]
    shipping_address_id: int | None = None


class SubscriptionItemOut(BaseModel):
    id: int; product_id: int; product_name: str; quantity: int
    model_config = {"from_attributes": True}


class SubscriptionOut(BaseModel):
    id: int; frequency: str; status: str
    next_order_date: date | None
    items: list[SubscriptionItemOut]
    model_config = {"from_attributes": True}


@router.get("", response_model=list[SubscriptionOut])
def list_subscriptions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subs = db.query(Subscription).options(
        joinedload(Subscription.items).joinedload(SubscriptionItem.product)
    ).filter(Subscription.user_id == current_user.id, Subscription.status != "cancelled").all()
    result = []
    for s in subs:
        items = [SubscriptionItemOut(
            id=i.id, product_id=i.product_id,
            product_name=i.product.name if i.product else str(i.product_id),
            quantity=i.quantity,
        ) for i in s.items]
        result.append(SubscriptionOut(id=s.id, frequency=s.frequency, status=s.status,
                                      next_order_date=s.next_order_date, items=items))
    return result


@router.post("", response_model=SubscriptionOut, status_code=201)
def create_subscription(
    payload: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.frequency not in FREQUENCY_DAYS:
        raise HTTPException(400, f"frequency must be one of: {', '.join(FREQUENCY_DAYS)}")
    if not payload.items:
        raise HTTPException(400, "Subscription must have at least one item")

    days = FREQUENCY_DAYS[payload.frequency]
    sub = Subscription(
        user_id=current_user.id,
        frequency=payload.frequency,
        shipping_address_id=payload.shipping_address_id,
        next_order_date=date.today() + timedelta(days=days),
    )
    db.add(sub)
    db.flush()

    items_out = []
    for item in payload.items:
        p = db.get(Product, item.product_id)
        if not p or not p.is_active:
            raise HTTPException(400, f"Product {item.product_id} not found")
        db.add(SubscriptionItem(subscription_id=sub.id, product_id=item.product_id, quantity=item.quantity))
        items_out.append(SubscriptionItemOut(id=0, product_id=item.product_id,
                                             product_name=p.name, quantity=item.quantity))
    db.commit()
    return SubscriptionOut(id=sub.id, frequency=sub.frequency, status=sub.status,
                           next_order_date=sub.next_order_date, items=items_out)


@router.patch("/{sub_id}/status")
def update_status(
    sub_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if status not in ("active", "paused", "cancelled"):
        raise HTTPException(400, "status must be active, paused, or cancelled")
    sub = db.query(Subscription).filter_by(id=sub_id, user_id=current_user.id).first()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.status = status
    db.commit()
    return {"status": sub.status}
