from datetime import date as Date
from sqlalchemy import Boolean, Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DeliverySlot(Base):
    __tablename__ = "delivery_slots"
    __table_args__ = (UniqueConstraint("date", "time_window", name="uq_slot_date_window"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    time_window: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    booked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def available(self) -> int:
        return max(0, self.capacity - self.booked_count)
