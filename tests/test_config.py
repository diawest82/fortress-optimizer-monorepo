"""
Config Module Tests — Tests centralized environment configuration.
TDD: Tests written before backend/config.py implementation.
"""

import os
import sys
import pathlib
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))


class TestConfigFromEnv:
    """Test Config.from_env() factory method."""

    def _make_config(self, env_overrides=None):
        """Helper to create a Config with custom env vars."""
        from config import Config

        old_env = os.environ.copy()
        try:
            defaults = {
                "DATABASE_URL": "sqlite:///test.db",
                "API_KEY_SECRET": "test-secret-key",
            }
            defaults.update(env_overrides or {})
            for k, v in defaults.items():
                os.environ[k] = v
            return Config.from_env()
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_loads_database_url(self):
        cfg = self._make_config({"DATABASE_URL": "postgresql://localhost/fortress"})
        assert cfg.database_url == "postgresql://localhost/fortress"

    def test_loads_api_key_secret(self):
        cfg = self._make_config({"API_KEY_SECRET": "my-secret"})
        assert cfg.api_key_secret == "my-secret"

    def test_default_fortress_env_is_development(self):
        cfg = self._make_config()
        assert cfg.fortress_env == "development"

    def test_loads_fortress_env(self):
        cfg = self._make_config({"FORTRESS_ENV": "production"})
        assert cfg.fortress_env == "production"

    def test_converts_postgres_url(self):
        cfg = self._make_config({"DATABASE_URL": "postgres://user:pass@host/db"})
        assert cfg.database_url.startswith("postgresql://")

    def test_defaults_for_optional_vars(self):
        cfg = self._make_config()
        assert cfg.cors_origins is not None
        assert isinstance(cfg.cors_origins, list)


class TestConfigValidation:
    """Test that Config raises on missing required vars."""

    def test_raises_on_missing_database_url_in_production(self):
        from config import Config

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "production"
            os.environ["API_KEY_SECRET"] = "real-secret"
            os.environ.pop("DATABASE_URL", None)
            with pytest.raises(RuntimeError, match="DATABASE_URL"):
                Config.from_env()
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_raises_on_missing_api_key_secret_in_production(self):
        from config import Config

        old_env = os.environ.copy()
        try:
            os.environ["FORTRESS_ENV"] = "production"
            os.environ["DATABASE_URL"] = "postgresql://localhost/fortress"
            os.environ.pop("API_KEY_SECRET", None)
            with pytest.raises(RuntimeError, match="API_KEY_SECRET"):
                Config.from_env()
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_no_validation_in_dev_mode(self):
        from config import Config

        old_env = os.environ.copy()
        try:
            os.environ.pop("FORTRESS_ENV", None)
            os.environ.pop("DATABASE_URL", None)
            os.environ.pop("API_KEY_SECRET", None)
            cfg = Config.from_env()
            assert cfg.fortress_env == "development"
        finally:
            os.environ.clear()
            os.environ.update(old_env)


class TestConfigRepr:
    """Test that Config masks secrets in string representation."""

    def test_repr_masks_api_key_secret(self):
        from config import Config

        old_env = os.environ.copy()
        try:
            os.environ["DATABASE_URL"] = "sqlite:///test.db"
            os.environ["API_KEY_SECRET"] = "super-secret-value"
            cfg = Config.from_env()
            r = repr(cfg)
            assert "super-secret-value" not in r
            assert "***" in r
        finally:
            os.environ.clear()
            os.environ.update(old_env)

    def test_repr_masks_database_password(self):
        from config import Config

        old_env = os.environ.copy()
        try:
            os.environ["DATABASE_URL"] = "postgresql://user:mypassword@host/db"
            os.environ["API_KEY_SECRET"] = "test"
            cfg = Config.from_env()
            r = repr(cfg)
            assert "mypassword" not in r
        finally:
            os.environ.clear()
            os.environ.update(old_env)
