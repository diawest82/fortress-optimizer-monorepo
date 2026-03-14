"""
Fortress Token Optimizer - Centralized Configuration

Loads and validates environment variables. Replaces scattered os.getenv() calls.
In production mode, raises RuntimeError if required vars are missing.
"""

import os
import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class Config:
    database_url: str
    api_key_secret: str
    fortress_env: str
    cors_origins: List[str] = field(default_factory=list)
    sentry_dsn: str = ""
    redis_url: str = ""

    @classmethod
    def from_env(cls) -> "Config":
        fortress_env = os.getenv("FORTRESS_ENV", "development")
        is_prod = fortress_env == "production"

        database_url = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/fortress_optimizer"
            if is_prod else "sqlite:///./fortress_dev.db",
        )
        api_key_secret = os.getenv(
            "API_KEY_SECRET",
            "" if is_prod else "fortress-dev-secret-change-in-prod",
        )

        # Validate required vars in production
        if is_prod:
            missing = []
            if not os.getenv("DATABASE_URL"):
                missing.append("DATABASE_URL")
            if not os.getenv("API_KEY_SECRET"):
                missing.append("API_KEY_SECRET")
            if missing:
                raise RuntimeError(
                    f"Production mode requires these env vars: {', '.join(missing)}. "
                    f"Set FORTRESS_ENV=development for local dev."
                )

        # Normalize postgres:// to postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        cors_origins = [
            "https://fortress-optimizer.com",
            "https://www.fortress-optimizer.com",
            "https://app.fortress-optimizer.com",
        ]
        if not is_prod:
            cors_origins.extend([
                "http://localhost:3000",
                "http://localhost:5173",
            ])

        return cls(
            database_url=database_url,
            api_key_secret=api_key_secret,
            fortress_env=fortress_env,
            cors_origins=cors_origins,
            sentry_dsn=os.getenv("SENTRY_DSN", ""),
            redis_url=os.getenv("REDIS_URL", ""),
        )

    def __repr__(self) -> str:
        masked_secret = "***" if self.api_key_secret else "(empty)"
        masked_db = re.sub(r"://[^@]+@", "://***:***@", self.database_url)
        return (
            f"Config(fortress_env={self.fortress_env!r}, "
            f"database_url={masked_db!r}, "
            f"api_key_secret={masked_secret!r})"
        )
