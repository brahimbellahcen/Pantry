from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Serverless (Vercel) needs NullPool — no persistent connections between requests.
# Dev uses pool_pre_ping to recover from dropped connections.
if settings.APP_ENV == "production":
    from sqlalchemy.pool import NullPool
    engine = create_engine(settings.DATABASE_URL, poolclass=NullPool)
else:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
