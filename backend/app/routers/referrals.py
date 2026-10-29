"""Referral system router."""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.referral import Referral
from app.dependencies import get_current_user

router = APIRouter(prefix="/referrals", tags=["referrals"])

REFEREE_CREDIT_POINTS = 500    # 500 points = $5
REFERRER_BONUS_POINTS = 50


def _get_or_create_referral_code(user: User, db: Session) -> str:
    if not user.referral_code:
        code = f"PANTRY-{secrets.token_hex(3).upper()}"
        while db.query(User).filter(User.referral_code == code).first():
            code = f"PANTRY-{secrets.token_hex(3).upper()}"
        user.referral_code = code
        db.commit()
    return user.referral_code


class ReferralOut(BaseModel):
    code: str
    share_url: str
    total_referrals: int
    completed_referrals: int
    points_earned: int


@router.get("/my-code", response_model=ReferralOut)
def my_referral_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = _get_or_create_referral_code(current_user, db)
    all_refs = db.query(Referral).filter(Referral.referrer_id == current_user.id).all()
    completed = [r for r in all_refs if r.status == "completed"]
    return ReferralOut(
        code=code,
        share_url=f"https://pantry.app/register?ref={code}",
        total_referrals=len(all_refs),
        completed_referrals=len(completed),
        points_earned=len(completed) * REFERRER_BONUS_POINTS,
    )


class ApplyReferralBody(BaseModel):
    code: str


@router.post("/apply")
def apply_referral(
    body: ApplyReferralBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a referral code to the current user's account (once only)."""
    existing = db.query(Referral).filter(Referral.referee_id == current_user.id).first()
    if existing:
        raise HTTPException(400, "You have already used a referral code")

    referrer = db.query(User).filter(User.referral_code == body.code.upper()).first()
    if not referrer or referrer.id == current_user.id:
        raise HTTPException(404, "Referral code not found")

    from app.services.loyalty import earn_points, award_referral_points, get_or_create_account
    # Give referee points ($5 credit)
    acc = get_or_create_account(current_user.id, db)
    acc.balance += REFEREE_CREDIT_POINTS
    acc.lifetime_earned += REFEREE_CREDIT_POINTS
    from app.models.loyalty import LoyaltyTransaction
    db.add(LoyaltyTransaction(
        user_id=current_user.id, type="referral",
        points=REFEREE_CREDIT_POINTS,
        description=f"Welcome bonus from referral code {body.code}",
    ))
    # Give referrer bonus
    award_referral_points(referrer.id, db)

    ref = Referral(
        referrer_id=referrer.id, referee_id=current_user.id,
        code=body.code.upper(), status="completed",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(ref)
    db.commit()
    return {"detail": f"Referral applied! You earned {REFEREE_CREDIT_POINTS} points ($5 credit)."}
