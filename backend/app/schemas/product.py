from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel
from app.schemas.category import CategoryOutBrief


class InventoryOut(BaseModel):
    quantity: int
    low_stock_threshold: int
    track_inventory: bool
    model_config = {"from_attributes": True}


class InventoryUpdate(BaseModel):
    quantity: int | None = None
    low_stock_threshold: int | None = None
    track_inventory: bool | None = None


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    category_id: int
    price: Decimal
    compare_at_price: Decimal | None = None
    unit: str | None = None
    unit_quantity: Decimal | None = None
    image_url: str | None = None
    images: list[str] | None = None
    tags: list[str] | None = None
    is_active: bool = True
    is_featured: bool = False


class ProductCreate(ProductBase):
    slug: str | None = None
    initial_stock: int = 0


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: int | None = None
    price: Decimal | None = None
    compare_at_price: Decimal | None = None
    unit: str | None = None
    unit_quantity: Decimal | None = None
    image_url: str | None = None
    images: list[str] | None = None
    tags: list[str] | None = None
    is_active: bool | None = None
    is_featured: bool | None = None


class ProductOut(ProductBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime
    category: CategoryOutBrief
    inventory: InventoryOut | None = None
    model_config = {"from_attributes": True}


class ProductListOut(BaseModel):
    id: int
    name: str
    slug: str
    price: Decimal
    compare_at_price: Decimal | None = None
    image_url: str | None = None
    unit: str | None = None
    unit_quantity: Decimal | None = None
    category: CategoryOutBrief
    inventory: InventoryOut | None = None
    is_featured: bool
    model_config = {"from_attributes": True}


class ProductPage(BaseModel):
    items: list[ProductListOut]
    total: int
    page: int
    page_size: int
    pages: int
