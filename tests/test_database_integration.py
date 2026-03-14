"""
Database Integration Tests — Tests connection pooling, persistence, schema validation.
Uses FastAPI TestClient with SQLite (no Docker/PostgreSQL needed).
"""

import time
import pytest


class TestConnectionPooling:
    """Test database connection handling under load."""

    def test_rapid_health_checks(self, client):
        """Multiple rapid requests should reuse connections efficiently."""
        start = time.time()
        for _ in range(20):
            resp = client.get("/health")
            assert resp.status_code == 200
        elapsed = time.time() - start
        avg = elapsed / 20
        assert avg < 0.5, f"Average request time too high: {avg:.3f}s"

    def test_health_reports_database_status(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert data["status"] == "healthy"
        assert "database" in data


class TestDataPersistence:
    """Test that data persists across requests within a session."""

    def test_registered_key_can_be_used(self, client):
        resp = client.post("/api/keys/register", json={"name": "persist-test"})
        assert resp.status_code == 200
        key = resp.json()["api_key"]

        # Key should work for usage endpoint
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"})
        assert resp.status_code == 200

    def test_optimization_persists_in_usage(self, client, api_key):
        client.post(
            "/api/optimize",
            json={"prompt": "Persistence test with enough words"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        usage = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"}).json()
        assert usage["requests"] == 1
        assert usage["tokens_optimized"] > 0

    def test_multiple_keys_independent(self, client):
        k1 = client.post("/api/keys/register", json={"name": "p1"}).json()["api_key"]
        k2 = client.post("/api/keys/register", json={"name": "p2"}).json()["api_key"]

        client.post(
            "/api/optimize",
            json={"prompt": "Only key one does this optimization"},
            headers={"Authorization": f"Bearer {k1}"},
        )

        u1 = client.get("/api/usage", headers={"Authorization": f"Bearer {k1}"}).json()
        u2 = client.get("/api/usage", headers={"Authorization": f"Bearer {k2}"}).json()
        assert u1["requests"] == 1
        assert u2["requests"] == 0


class TestSchemaValidation:
    """Test that the API enforces schema constraints."""

    def test_register_rejects_empty_name(self, client):
        resp = client.post("/api/keys/register", json={"name": ""})
        assert resp.status_code == 422

    def test_register_rejects_missing_name(self, client):
        resp = client.post("/api/keys/register", json={"tier": "free"})
        assert resp.status_code == 422

    def test_register_rejects_invalid_tier(self, client):
        resp = client.post("/api/keys/register", json={"name": "t", "tier": "platinum"})
        assert resp.status_code == 422

    def test_optimize_rejects_empty_prompt(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_optimize_rejects_too_long_prompt(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "x" * 50001},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422


class TestTransactionIntegrity:
    """Test that failed operations don't corrupt state."""

    def test_failed_optimize_doesnt_increment_usage(self, client, api_key):
        # This should fail validation
        client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        usage = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"}).json()
        assert usage["requests"] == 0

    def test_invalid_auth_doesnt_affect_valid_key(self, client, api_key):
        # Try with bad key
        client.post(
            "/api/optimize",
            json={"prompt": "test"},
            headers={"Authorization": "Bearer fk_invalidkey12345"},
        )
        # Valid key should still work fine
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.status_code == 200
        assert resp.json()["requests"] == 0
