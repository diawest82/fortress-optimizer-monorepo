"""
Test Suite 4: End-to-End User Journey
Tests the complete money path: register → optimize → check usage → hit limits.
Run against a live or local server.
Usage: pytest tests/test_e2e_user_journey.py --base-url http://localhost:8000
"""

import os
import pytest
import httpx

pytestmark = pytest.mark.skipif(
    not os.environ.get("FORTRESS_TEST_URL"),
    reason="Requires live server (set FORTRESS_TEST_URL)"
)

BASE_URL = os.getenv("FORTRESS_TEST_URL", "http://localhost:8000")


@pytest.fixture(scope="module")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=15.0)


@pytest.fixture(scope="module")
def registered_key(client):
    """Register a fresh API key for the test session"""
    resp = client.post("/api/keys/register", json={"name": "e2e-test", "tier": "free"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["api_key"].startswith("fk_")
    return data["api_key"]


@pytest.fixture(scope="module")
def pro_key(client):
    """Register a pro tier key"""
    resp = client.post("/api/keys/register", json={"name": "e2e-pro", "tier": "pro"})
    assert resp.status_code == 200
    return resp.json()["api_key"]


def auth(key):
    return {"Authorization": f"Bearer {key}"}


# ─── Journey Step 1: Discovery ────────────────────────────────────────────────


class TestStep1Discovery:
    """User discovers the API — public endpoints work without auth"""

    def test_health_check(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_view_pricing(self, client):
        resp = client.get("/api/pricing")
        assert resp.status_code == 200
        tiers = resp.json()["tiers"]
        assert "free" in tiers
        assert tiers["free"]["price_monthly"] == 0

    def test_cannot_optimize_without_key(self, client):
        resp = client.post("/api/optimize", json={"prompt": "test"})
        assert resp.status_code == 401


# ─── Journey Step 2: Registration ─────────────────────────────────────────────


class TestStep2Registration:
    """User registers for a free API key"""

    def test_register_free_key(self, client, registered_key):
        assert registered_key.startswith("fk_")
        assert len(registered_key) > 10

    def test_key_works_immediately(self, client, registered_key):
        resp = client.get("/api/usage", headers=auth(registered_key))
        assert resp.status_code == 200


# ─── Journey Step 3: First Optimization ───────────────────────────────────────


class TestStep3FirstOptimization:
    """User makes their first optimization request"""

    def test_optimize_simple_prompt(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Hello world this is my first test prompt"},
            headers=auth(registered_key),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "optimization" in data
        assert "tokens" in data

    def test_optimize_with_fillers(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={
                "prompt": "Um basically I want you to like analyze this data you know",
                "level": "balanced",
            },
            headers=auth(registered_key),
        )
        data = resp.json()
        assert data["status"] == "success"
        # Fillers should be removed
        optimized = data["optimization"]["optimized_prompt"].lower()
        assert "basically" not in optimized
        assert data["tokens"]["savings"] >= 0

    def test_optimize_aggressive_saves_more(self, client, registered_key):
        prompt = "Please if possible in order to analyze as soon as possible thank you"
        resp_bal = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced"},
            headers=auth(registered_key),
        )
        resp_agg = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "aggressive"},
            headers=auth(registered_key),
        )
        savings_bal = resp_bal.json()["tokens"]["savings"]
        savings_agg = resp_agg.json()["tokens"]["savings"]
        assert savings_agg >= savings_bal


# ─── Journey Step 4: Usage Tracking ──────────────────────────────────────────


class TestStep4UsageTracking:
    """User checks their usage after making requests"""

    def test_usage_shows_requests(self, client, registered_key):
        resp = client.get("/api/usage", headers=auth(registered_key))
        data = resp.json()
        assert data["requests"] > 0
        assert data["tokens_optimized"] > 0

    def test_usage_shows_tier(self, client, registered_key):
        resp = client.get("/api/usage", headers=auth(registered_key))
        data = resp.json()
        assert data["tier"] == "free"

    def test_free_tier_has_50k_limit(self, client, registered_key):
        resp = client.get("/api/usage", headers=auth(registered_key))
        data = resp.json()
        assert data["tokens_limit"] == 50000

    def test_tokens_remaining_calculated(self, client, registered_key):
        resp = client.get("/api/usage", headers=auth(registered_key))
        data = resp.json()
        expected_remaining = max(0, 50000 - data["tokens_optimized"])
        assert data["tokens_remaining"] == expected_remaining


# ─── Journey Step 5: Multiple Providers ───────────────────────────────────────


class TestStep5Providers:
    """User explores different provider options"""

    def test_list_providers(self, client, registered_key):
        resp = client.get("/api/providers", headers=auth(registered_key))
        data = resp.json()
        assert len(data["providers"]) >= 6
        assert "openai" in data["providers"]
        assert "anthropic" in data["providers"]

    def test_optimize_with_anthropic_provider(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test prompt for Anthropic", "provider": "anthropic"},
            headers=auth(registered_key),
        )
        assert resp.status_code == 200

    def test_optimize_with_custom_provider(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test prompt for custom", "provider": "custom_llm"},
            headers=auth(registered_key),
        )
        assert resp.status_code == 200


# ─── Journey Step 6: Pro Tier Experience ──────────────────────────────────────


class TestStep6ProTier:
    """User upgrades to pro tier"""

    def test_pro_has_unlimited_tokens(self, client, pro_key):
        resp = client.get("/api/usage", headers=auth(pro_key))
        data = resp.json()
        assert data["tier"] == "pro"
        assert data["tokens_limit"] == "unlimited"
        assert data["tokens_remaining"] == "unlimited"


# ─── Journey Step 7: Error Recovery ──────────────────────────────────────────


class TestStep7ErrorRecovery:
    """User encounters and recovers from errors"""

    def test_empty_prompt_rejected(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers=auth(registered_key),
        )
        assert resp.status_code == 422

    def test_invalid_level_rejected(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "level": "extreme"},
            headers=auth(registered_key),
        )
        assert resp.status_code == 422

    def test_valid_request_after_error(self, client, registered_key):
        # Error first
        client.post("/api/optimize", json={"prompt": ""}, headers=auth(registered_key))
        # Then valid
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Valid prompt after error"},
            headers=auth(registered_key),
        )
        assert resp.status_code == 200


# ─── Journey Step 8: Cross-Header Auth ───────────────────────────────────────


class TestStep8AuthMethods:
    """User tries different authentication methods"""

    def test_bearer_auth(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test with Bearer"},
            headers={"Authorization": f"Bearer {registered_key}"},
        )
        assert resp.status_code == 200

    def test_x_api_key_auth(self, client, registered_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test with X-API-Key"},
            headers={"X-API-Key": registered_key},
        )
        assert resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
