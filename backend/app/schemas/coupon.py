from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator


class CouponCreate(BaseModel):
    code: str
    description: str | None = None
    discount_type: str  # percent | fixed
    discount_value: Decimal
    min_order_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    is_active: bool = True
    expires_at: datetime | None = None

    @field_validator("discount_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("percent", "fixed"):
            raise ValueError("discount_type must be 'percent' or 'fixed'")
        return v

    @field_validator("discount_value")
    @classmethod
    def validate_value(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("discount_value must be positive")
        return v


class CouponUpdate(BaseModel):
    description: str | None = None
    is_active: bool | None = None
    usage_limit: int | None = None
    expires_at: datetime | None = None


class CouponOut(BaseModel):
    id: int
    code: str
    description: str | None
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal | None
    max_discount_amount: Decimal | None
    usage_limit: int | None
    used_count: int
    is_active: bool
    expires_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


class CouponApply(BaseModel):
    code: str


class CouponPreview(BaseModel):
    code: str
    discount_amount: Decimal
    new_total: Decimal
