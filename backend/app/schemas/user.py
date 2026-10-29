from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
import re


class AddressBase(BaseModel):
    label: str | None = None
    line1: str
    line2: str | None = None
    city: str
    state: str | None = None
    postal_code: str
    country: str = "US"
    is_default: bool = False


class AddressCreate(AddressBase):
    pass


class AddressOut(AddressBase):
    id: int
    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str | None = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    addresses: list[AddressOut] = []
    model_config = {"from_attributes": True}


class UserOutBrief(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
