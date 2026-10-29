"""Password-reset tokens — short-lived, single-use."""
from datetime import datetime, timedelta, timezone
import secrets
from sqlalchemy import DateTime, Integer, String, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User")

    @staticmethod
    def generate(user_id: int, ttl_hours: int = 1) -> "PasswordResetToken":
        return PasswordResetToken(
            token=secrets.token_urlsafe(48),
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
        )
