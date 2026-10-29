"""Loyalty points service — earn, redeem, and track points."""
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.loyalty import LoyaltyAccount, LoyaltyTransaction

POINTS_PER_DOLLAR = 10          # 10 points per $1 spent
POINTS_VALUE = Decimal("0.01")  # 1 point = $0.01
MIN_REDEEM = 100                 # minimum points to redeem


def get_or_create_account(user_id: int, db: Session) -> LoyaltyAccount:
    acc = db.query(LoyaltyAccount).filter_by(user_id=user_id).first()
    if not acc:
        acc = LoyaltyAccount(user_id=user_id)
        db.add(acc)
        db.flush()
    return acc


def earn_points(user_id: int, order_id: int, order_total: Decimal, db: Session) -> int:
    points = int(float(order_total) * POINTS_PER_DOLLAR)
    if points <= 0:
        return 0
    acc = get_or_create_account(user_id, db)
    acc.balance += points
    acc.lifetime_earned += points
    db.add(LoyaltyTransaction(
        user_id=user_id, order_id=order_id, type="earn",
        points=points, description=f"Earned for order #{order_id}",
    ))
    return points


def redeem_points(user_id: int, points: int, order_id: int, db: Session) -> Decimal:
    """Deduct points and return the monetary discount."""
    acc = get_or_create_account(user_id, db)
    if points < MIN_REDEEM:
        from fastapi import HTTPException
        raise HTTPException(400, f"Minimum redemption is {MIN_REDEEM} points")
    if acc.balance < points:
        from fastapi import HTTPException
        raise HTTPException(400, f"Insufficient points (have {acc.balance}, need {points})")
    acc.balance -= points
    db.add(LoyaltyTransaction(
        user_id=user_id, order_id=order_id, type="redeem",
        points=-points, description=f"Redeemed {points} points",
    ))
    return (POINTS_VALUE * points).quantize(Decimal("0.01"))


def award_referral_points(user_id: int, db: Session) -> None:
    REFERRAL_POINTS = 50
    acc = get_or_create_account(user_id, db)
    acc.balance += REFERRAL_POINTS
    acc.lifetime_earned += REFERRAL_POINTS
    db.add(LoyaltyTransaction(
        user_id=user_id, type="referral",
        points=REFERRAL_POINTS, description="Referral bonus",
    ))
