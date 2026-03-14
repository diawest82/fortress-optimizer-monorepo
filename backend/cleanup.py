"""
Fortress Token Optimizer - Database Cleanup
Purges stale optimization logs and deactivated API keys.

Usage:
    python cleanup.py
"""

import logging
import os
import sys

from datetime import datetime, timedelta

from sqlalchemy import and_

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from database import get_db_session
from models import ApiKey, OptimizationLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Retention policies
LOG_RETENTION_DAYS = int(os.getenv("LOG_RETENTION_DAYS", "90"))
KEY_RETENTION_DAYS = int(os.getenv("KEY_RETENTION_DAYS", "30"))


def run_cleanup() -> dict:
    """
    Purge stale records from the database.

    Returns a dict with counts of purged records.
    Safe to run multiple times (idempotent).
    """
    now = datetime.utcnow()
    log_cutoff = now - timedelta(days=LOG_RETENTION_DAYS)
    key_cutoff = now - timedelta(days=KEY_RETENTION_DAYS)

    with get_db_session() as db:
        # Delete old optimization logs
        logs_deleted = (
            db.query(OptimizationLog)
            .filter(OptimizationLog.created_at < log_cutoff)
            .delete(synchronize_session=False)
        )

        # Delete deactivated API keys older than retention period
        keys_deleted = (
            db.query(ApiKey)
            .filter(
                and_(
                    ApiKey.is_active == False,
                    ApiKey.created_at < key_cutoff,
                )
            )
            .delete(synchronize_session=False)
        )

    result = {
        "logs_purged": logs_deleted,
        "keys_purged": keys_deleted,
        "log_cutoff": log_cutoff.isoformat(),
        "key_cutoff": key_cutoff.isoformat(),
    }

    logger.info(
        f"Cleanup complete: {logs_deleted} optimization logs purged "
        f"(older than {LOG_RETENTION_DAYS}d), "
        f"{keys_deleted} deactivated keys purged "
        f"(older than {KEY_RETENTION_DAYS}d)"
    )

    return result


if __name__ == "__main__":
    result = run_cleanup()
    print(f"Purged {result['logs_purged']} logs, {result['keys_purged']} keys")
