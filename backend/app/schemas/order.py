from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel


class AddressSnapshotIn(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    state: str | None = None
    postal_code: str
    country: str = "US"


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None
    product_name: str
    product_image_url: str | None
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    shipping_address_id: int | None = None
    shipping_address: AddressSnapshotIn | None = None
    billing_same_as_shipping: bool = True
    billing_address: AddressSnapshotIn | None = None
    notes: str | None = None
    payment_method: str = "stripe"
    coupon_code: str | None = None
    delivery_slot_id: int | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderOut(BaseModel):
    id: int
    order_number: str
    status: str
    payment_status: str
    subtotal: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    shipping_address: dict | None
    notes: str | None
    estimated_delivery: date | None
    delivered_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]
    model_config = {"from_attributes": True}


class OrderListOut(BaseModel):
    id: int
    order_number: str
    status: str
    payment_status: str
    total: Decimal
    created_at: datetime
    item_count: int
    model_config = {"from_attributes": True}


class CheckoutResponse(BaseModel):
    order: OrderOut
    payment_url: str | None = None
    client_secret: str | None = None
    stripe_session_url: str | None = None  # hosted Stripe Checkout URL


class OrderPage(BaseModel):
    items: list[OrderListOut]
    total: int
    page: int
    page_size: int
    pages: int
