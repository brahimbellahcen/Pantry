from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_ENV: str = "development"
    APP_CORS_ORIGINS: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql://grocery_user:grocery_pass@localhost:5432/grocery_db"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Free-tier integrations ────────────────────────────────────────────

    # Resend — free tier: 3 000 emails/month, no credit card
    # Sign up at https://resend.com  →  API Keys  →  Create API Key
    RESEND_API_KEY: str = ""          # re_xxxxxxxxxxxx
    EMAIL_FROM: str = "Pantry <onboarding@resend.dev>"  # verified domain or resend.dev sandbox

    # Cloudinary — free tier: 25 GB storage, 25 GB bandwidth/month
    # Sign up at https://cloudinary.com  →  Dashboard  →  copy credentials
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Google OAuth (free) ───────────────────────────────────────────────
    # Sign up at https://console.cloud.google.com → Credentials → Create OAuth Client ID
    # Choose "Web application", add your redirect URI (e.g. http://localhost:5173/auth/callback)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.APP_CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
