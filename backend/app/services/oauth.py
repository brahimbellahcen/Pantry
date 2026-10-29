"""Google OAuth service — free, no Stripe required."""
import httpx
from fastapi import HTTPException
from app.config import get_settings

settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange an authorization code for user info."""
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(400, "Failed to exchange Google authorization code")
        tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch Google user info")
        return userinfo_resp.json()
