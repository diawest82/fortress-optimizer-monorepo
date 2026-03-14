"""
Fortress Token Optimizer - Database Layer
SQLAlchemy connection and session management for PostgreSQL (AWS RDS)
"""

import os
import logging
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

logger = logging.getLogger(__name__)

# Database URL from environment, fallback to local dev
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/fortress_optimizer",
)

# Convert any prisma-style URLs (postgres:// → postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use (handles RDS restarts)
    pool_recycle=300,  # Recycle connections every 5 min (RDS idle timeout)
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Session:
    """FastAPI dependency: yields a DB session, auto-closes after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Session:
    """Context manager for non-FastAPI usage (startup, scripts)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Create all tables. Safe to call multiple times (uses IF NOT EXISTS)."""
    from backend.models import ApiKey, UsageRecord, OptimizationLog  # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")
