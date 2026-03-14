"""
Test Suite 7: Cross-Product Consistency Tests
Verifies that the same prompt produces identical results through
different authentication methods and multiple sequential requests.
Run against a live or local server.
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
def api_key(client):
    resp = client.post("/api/keys/register", json={"name": "consistency-test", "tier": "free"})
    return resp.json()["api_key"]


# ─── Same Prompt = Same Result ────────────────────────────────────────────────


class TestDeterministicResults:
    """Same input should always produce the same output"""

    def test_same_prompt_same_output(self, client, api_key):
        prompt = "Please analyze this data in order to find patterns"
        results = []
        for _ in range(3):
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": "balanced"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            assert resp.status_code == 200
            results.append(resp.json()["optimization"]["optimized_prompt"])

        # All results should be identical
        assert results[0] == results[1] == results[2], \
            f"Non-deterministic results: {results}"

    def test_same_prompt_same_tokens(self, client, api_key):
        prompt = "Hello world test prompt for token counting"
        results = []
        for _ in range(3):
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": "aggressive"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            results.append(resp.json()["tokens"])

        assert results[0]["original"] == results[1]["original"] == results[2]["original"]
        assert results[0]["optimized"] == results[1]["optimized"] == results[2]["optimized"]
        assert results[0]["savings"] == results[1]["savings"] == results[2]["savings"]

    def test_same_prompt_same_technique(self, client, api_key):
        prompt = "Um basically I need to analyze this data you know"
        techniques = []
        for _ in range(3):
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": "balanced"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            techniques.append(resp.json()["technique"])

        assert techniques[0] == techniques[1] == techniques[2]


# ─── Auth Method Consistency ──────────────────────────────────────────────────


class TestAuthMethodConsistency:
    """Same result regardless of auth header format"""

    def test_bearer_vs_xapikey(self, client, api_key):
        prompt = "Test consistency across auth methods"

        resp_bearer = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp_xkey = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced"},
            headers={"X-API-Key": api_key},
        )

        assert resp_bearer.status_code == resp_xkey.status_code == 200
        assert (resp_bearer.json()["optimization"]["optimized_prompt"]
                == resp_xkey.json()["optimization"]["optimized_prompt"])
        assert resp_bearer.json()["tokens"] == resp_xkey.json()["tokens"]


# ─── Level Ordering ──────────────────────────────────────────────────────────


class TestLevelOrdering:
    """Aggressive should save >= balanced >= conservative"""

    def test_savings_order(self, client, api_key):
        prompt = (
            "Please if possible in order to analyze the data "
            "as soon as possible basically thank you"
        )
        savings = {}
        for level in ["conservative", "balanced", "aggressive"]:
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": level},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            assert resp.status_code == 200
            savings[level] = resp.json()["tokens"]["savings"]

        assert savings["aggressive"] >= savings["balanced"], \
            f"aggressive ({savings['aggressive']}) should >= balanced ({savings['balanced']})"
        assert savings["balanced"] >= savings["conservative"], \
            f"balanced ({savings['balanced']}) should >= conservative ({savings['conservative']})"

    def test_token_counts_monotonic(self, client, api_key):
        prompt = "Please help me in order to understand this concept if possible thank you"
        optimized_tokens = {}
        for level in ["conservative", "balanced", "aggressive"]:
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": level},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            optimized_tokens[level] = resp.json()["tokens"]["optimized"]

        assert optimized_tokens["aggressive"] <= optimized_tokens["balanced"]
        assert optimized_tokens["balanced"] <= optimized_tokens["conservative"]


# ─── Provider Consistency ─────────────────────────────────────────────────────


class TestProviderConsistency:
    """Same optimization regardless of provider (algorithm is provider-agnostic today)"""

    def test_openai_vs_anthropic_same_output(self, client, api_key):
        prompt = "Analyze this data set for trends"

        resp_openai = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced", "provider": "openai"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp_anthropic = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced", "provider": "anthropic"},
            headers={"Authorization": f"Bearer {api_key}"},
        )

        assert (resp_openai.json()["optimization"]["optimized_prompt"]
                == resp_anthropic.json()["optimization"]["optimized_prompt"])

    def test_all_providers_same_tokens(self, client, api_key):
        prompt = "Simple test prompt for provider comparison"
        providers = ["openai", "anthropic", "azure", "gemini", "groq", "ollama"]
        results = []
        for provider in providers:
            resp = client.post(
                "/api/optimize",
                json={"prompt": prompt, "level": "balanced", "provider": provider},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            assert resp.status_code == 200
            results.append(resp.json()["tokens"])

        # All should have same token counts (algorithm is currently provider-agnostic)
        for i in range(1, len(results)):
            assert results[i] == results[0], \
                f"Provider {providers[i]} differs from {providers[0]}: {results[i]} != {results[0]}"


# ─── Multi-Key Isolation ─────────────────────────────────────────────────────


class TestMultiKeyIsolation:
    """Different keys should get same optimization but independent usage tracking"""

    def test_two_keys_same_optimization(self, client):
        key1_resp = client.post("/api/keys/register", json={"name": "iso-1", "tier": "free"})
        key2_resp = client.post("/api/keys/register", json={"name": "iso-2", "tier": "free"})
        key1 = key1_resp.json()["api_key"]
        key2 = key2_resp.json()["api_key"]

        prompt = "Test isolation between keys"
        resp1 = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced"},
            headers={"Authorization": f"Bearer {key1}"},
        )
        resp2 = client.post(
            "/api/optimize",
            json={"prompt": prompt, "level": "balanced"},
            headers={"Authorization": f"Bearer {key2}"},
        )

        assert (resp1.json()["optimization"]["optimized_prompt"]
                == resp2.json()["optimization"]["optimized_prompt"])

    def test_usage_isolated_between_keys(self, client):
        key1_resp = client.post("/api/keys/register", json={"name": "usage-iso-1"})
        key2_resp = client.post("/api/keys/register", json={"name": "usage-iso-2"})
        key1 = key1_resp.json()["api_key"]
        key2 = key2_resp.json()["api_key"]

        # Only key1 makes requests
        client.post(
            "/api/optimize",
            json={"prompt": "Test prompt for key 1 only"},
            headers={"Authorization": f"Bearer {key1}"},
        )

        usage1 = client.get("/api/usage", headers={"Authorization": f"Bearer {key1}"}).json()
        usage2 = client.get("/api/usage", headers={"Authorization": f"Bearer {key2}"}).json()

        assert usage1["requests"] == 1
        assert usage2["requests"] == 0


# ─── Request ID Uniqueness ───────────────────────────────────────────────────


class TestRequestIdUniqueness:
    def test_unique_request_ids(self, client, api_key):
        ids = set()
        for _ in range(10):
            resp = client.post(
                "/api/optimize",
                json={"prompt": "Test prompt"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            ids.add(resp.json()["request_id"])
        assert len(ids) == 10, f"Expected 10 unique IDs, got {len(ids)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
