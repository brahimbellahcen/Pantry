"""Loyalty points router — balance, history, redeem preview."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction
from app.services.loyalty import get_or_create_account, POINTS_PER_DOLLAR, POINTS_VALUE
from app.dependencies import get_current_user

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


class LoyaltyBalanceOut(BaseModel):
    balance: int
    lifetime_earned: int
    points_value_usd: float
    points_per_dollar: int
    model_config = {"from_attributes": True}


class LoyaltyTransactionOut(BaseModel):
    id: int; type: str; points: int; description: str | None; created_at: datetime
    model_config = {"from_attributes": True}


@router.get("/balance", response_model=LoyaltyBalanceOut)
def get_balance(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acc = get_or_create_account(current_user.id, db)
    db.commit()
    return LoyaltyBalanceOut(
        balance=acc.balance,
        lifetime_earned=acc.lifetime_earned,
        points_value_usd=float(POINTS_VALUE * acc.balance),
        points_per_dollar=POINTS_PER_DOLLAR,
    )


@router.get("/history", response_model=list[LoyaltyTransactionOut])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.user_id == current_user.id,
    ).order_by(LoyaltyTransaction.created_at.desc()).limit(50).all()
