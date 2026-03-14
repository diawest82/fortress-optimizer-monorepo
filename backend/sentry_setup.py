"""
Fortress Token Optimizer - Sentry Configuration

Initializes Sentry error tracking with secret scrubbing.
"""

import os
import re
import logging

logger = logging.getLogger("fortress")

# Patterns to scrub from Sentry events
_SECRET_PATTERNS = [
    (re.compile(r"fk_[a-f0-9]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"Bearer\s+\S+"), "Bearer [REDACTED]"),
    (re.compile(r"://[^@\s]+@"), "://[REDACTED]@"),
    (re.compile(r"sk_live_\S+"), "[REDACTED_STRIPE_KEY]"),
    (re.compile(r"whsec_\S+"), "[REDACTED_WEBHOOK_SECRET]"),
]


def before_send(event: dict, hint: dict) -> dict:
    """Scrub secrets from Sentry events before sending."""
    event_str = str(event)
    for pattern, replacement in _SECRET_PATTERNS:
        event_str = pattern.sub(replacement, event_str)

    # Re-parse isn't needed for simple string scrubbing —
    # but we need to scrub nested dicts properly
    _scrub_dict(event)
    return event


def _scrub_dict(d):
    """Recursively scrub secret patterns from dict values."""
    if not isinstance(d, dict):
        return
    for key, value in d.items():
        if isinstance(value, str):
            for pattern, replacement in _SECRET_PATTERNS:
                value = pattern.sub(replacement, value)
            d[key] = value
        elif isinstance(value, dict):
            _scrub_dict(value)
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    _scrub_dict(item)


def init_sentry() -> bool:
    """Initialize Sentry if DSN is configured. Returns True if initialized."""
    dsn = os.getenv("SENTRY_DSN", "")
    if not dsn:
        logger.info("Sentry DSN not set, skipping initialization")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("FORTRESS_ENV", "development"),
            traces_sample_rate=0.1,
            before_send=before_send,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
        )
        logger.info("Sentry initialized")
        return True
    except ImportError:
        logger.warning("sentry-sdk not installed, skipping")
        return False
    except Exception as e:
        logger.warning(f"Sentry init failed: {e}")
        return False
