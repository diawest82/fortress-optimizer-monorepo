"""
Fortress Token Optimizer - SQLAlchemy Models
Persistent storage for API keys, usage tracking, and optimization audit logs.
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    Index,
)
from database import Base


class ApiKey(Base):
    """Registered API keys with hashed values."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    tier = Column(String(20), nullable=False, default="free")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Usage counters (updated in-place for fast reads)
    tokens_optimized = Column(Integer, nullable=False, default=0)
    tokens_saved = Column(Integer, nullable=False, default=0)
    requests = Column(Integer, nullable=False, default=0)
    first_used_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    # Monthly quota tracking
    monthly_tokens_used = Column(Integer, nullable=False, default=0)
    monthly_reset_at = Column(DateTime, nullable=True)


class OptimizationLog(Base):
    """Audit trail of every optimization request."""

    __tablename__ = "optimization_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), unique=True, nullable=False, index=True)
    key_hash = Column(String(64), nullable=False, index=True)
    original_tokens = Column(Integer, nullable=False)
    optimized_tokens = Column(Integer, nullable=False)
    savings = Column(Integer, nullable=False)
    savings_percentage = Column(Float, nullable=False)
    technique = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False)
    provider = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_opt_logs_key_created", "key_hash", "created_at"),
    )
