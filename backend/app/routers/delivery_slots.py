from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.delivery_slot import DeliverySlot
from app.schemas.delivery_slot import DeliverySlotOut

router = APIRouter(prefix="/delivery-slots", tags=["delivery"])


@router.get("", response_model=list[DeliverySlotOut])
def list_available_slots(db: Session = Depends(get_db)):
    """Return available slots for the next 7 days."""
    today = date.today()
    end = today + timedelta(days=7)
    slots = db.query(DeliverySlot).filter(
        DeliverySlot.date >= today,
        DeliverySlot.date <= end,
        DeliverySlot.is_active == True,
        DeliverySlot.booked_count < DeliverySlot.capacity,
    ).order_by(DeliverySlot.date, DeliverySlot.time_window).all()
    return [
        DeliverySlotOut(
            id=s.id, date=s.date, time_window=s.time_window,
            capacity=s.capacity, booked_count=s.booked_count,
            available=s.available, is_active=s.is_active,
        )
        for s in slots
    ]
