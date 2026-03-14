"""
Savings & Optimization Bands — Tests optimization levels, tier-based savings,
and the token optimization algorithm behavior through the API.
Uses FastAPI TestClient (no live server required).
"""

import pytest


class TestOptimizationLevels:
    """Test that different optimization levels produce different results."""

    def test_conservative_level(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "This is a test prompt for optimization level testing", "level": "conservative"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["tokens"]["savings_percentage"] >= 0

    def test_balanced_level(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "This is a test prompt for optimization level testing", "level": "balanced"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_aggressive_level(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "This is a test prompt for optimization level testing", "level": "aggressive"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_aggressive_saves_more_than_conservative(self, client, api_key):
        conservative = client.post(
            "/api/optimize",
            json={
                "prompt": "Please help me write a very detailed and comprehensive analysis of the situation at hand",
                "level": "conservative",
            },
            headers={"Authorization": f"Bearer {api_key}"},
        ).json()

        # Re-register key to avoid usage overlap
        key2 = client.post("/api/keys/register", json={"name": "agg-test"}).json()["api_key"]
        aggressive = client.post(
            "/api/optimize",
            json={
                "prompt": "Please help me write a very detailed and comprehensive analysis of the situation at hand",
                "level": "aggressive",
            },
            headers={"Authorization": f"Bearer {key2}"},
        ).json()

        assert aggressive["tokens"]["savings_percentage"] >= conservative["tokens"]["savings_percentage"]

    def test_invalid_level_rejected(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test prompt", "level": "extreme"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422


class TestTierSavings:
    """Test tier-based access to optimization features."""

    def test_free_tier_can_optimize(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Free tier optimization test prompt"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_pro_tier_can_optimize(self, client, pro_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Pro tier optimization test prompt"},
            headers={"Authorization": f"Bearer {pro_key}"},
        )
        assert resp.status_code == 200

    def test_free_tier_usage_limit(self, client):
        resp = client.post("/api/keys/register", json={"name": "limit-test", "tier": "free"})
        key = resp.json()["api_key"]
        usage = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"}).json()
        assert usage["tokens_limit"] == 50000

    def test_pro_tier_unlimited(self, client, pro_key):
        usage = client.get("/api/usage", headers={"Authorization": f"Bearer {pro_key}"}).json()
        assert usage["tokens_limit"] == "unlimited"


class TestSavingsMetrics:
    """Test that savings metrics are calculated correctly."""

    def test_optimization_returns_token_counts(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Hello world this is a test of the optimization system"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        data = resp.json()
        assert data["tokens"]["original"] > 0
        assert data["tokens"]["optimized"] > 0
        assert data["tokens"]["savings"] >= 0
        assert 0 <= data["tokens"]["savings_percentage"] <= 100

    def test_savings_reflected_in_usage(self, client, api_key):
        client.post(
            "/api/optimize",
            json={"prompt": "Measure the savings from this optimization request"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        usage = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"}).json()
        assert usage["tokens_optimized"] > 0
        assert usage["tokens_saved"] >= 0

    def test_request_id_format(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test request id format check"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.json()["request_id"].startswith("opt_")


class TestProviderSupport:
    """Test multi-provider optimization."""

    def test_default_provider(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Default provider test prompt"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_anthropic_provider(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Anthropic provider test prompt", "provider": "anthropic"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_openai_provider(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "OpenAI provider test prompt", "provider": "openai"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200
