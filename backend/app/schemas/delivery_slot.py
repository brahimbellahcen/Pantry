from datetime import date
from pydantic import BaseModel


class DeliverySlotOut(BaseModel):
    id: int
    date: date
    time_window: str
    capacity: int
    booked_count: int
    available: int
    is_active: bool
    model_config = {"from_attributes": True}


class DeliverySlotCreate(BaseModel):
    date: date
    time_window: str
    capacity: int = 20
