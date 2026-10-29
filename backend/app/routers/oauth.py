"""Google OAuth router — free social login."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, RefreshToken
from app.schemas.user import TokenPair
from app.utils.security import create_access_token, create_refresh_token
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


@router.get("/google/url")
def google_auth_url(redirect_uri: str):
    """Return the Google OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    params = "&".join([
        f"client_id={settings.GOOGLE_CLIENT_ID}",
        f"redirect_uri={redirect_uri}",
        "response_type=code",
        "scope=openid%20email%20profile",
        "access_type=offline",
    ])
    return {"url": f"{GOOGLE_AUTH_URL}?{params}"}


class GoogleCallbackBody(BaseModel):
    code: str
    redirect_uri: str


@router.post("/google/callback", response_model=TokenPair)
async def google_callback(body: GoogleCallbackBody, db: Session = Depends(get_db)):
    from app.services.oauth import exchange_code
    userinfo = await exchange_code(body.code, body.redirect_uri)

    email = userinfo.get("email", "").lower()
    name = userinfo.get("name", email.split("@")[0])

    if not email:
        raise HTTPException(400, "Could not retrieve email from Google")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Auto-register
        import secrets
        user = User(
            email=email,
            hashed_password=secrets.token_hex(32),  # unusable password
            full_name=name,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access = create_access_token(user.id, {"is_admin": user.is_admin})
    refresh, expires_at = create_refresh_token(user.id)
    db.add(RefreshToken(token=refresh, user_id=user.id, expires_at=expires_at))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)
