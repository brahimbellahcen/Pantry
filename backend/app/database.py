from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

if settings.APP_ENV == "production":
    # Vercel serverless: use NullPool (no persistent connections) +
    # Supabase pooler (port 6543) handles connection pooling externally.
    from sqlalchemy.pool import NullPool
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "sslmode": "require",
            "options": "-c statement_timeout=30000",
        },
    )
else:
    # Local dev: use regular pool with pre-ping
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
