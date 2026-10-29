"""Admin router — all endpoints require is_admin."""
import math
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from slugify import slugify
from app.database import get_db
from app.models.product import Product, Inventory
from app.models.category import Category
from app.models.order import Order
from app.models.user import User
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate, InventoryUpdate
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.schemas.order import OrderOut, OrderStatusUpdate, OrderPage
from app.schemas.user import UserOut
from app.dependencies import require_admin, Paginator

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ORDER_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"}


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products", response_model=list[ProductOut])
def admin_list_products(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Product).options(joinedload(Product.category), joinedload(Product.inventory))
    if not include_inactive:
        q = q.filter(Product.is_active == True)
    return q.order_by(Product.name).all()


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if not db.get(Category, payload.category_id):
        raise HTTPException(400, "Category not found")
    slug = payload.slug or slugify(payload.name)
    if db.query(Product).filter(Product.slug == slug).first():
        slug = f"{slug}-{Product.id}"  # disambiguate
    product = Product(
        **payload.model_dump(exclude={"slug", "initial_stock"}),
        slug=slug,
    )
    db.add(product)
    db.flush()
    db.add(Inventory(product_id=product.id, quantity=payload.initial_stock))
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_active = False  # soft delete
    db.commit()


@router.patch("/products/{product_id}/inventory", response_model=dict)
def update_inventory(
    product_id: int,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        raise HTTPException(404, "Inventory record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    return {"quantity": inv.quantity, "low_stock_threshold": inv.low_stock_threshold}


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
def admin_list_categories(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(Category).order_by(Category.sort_order).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    slug = payload.slug or slugify(payload.name)
    if db.query(Category).filter(Category.slug == slug).first():
        raise HTTPException(400, f"Slug '{slug}' already exists")
    cat = Category(**payload.model_dump(exclude={"slug"}), slug=slug)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    cat.is_active = False
    db.commit()


# ── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=OrderPage)
def admin_list_orders(
    status: str | None = None,
    pager: Paginator = Depends(),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = db.query(Order).options(joinedload(Order.items))
    if status:
        q = q.filter(Order.status == status)
    total = q.count()
    items = q.order_by(Order.created_at.desc()).offset(pager.offset).limit(pager.page_size).all()
    from app.schemas.order import OrderListOut
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
    pages = max(1, math.ceil(total / pager.page_size))
    return OrderPage(items=out_items, total=total, page=pager.page, page_size=pager.page_size, pages=pages)


@router.get("/orders/{order_id}", response_model=OrderOut)
def admin_get_order(
    order_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if payload.status not in VALID_ORDER_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(VALID_ORDER_STATUSES)}")
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = payload.status
    if payload.status == "delivered":
        from datetime import datetime, timezone
        order.delivered_at = datetime.now(timezone.utc)
        order.payment_status = "paid"
    db.commit()
    db.refresh(order)
    # Non-blocking email via background task
    from app.services.background import enqueue_status_update
    delivery_date = str(order.estimated_delivery) if order.estimated_delivery else "soon"
    enqueue_status_update(
        background_tasks, order.user.email, order.order_number,
        order.status, delivery_date=delivery_date,
        tracking_ref=order.payment_reference or "N/A",
    )
    return order


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def admin_list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


# ── Dashboard stats ───────────────────────────────────────────────────────────

@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from sqlalchemy import func
    total_orders = db.query(func.count(Order.id)).scalar()
    total_revenue = db.query(func.sum(Order.total)).filter(Order.payment_status == "paid").scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    total_users = db.query(func.count(User.id)).filter(User.is_admin == False).scalar()
    pending_orders = db.query(func.count(Order.id)).filter(Order.status == "pending").scalar()
    from app.models.product import Inventory
    low_stock = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.track_inventory == True, Inventory.quantity <= Inventory.low_stock_threshold)
        .scalar()
    )
    return {
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "total_products": total_products,
        "total_customers": total_users,
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
    }


# ── Coupons ───────────────────────────────────────────────────────────────────

from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponOut


@router.get("/coupons", response_model=list[CouponOut])
def admin_list_coupons(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("/coupons", response_model=CouponOut, status_code=201)
def admin_create_coupon(
    payload: CouponCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if db.query(Coupon).filter(Coupon.code == payload.code.upper()).first():
        raise HTTPException(400, "Coupon code already exists")
    coupon = Coupon(**{**payload.model_dump(), "code": payload.code.upper()})
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.patch("/coupons/{coupon_id}", response_model=CouponOut)
def admin_update_coupon(
    coupon_id: int,
    payload: CouponUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    coupon = db.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/coupons/{coupon_id}", status_code=204)
def admin_delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    coupon = db.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    coupon.is_active = False
    db.commit()


# ── Reviews (moderation) ──────────────────────────────────────────────────────

from app.models.review import Review
from app.schemas.review import ReviewOut


@router.get("/reviews", response_model=list[ReviewOut])
def admin_list_reviews(
    status: str = "pending",
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    rows = db.query(Review).filter(Review.status == status).order_by(Review.created_at.desc()).all()
    return [ReviewOut(
        id=r.id, product_id=r.product_id, user_id=r.user_id,
        author_name=r.user.full_name, rating=r.rating, title=r.title,
        body=r.body, is_verified_purchase=r.is_verified_purchase,
        status=r.status, created_at=r.created_at,
    ) for r in rows]


@router.patch("/reviews/{review_id}/moderate")
def moderate_review(
    review_id: int,
    action: str,  # "approve" | "reject"
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    review.status = "approved" if action == "approve" else "rejected"
    db.commit()
    return {"status": review.status}


# ── Delivery Slots ────────────────────────────────────────────────────────────

from app.models.delivery_slot import DeliverySlot
from app.schemas.delivery_slot import DeliverySlotCreate, DeliverySlotOut


@router.get("/delivery-slots", response_model=list[DeliverySlotOut])
def admin_list_slots(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return [
        DeliverySlotOut(
            id=s.id, date=s.date, time_window=s.time_window,
            capacity=s.capacity, booked_count=s.booked_count,
            available=s.available, is_active=s.is_active,
        )
        for s in db.query(DeliverySlot).order_by(DeliverySlot.date, DeliverySlot.time_window).all()
    ]


@router.post("/delivery-slots", response_model=DeliverySlotOut, status_code=201)
def admin_create_slot(
    payload: DeliverySlotCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    slot = DeliverySlot(**payload.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return DeliverySlotOut(
        id=slot.id, date=slot.date, time_window=slot.time_window,
        capacity=slot.capacity, booked_count=slot.booked_count,
        available=slot.available, is_active=slot.is_active,
    )


@router.delete("/delivery-slots/{slot_id}", status_code=204)
def admin_delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    slot = db.get(DeliverySlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    slot.is_active = False
    db.commit()


# ── Return requests ───────────────────────────────────────────────────────────

from app.models.return_request import ReturnRequest
from app.schemas.return_request import ReturnOut, ReturnResolve


@router.get("/returns", response_model=list[ReturnOut])
def admin_list_returns(
    status: str = "pending",
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(ReturnRequest).filter(ReturnRequest.status == status)\
        .order_by(ReturnRequest.created_at.desc()).all()


@router.patch("/returns/{return_id}/resolve", response_model=ReturnOut)
def admin_resolve_return(
    return_id: int,
    payload: ReturnResolve,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(400, "status must be 'approved' or 'rejected'")
    req = db.get(ReturnRequest, return_id)
    if not req:
        raise HTTPException(404, "Return request not found")
    req.status = payload.status
    req.resolution_note = payload.resolution_note
    from datetime import datetime, timezone
    req.resolved_at = datetime.now(timezone.utc)
    # If approved, mark order as refunded
    if payload.status == "approved":
        order = db.get(Order, req.order_id)
        if order:
            order.status = "refunded"
            order.payment_status = "refunded"
    db.commit()
    db.refresh(req)
    return req


# ── Flash Sales ───────────────────────────────────────────────────────────────

from app.models.flash_sale import FlashSale
from app.routers.flash_sales import FlashSaleOut
from pydantic import BaseModel as _BM
from datetime import datetime as _dt


class FlashSaleCreate(_BM):
    product_id: int
    discount_type: str
    discount_value: float
    starts_at: _dt
    ends_at: _dt
    max_quantity: int | None = None


@router.get("/flash-sales", response_model=list[FlashSaleOut])
def admin_list_flash_sales(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from datetime import timezone as _tz
    sales = db.query(FlashSale).order_by(FlashSale.ends_at.desc()).all()
    result = []
    now = _dt.now(_tz.utc)
    for s in sales:
        p = s.product
        if not p:
            continue
        ends = s.ends_at
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=_tz.utc)
        result.append(FlashSaleOut(
            id=s.id, product_id=p.id, product_name=p.name,
            product_slug=p.slug, product_image_url=p.image_url,
            original_price=p.price, sale_price=s.sale_price(p.price),
            discount_type=s.discount_type, discount_value=s.discount_value,
            ends_at=ends, seconds_remaining=max(0, int((ends - now).total_seconds())),
            max_quantity=s.max_quantity, sold_count=s.sold_count,
        ))
    return result


@router.post("/flash-sales", status_code=201)
def admin_create_flash_sale(
    payload: FlashSaleCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if payload.discount_type not in ("percent", "fixed"):
        raise HTTPException(400, "discount_type must be 'percent' or 'fixed'")
    if not db.get(Product, payload.product_id):
        raise HTTPException(404, "Product not found")
    sale = FlashSale(**payload.model_dump())
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return {"id": sale.id, "detail": "Flash sale created"}


@router.delete("/flash-sales/{sale_id}", status_code=204)
def admin_end_flash_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    sale = db.get(FlashSale, sale_id)
    if not sale:
        raise HTTPException(404, "Flash sale not found")
    sale.is_active = False
    db.commit()


# ── Product Variants ──────────────────────────────────────────────────────────

from app.models.product_variant import ProductVariant


class VariantCreate(_BM):
    name: str
    sku: str | None = None
    price_modifier: float = 0
    stock: int = 0
    sort_order: int = 0


class VariantOut(_BM):
    id: int; name: str; sku: str | None; price_modifier: float
    stock: int; is_active: bool; sort_order: int
    model_config = {"from_attributes": True}


@router.get("/products/{product_id}/variants", response_model=list[VariantOut])
def list_variants(
    product_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(ProductVariant).filter_by(product_id=product_id).all()


@router.post("/products/{product_id}/variants", response_model=VariantOut, status_code=201)
def create_variant(
    product_id: int,
    payload: VariantCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    v = ProductVariant(product_id=product_id, **payload.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return v


@router.delete("/products/{product_id}/variants/{variant_id}", status_code=204)
def delete_variant(
    product_id: int, variant_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    v = db.query(ProductVariant).filter_by(id=variant_id, product_id=product_id).first()
    if not v:
        raise HTTPException(404, "Variant not found")
    v.is_active = False
    db.commit()


# ── Loyalty overview (admin) ──────────────────────────────────────────────────

@router.get("/loyalty/stats")
def loyalty_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from sqlalchemy import func
    from app.models.loyalty import LoyaltyAccount
    total_issued = db.query(func.sum(LoyaltyAccount.lifetime_earned)).scalar() or 0
    total_outstanding = db.query(func.sum(LoyaltyAccount.balance)).scalar() or 0
    return {
        "total_points_issued": total_issued,
        "total_points_outstanding": total_outstanding,
        "estimated_liability_usd": float(total_outstanding) * 0.01,
    }
