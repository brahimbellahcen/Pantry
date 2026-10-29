import math
import random
import string
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import Inventory, Product
from app.models.delivery_slot import DeliverySlot
from app.services.coupon import get_coupon_or_404, validate_coupon, calculate_discount, redeem_coupon
from app.models.user import User, Address
from app.schemas.order import OrderCreate, OrderOut, OrderListOut, OrderPage, CheckoutResponse
from app.dependencies import get_current_user, Paginator
from app.services import payment as payment_svc
from app.services.background import enqueue_order_confirmation

router = APIRouter(prefix="/orders", tags=["orders"])

TAX_RATE = 0.08
SHIPPING_FREE_THRESHOLD = 50


def _generate_order_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"ORD-{suffix}"


def _resolve_address(payload: OrderCreate, user: User, db: Session) -> dict:
    if payload.shipping_address_id:
        addr = db.get(Address, payload.shipping_address_id)
        if not addr or addr.user_id != user.id:
            raise HTTPException(400, "Address not found")
        return addr.__dict__
    if payload.shipping_address:
        return payload.shipping_address.model_dump()
    # fall back to default address
    default = next((a for a in user.addresses if a.is_default), None) or (user.addresses[0] if user.addresses else None)
    if not default:
        raise HTTPException(400, "No shipping address provided")
    return {k: v for k, v in default.__dict__.items() if not k.startswith("_")}


@router.post("/checkout", response_model=CheckoutResponse, status_code=201)
def checkout(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Load cart
    cart = (
        db.query(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.inventory))
        .filter(Cart.user_id == current_user.id)
        .first()
    )
    if not cart or not cart.items:
        raise HTTPException(400, "Cart is empty")

    # Validate stock and build order items
    order_items_data = []
    subtotal = 0
    for ci in cart.items:
        p = ci.product
        if not p or not p.is_active:
            raise HTTPException(400, f"Product '{p.name if p else ci.product_id}' is no longer available")
        inv: Inventory | None = p.inventory
        if inv and inv.track_inventory and inv.quantity < ci.quantity:
            raise HTTPException(400, f"'{p.name}' only has {inv.quantity} in stock")
        line_total = float(p.price) * ci.quantity
        subtotal += line_total
        order_items_data.append({
            "product_id": p.id,
            "product_name": p.name,
            "product_image_url": p.image_url,
            "quantity": ci.quantity,
            "unit_price": p.price,
            "total_price": line_total,
        })

    tax_amount = round(subtotal * TAX_RATE, 2)
    shipping_amount = 0.0 if subtotal >= SHIPPING_FREE_THRESHOLD else 5.99

    # Apply coupon
    from decimal import Decimal
    discount_amount = Decimal("0")
    coupon = None
    if payload.coupon_code:
        coupon = get_coupon_or_404(payload.coupon_code, db)
        validate_coupon(coupon, Decimal(str(round(subtotal, 2))))
        discount_amount = calculate_discount(coupon, Decimal(str(round(subtotal, 2))))

    total = subtotal + tax_amount + shipping_amount - float(discount_amount)

    # Validate delivery slot
    delivery_slot_id = None
    if payload.delivery_slot_id:
        slot = db.get(DeliverySlot, payload.delivery_slot_id)
        if not slot or not slot.is_active:
            raise HTTPException(400, "Delivery slot not available")
        if slot.available <= 0:
            raise HTTPException(400, "Delivery slot is fully booked")
        delivery_slot_id = slot.id

    shipping_addr = _resolve_address(payload, current_user, db)
    billing_addr = shipping_addr if payload.billing_same_as_shipping else (
        payload.billing_address.model_dump() if payload.billing_address else shipping_addr
    )

    order = Order(
        order_number=_generate_order_number(),
        user_id=current_user.id,
        status="pending",
        subtotal=round(subtotal, 2),
        tax_amount=tax_amount,
        shipping_amount=shipping_amount,
        discount_amount=float(discount_amount),
        total=round(total, 2),
        shipping_address=shipping_addr,
        billing_address=billing_addr,
        notes=payload.notes,
        payment_status="unpaid",
        estimated_delivery=date.today() + timedelta(days=3),
        delivery_slot_id=delivery_slot_id,
    )
    db.add(order)
    db.flush()  # get order.id

    for item_data in order_items_data:
        db.add(OrderItem(order_id=order.id, **item_data))

    # Deduct inventory
    for ci in cart.items:
        inv = ci.product.inventory if ci.product else None
        if inv and inv.track_inventory:
            inv.quantity = max(0, inv.quantity - ci.quantity)

    # Redeem coupon
    if coupon:
        redeem_coupon(coupon, db)

    # Book delivery slot
    if delivery_slot_id:
        slot = db.get(DeliverySlot, delivery_slot_id)
        if slot:
            slot.booked_count += 1

    # Clear cart
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(order)

    # Process payment (COD/bank transfer work with no keys)
    payment_info = payment_svc.process_payment(
        method=payload.payment_method,
        amount=order.total,
        order_number=order.order_number,
        order_id=order.id,
    )
    order.payment_provider = payment_info["method"]
    db.commit()
    db.refresh(order)

    # Send confirmation email via background task (non-blocking)
    enqueue_order_confirmation(background_tasks, current_user.email, order.order_number, f"${order.total:.2f}")

    return CheckoutResponse(
        order=order,
        payment_url=payment_info.get("redirect_url"),
    )


@router.get("", response_model=OrderPage)
def list_orders(
    pager: Paginator = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(Order.user_id == current_user.id)
    total = q.count()
    items = q.order_by(Order.created_at.desc()).offset(pager.offset).limit(pager.page_size).all()
    # Attach item_count
    for order in items:
        object.__setattr__(order, "_item_count", len(order.items))
    pages = max(1, math.ceil(total / pager.page_size))
    out_items = [
        OrderListOut(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            payment_status=o.payment_status,
            total=o.total,
            created_at=o.created_at,
            item_count=len(o.items),
        )
        for o in items
    ]
    return OrderPage(items=out_items, total=total, page=pager.page, page_size=pager.page_size, pages=pages)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    return order
