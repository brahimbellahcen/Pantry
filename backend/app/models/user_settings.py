from datetime import datetime
from sqlalchemy import DateTime, Integer, String, ForeignKey, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    notification_prefs: Mapped[dict] = mapped_column(JSON, nullable=False, default=lambda: {
        "order_updates": True, "promotional": True,
        "low_stock_alerts": False, "weekly_digest": False,
    })
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RecentlyViewed(Base):
    __tablename__ = "recently_viewed"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_recently_viewed"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship("Product")
