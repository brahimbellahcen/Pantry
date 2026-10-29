from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import get_db
from app.models.user import User, RefreshToken
from app.models.password_reset import PasswordResetToken
from app.schemas.user import UserCreate, UserOut, TokenPair, RefreshRequest, PasswordChange
from pydantic import BaseModel, field_validator
from app.utils.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.dependencies import get_current_user
from app.middleware.security import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    access = create_access_token(user.id, {"is_admin": user.is_admin})
    refresh, expires_at = create_refresh_token(user.id)
    db.add(RefreshToken(token=refresh, user_id=user.id, expires_at=expires_at))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh_tokens(body: RefreshRequest, db: Session = Depends(get_db)):
    err = HTTPException(status_code=401, detail="Invalid or expired refresh token")
    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise err
    if payload.get("type") != "refresh":
        raise err
    record = db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.revoked == False,
    ).first()
    if not record:
        raise err
    exp = record.expires_at
    if exp.tzinfo is None:
        from datetime import timezone as _tz
        exp = exp.replace(tzinfo=_tz.utc)
    if exp < datetime.now(timezone.utc):
        raise err
    record.revoked = True
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise err
    access = create_access_token(user.id, {"is_admin": user.is_admin})
    new_refresh, new_exp = create_refresh_token(user.id)
    db.add(RefreshToken(token=new_refresh, user_id=user.id, expires_at=new_exp))
    db.commit()
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    record = db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).first()
    if record:
        record.revoked = True
        db.commit()
    return {"detail": "Logged out"}


@router.post("/change-password")
def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password changed"}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/forgot-password")
@limiter.limit("5/hour")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    # Always return 200 to avoid email enumeration
    if user:
        reset = PasswordResetToken.generate(user.id)
        db.add(reset)
        db.commit()
        from app.config import get_settings as _s
        frontend_url = _s().APP_CORS_ORIGINS.split(",")[0].strip()
        reset_link = f"{frontend_url}/reset-password?token={reset.token}"
        try:
            from app.services.email import send_password_reset
            send_password_reset(user.email, reset_link)
        except Exception:
            pass
    return {"detail": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.used == False,
    ).first()
    if not record:
        raise HTTPException(400, "Invalid or expired reset token")
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Reset token has expired")
    record.user.hashed_password = hash_password(body.new_password)
    record.used = True
    db.commit()
    return {"detail": "Password reset successfully"}
