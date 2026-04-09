"""
Sentry Integration Tests — Tests that Sentry is configured correctly.
TDD: Tests written before sentry setup in main.py.
"""

import os
import sys
import pathlib
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))


class TestSentryConfig:
    """Test Sentry initialization behavior."""

    def test_sentry_init_called_when_dsn_set(self, monkeypatch):
        monkeypatch.setenv("SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/0")
        # sentry-sdk is an optional dependency — mock it so init_sentry()
        # exercises the happy path even when sentry-sdk isn't installed.
        from unittest.mock import MagicMock
        mock_sentry = MagicMock()
        monkeypatch.setitem(sys.modules, "sentry_sdk", mock_sentry)
        monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.fastapi", MagicMock())
        monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.sqlalchemy", MagicMock())
        # Force reimport to pick up the mock
        import importlib
        import sentry_setup
        importlib.reload(sentry_setup)
        result = sentry_setup.init_sentry()
        assert result is True
        mock_sentry.init.assert_called_once()

    def test_sentry_not_init_when_dsn_empty(self, monkeypatch):
        monkeypatch.delenv("SENTRY_DSN", raising=False)
        from sentry_setup import init_sentry
        result = init_sentry()
        assert result is False

    def test_before_send_scrubs_api_key(self):
        from sentry_setup import before_send
        fake_key = "fk_" + "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
        event = {
            "request": {
                "headers": {"Authorization": f"Bearer {fake_key}"},
                "data": f"prompt with api_key={fake_key}",
            },
        }
        hint = {}
        cleaned = before_send(event, hint)
        assert fake_key not in str(cleaned)

    def test_before_send_scrubs_database_url(self):
        from sentry_setup import before_send
        event = {
            "extra": {
                "database_url": "postgresql://user:password@host/db",
            },
        }
        hint = {}
        cleaned = before_send(event, hint)
        assert "password" not in str(cleaned)
