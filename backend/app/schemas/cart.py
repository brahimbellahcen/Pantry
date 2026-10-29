from decimal import Decimal
from pydantic import BaseModel


class CartItemBase(BaseModel):
    product_id: int
    quantity: int


class CartItemAdd(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image_url: str | None = None
    product_slug: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_item(cls, item) -> "CartItemOut":
        return cls(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name,
            product_image_url=item.product.image_url,
            product_slug=item.product.slug,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        )


class CartOut(BaseModel):
    id: int
    items: list[CartItemOut]
    subtotal: Decimal
    item_count: int
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, cart) -> "CartOut":
        items = [CartItemOut.from_orm_item(i) for i in cart.items]
        subtotal = sum(i.line_total for i in items)
        return cls(
            id=cart.id,
            items=items,
            subtotal=subtotal,
            item_count=sum(i.quantity for i in items),
        )
