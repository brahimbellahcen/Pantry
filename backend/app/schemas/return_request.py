from datetime import datetime
from pydantic import BaseModel


class ReturnCreate(BaseModel):
    reason: str
    details: str | None = None


class ReturnResolve(BaseModel):
    status: str   # approved | rejected
    resolution_note: str | None = None


class ReturnOut(BaseModel):
    id: int
    order_id: int
    reason: str
    details: str | None
    status: str
    resolution_note: str | None
    created_at: datetime
    resolved_at: datetime | None
    model_config = {"from_attributes": True}
