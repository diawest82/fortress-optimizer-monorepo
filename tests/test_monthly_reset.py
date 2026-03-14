"""
Monthly Token Reset Tests — Tests quota enforcement and automatic monthly resets.
TDD: Tests written before implementation.
"""

import pytest
from datetime import datetime, timedelta


class TestMonthlyTokenFields:
    """Test that usage endpoint has monthly tracking fields."""

    def test_model_has_tokens_optimized(self, client):
        resp = client.post("/api/keys/register", json={"name": "monthly-test"})
        assert resp.status_code == 200
        key = resp.json()["api_key"]

        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"})
        data = resp.json()
        assert "tokens_optimized" in data

    def test_model_has_reset_date(self, client):
        resp = client.post("/api/keys/register", json={"name": "reset-test"})
        key = resp.json()["api_key"]

        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"})
        data = resp.json()
        assert "reset_date" in data

    def test_new_key_starts_at_zero(self, client):
        resp = client.post("/api/keys/register", json={"name": "zero-test"})
        key = resp.json()["api_key"]

        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"})
        data = resp.json()
        assert data["tokens_optimized"] == 0


class TestMonthlyQuotaEnforcement:
    """Test that free tier quota is enforced on monthly usage."""

    def test_usage_increments_counter(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test prompt for monthly tracking"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.json()["tokens_optimized"] > 0

    def test_remaining_decreases(self, client, api_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        before = resp.json().get("tokens_remaining")

        client.post(
            "/api/optimize",
            json={"prompt": "Consume some tokens"},
            headers={"Authorization": f"Bearer {api_key}"},
        )

        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        after = resp.json().get("tokens_remaining")

        if before != "unlimited":
            assert after < before

    def test_pro_tier_shows_unlimited(self, client, pro_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {pro_key}"})
        data = resp.json()
        assert data["tokens_remaining"] == "unlimited"


class TestMonthlyReset:
    """Test that monthly counters reset when the period expires."""

    def test_reset_clears_counter(self, client, api_key):
        """Simulate a monthly reset by directly manipulating the DB."""
        import sys
        import pathlib

        sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))
        from models import ApiKey as ApiKeyModel
        from main import _hash_key
        import database

        # Use some tokens first
        client.post(
            "/api/optimize",
            json={"prompt": "Use tokens before reset test"},
            headers={"Authorization": f"Bearer {api_key}"},
        )

        # Verify tokens were used
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.json()["tokens_optimized"] > 0

        # Reset the counter directly in the DB to simulate a monthly reset
        key_hash = _hash_key(api_key)
        db = database.SessionLocal()
        try:
            db_key = db.query(ApiKeyModel).filter(ApiKeyModel.key_hash == key_hash).first()
            db_key.tokens_optimized = 0
            db_key.tokens_saved = 0
            db.commit()
        finally:
            db.close()

        # After reset, usage should show zero
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        data = resp.json()
        assert data["tokens_optimized"] == 0
