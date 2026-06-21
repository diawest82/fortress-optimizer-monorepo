"""
Fortress Token Optimizer - SQLAlchemy Models
Persistent storage for API keys, usage tracking, and optimization audit logs.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    Index,
    JSON,
)
from database import Base, utcnow


class ApiKey(Base):
    """Registered API keys with hashed values."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    tier = Column(String(20), nullable=False, default="free")
    # OAuth account that provisioned this key (Google/GitHub account id from the
    # website). Nullable because pre-existing/admin-minted keys have no account.
    account_id = Column(String(255), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    # Usage counters (updated in-place for fast reads)
    tokens_optimized = Column(Integer, nullable=False, default=0)
    tokens_saved = Column(Integer, nullable=False, default=0)
    requests = Column(Integer, nullable=False, default=0)
    first_used_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    # Monthly quota tracking
    monthly_tokens_used = Column(Integer, nullable=False, default=0)
    monthly_reset_at = Column(DateTime, nullable=True)

    __table_args__ = (
        # At most ONE active free key per OAuth account. Partial unique index:
        # only rows where tier='free' AND is_active AND account_id IS NOT NULL
        # participate, so paid keys and legacy NULL-account keys are unaffected.
        # Supported by both PostgreSQL and SQLite (partial indexes); the
        # provision endpoint also pre-checks and returns 409 on duplicate.
        Index(
            "uq_api_keys_free_account",
            "account_id",
            unique=True,
            sqlite_where=(tier == "free") & (is_active == True) & (account_id.isnot(None)),
            postgresql_where=(tier == "free") & (is_active == True) & (account_id.isnot(None)),
        ),
    )


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
    technique = Column(String(255), nullable=False)
    level = Column(String(20), nullable=False)
    provider = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    __table_args__ = (
        Index("ix_opt_logs_key_created", "key_hash", "created_at"),
    )


class UsageEvent(Base):
    """Metering event: one row per optimize call or externally-tracked LLM usage."""

    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)  # "ue_<12hex>"
    key_hash = Column(String(64), index=True, nullable=False)               # matches ApiKey.key_hash
    event_type = Column(String(20), nullable=False)                         # "optimize" | "external"
    request_id = Column(String(50), nullable=True)                          # links to OptimizationLog.request_id for optimize events

    # Attribution dimensions (all nullable — un-attributed events are valid)
    feature = Column(String(100), nullable=True)
    customer_id = Column(String(100), nullable=True)
    workflow = Column(String(100), nullable=True)
    environment = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True)                                      # dict[str, str], max 5 entries

    # Usage
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    tokens_saved = Column(Integer, nullable=False, default=0)               # optimize events only; 0 for external

    # Cost (micro-dollars; integer, no float money)
    cost_estimated = Column(Boolean, nullable=False, default=False)
    cost_microdollars = Column(Integer, nullable=True)                      # input + output cost combined
    cost_saved_microdollars = Column(Integer, nullable=True)               # optimize events only
    pricing_version = Column(String(20), nullable=True)                     # e.g. "2026-06.1"; NULL when not estimated

    # Idempotency (track endpoint only)
    idempotency_key = Column(String(64), nullable=True)

    # Time
    occurred_at = Column(DateTime, nullable=False)                          # caller-supplied for /track (default now); now for optimize
    created_at = Column(DateTime, nullable=False, default=utcnow)
    bucket_date = Column(String(10), nullable=False)                        # UTC "YYYY-MM-DD" of occurred_at

    __table_args__ = (
        Index("ix_usage_events_key_created", "key_hash", "created_at"),
        Index("ix_usage_events_key_bucket", "key_hash", "bucket_date"),
        Index("ix_usage_events_key_feature", "key_hash", "feature"),
        Index("ix_usage_events_key_customer", "key_hash", "customer_id"),
        Index("uq_usage_events_key_idem", "key_hash", "idempotency_key", unique=True),
    )
