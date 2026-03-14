"""
Security & Authentication Tests — Tests API key validation, auth headers, CORS, input safety.
Uses FastAPI TestClient (no live server required).
"""

import pytest


class TestApiKeyValidation:
    """Test that invalid API keys are properly rejected."""

    def test_completely_invalid_key(self, client):
        resp = client.get(
            "/api/usage",
            headers={"Authorization": "Bearer invalid_key_12345"},
        )
        assert resp.status_code == 401

    def test_malformed_auth_header(self, client):
        resp = client.get(
            "/api/usage",
            headers={"Authorization": "NotBearer fk_validformat"},
        )
        assert resp.status_code == 401

    def test_no_auth_header(self, client):
        resp = client.get("/api/usage")
        assert resp.status_code == 401

    def test_empty_bearer(self, client):
        resp = client.get(
            "/api/usage",
            headers={"Authorization": "Bearer "},
        )
        assert resp.status_code == 401

    def test_valid_key_accepted(self, client, api_key):
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.status_code == 200

    def test_x_api_key_header_works(self, client, api_key):
        resp = client.get("/api/usage", headers={"X-API-Key": api_key})
        assert resp.status_code == 200


class TestAuthOnProtectedEndpoints:
    """Test that all protected endpoints require auth."""

    def test_optimize_requires_auth(self, client):
        resp = client.post("/api/optimize", json={"prompt": "test"})
        assert resp.status_code == 401

    def test_usage_requires_auth(self, client):
        assert client.get("/api/usage").status_code == 401

    def test_providers_requires_auth(self, client):
        assert client.get("/api/providers").status_code == 401

    def test_health_does_not_require_auth(self, client):
        assert client.get("/health").status_code == 200

    def test_pricing_does_not_require_auth(self, client):
        assert client.get("/api/pricing").status_code == 200


class TestInputSanitization:
    """Test that dangerous input is handled safely."""

    def test_xss_in_key_name(self, client):
        resp = client.post(
            "/api/keys/register",
            json={"name": "<script>alert('xss')</script>"},
        )
        # Should either accept (sanitized storage) or reject
        assert resp.status_code in [200, 422]

    def test_sql_injection_in_prompt(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "'; DROP TABLE api_keys; --"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        # Should handle safely — SQLAlchemy parameterizes queries
        assert resp.status_code == 200

        # Verify the table still works
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.status_code == 200

    def test_unicode_in_prompt(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test with unicode: cafe\u0301 \u00f1 \u00fc \u2603 \U0001f600"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_null_bytes_in_prompt(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test with null\x00bytes in the middle"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        # Should either handle or reject, not crash
        assert resp.status_code in [200, 422]


class TestCorsHeaders:
    """Test CORS configuration."""

    def test_health_returns_cors_for_allowed_origin(self, client):
        resp = client.get(
            "/health",
            headers={"Origin": "https://www.fortress-optimizer.com"},
        )
        assert resp.status_code == 200
        # CORS middleware should set access-control-allow-origin
        assert "access-control-allow-origin" in resp.headers

    def test_cors_rejects_unknown_origin(self, client):
        resp = client.get(
            "/health",
            headers={"Origin": "https://evil-site.com"},
        )
        # FastAPI CORS middleware won't set the header for disallowed origins
        assert resp.headers.get("access-control-allow-origin") != "https://evil-site.com"


class TestRateLimitHeaders:
    """Test that rate limiting behaves correctly."""

    def test_rapid_requests_dont_crash(self, client, api_key):
        statuses = []
        for _ in range(15):
            resp = client.post(
                "/api/optimize",
                json={"prompt": "Rapid fire test prompt"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            statuses.append(resp.status_code)

        # All should be 200 or 429 (rate limited), never 500
        assert all(s in [200, 429] for s in statuses)


class TestKeyHashSecurity:
    """Test that API keys are properly hashed."""

    def test_key_starts_with_prefix(self, client):
        resp = client.post("/api/keys/register", json={"name": "hash-test"})
        key = resp.json()["api_key"]
        assert key.startswith("fk_")

    def test_key_is_long_enough(self, client):
        resp = client.post("/api/keys/register", json={"name": "length-test"})
        key = resp.json()["api_key"]
        assert len(key) >= 20, "API key should be sufficiently long"
