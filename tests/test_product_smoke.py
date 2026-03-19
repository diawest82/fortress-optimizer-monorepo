"""
Cross-product live smoke tests — verify every product can talk to the Fortress API.

Run with:
    FORTRESS_TEST_URL=http://localhost:8000 pytest tests/test_product_smoke.py -v

Requires: httpx (pip install httpx)
"""

import os
import uuid

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("FORTRESS_TEST_URL"),
    reason="Requires live server — set FORTRESS_TEST_URL",
)

BASE_URL = os.environ.get("FORTRESS_TEST_URL", "https://api.fortress-optimizer.com")
SAMPLE_PROMPT = (
    "Please help me write a Python function that calculates the fibonacci "
    "sequence using dynamic programming and memoization for optimal performance."
)


@pytest.fixture(scope="module")
def http():
    """Module-scoped httpx client."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="module")
def api_key(http):
    """Register a fresh API key once per module."""
    resp = http.post(
        "/api/keys/register",
        json={"name": f"smoke-test-{uuid.uuid4().hex[:8]}", "tier": "free"},
    )
    assert resp.status_code == 200, f"Key registration failed: {resp.text}"
    key = resp.json()["api_key"]
    assert key.startswith("fk_"), f"Key format wrong: {key}"
    return key


@pytest.fixture(scope="module")
def auth(api_key):
    """Bearer auth headers."""
    return {"Authorization": f"Bearer {api_key}"}


class TestHealthAndPublicEndpoints:
    """Endpoints that every product checks before making authed calls."""

    def test_health_returns_200(self, http):
        resp = http.get("/health")
        assert resp.status_code == 200

    def test_health_has_required_fields(self, http):
        data = http.get("/health").json()
        assert data["status"] in ("healthy", "ok")
        assert "database" in data
        assert "timestamp" in data

    def test_pricing_returns_tiers(self, http):
        resp = http.get("/api/pricing")
        assert resp.status_code == 200
        data = resp.json()
        tiers = data.get("tiers") or data
        tier_names = {t["name"] if isinstance(t, dict) else t for t in tiers}
        for expected in ("free", "pro", "team", "enterprise"):
            assert expected in tier_names, f"Missing tier: {expected}"

    def test_providers_requires_auth(self, http):
        """Providers endpoint requires authentication."""
        resp = http.get("/api/providers")
        assert resp.status_code in (401, 403)


class TestKeyRegistration:
    """API key lifecycle — the first thing every product does."""

    def test_register_key_returns_fk_prefix(self, http):
        resp = http.post(
            "/api/keys/register",
            json={"name": f"test-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        assert resp.status_code == 200
        key = resp.json()["api_key"]
        assert key.startswith("fk_")
        assert len(key) > 10

    def test_register_key_response_shape(self, http):
        resp = http.post(
            "/api/keys/register",
            json={"name": f"test-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        data = resp.json()
        assert "api_key" in data


class TestOptimizeEndpoint:
    """POST /api/optimize — the core endpoint every product calls."""

    def test_optimize_basic(self, http, auth):
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT},
        )
        assert resp.status_code == 200
        data = resp.json()
        # optimized_prompt may be top-level or nested under optimization
        prompt = data.get("optimized_prompt") or data.get("optimization", {}).get("optimized_prompt")
        assert prompt is not None, f"No optimized_prompt found in {list(data.keys())}"
        assert isinstance(prompt, str)
        assert len(prompt) > 0

    def test_optimize_returns_token_counts(self, http, auth):
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT},
        )
        data = resp.json()
        tokens = data.get("tokens") or data.get("token_usage") or data
        # Must have at least original and optimized counts
        assert any(
            k in tokens
            for k in ("original", "original_tokens", "input_tokens")
        ), f"No original token count in {list(tokens.keys())}"

    @pytest.mark.parametrize("level", ["conservative", "balanced", "aggressive"])
    def test_optimize_all_levels(self, http, auth, level):
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT, "level": level},
        )
        assert resp.status_code == 200
        data = resp.json()
        prompt = data.get("optimized_prompt") or data.get("optimization", {}).get("optimized_prompt")
        assert prompt is not None

    @pytest.mark.parametrize("provider", ["openai", "anthropic"])
    def test_optimize_with_provider(self, http, auth, provider):
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT, "provider": provider},
        )
        assert resp.status_code == 200
        data = resp.json()
        prompt = data.get("optimized_prompt") or data.get("optimization", {}).get("optimized_prompt")
        assert prompt is not None


class TestUsageEndpoint:
    """GET /api/usage — products display this in dashboards and status bars."""

    def test_usage_returns_200(self, http, auth):
        resp = http.get("/api/usage", headers=auth)
        assert resp.status_code == 200

    def test_usage_has_required_fields(self, http, auth):
        data = http.get("/api/usage", headers=auth).json()
        for field in ("tier", "tokens_optimized", "tokens_remaining", "rate_limit"):
            assert field in data, f"Missing usage field: {field}"

    def test_usage_types(self, http, auth):
        data = http.get("/api/usage", headers=auth).json()
        assert isinstance(data["tier"], str)
        assert isinstance(data["tokens_optimized"], int)
        assert isinstance(data["tokens_remaining"], int)
        assert isinstance(data["rate_limit"], (int, dict))


class TestKeyRotation:
    """POST /api/keys/rotate — products must handle seamless key rotation."""

    def test_rotate_returns_new_key(self, http):
        # Register a throwaway key
        reg = http.post(
            "/api/keys/register",
            json={"name": f"rotate-test-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        old_key = reg.json()["api_key"]
        old_auth = {"Authorization": f"Bearer {old_key}"}

        resp = http.post("/api/keys/rotate", headers=old_auth)
        assert resp.status_code == 200
        new_key = resp.json()["api_key"]
        assert new_key.startswith("fk_")
        assert new_key != old_key

    def test_old_key_invalid_after_rotation(self, http):
        reg = http.post(
            "/api/keys/register",
            json={"name": f"rotate-old-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        old_key = reg.json()["api_key"]
        old_auth = {"Authorization": f"Bearer {old_key}"}

        http.post("/api/keys/rotate", headers=old_auth)

        # Old key should now be rejected
        resp = http.get("/api/usage", headers=old_auth)
        assert resp.status_code in (401, 403)


class TestKeyDeactivation:
    """DELETE /api/keys — products call this on uninstall or logout."""

    def test_deactivate_key(self, http):
        reg = http.post(
            "/api/keys/register",
            json={"name": f"deactivate-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        key = reg.json()["api_key"]
        key_auth = {"Authorization": f"Bearer {key}"}

        resp = http.delete("/api/keys", headers=key_auth)
        assert resp.status_code == 200

    def test_deactivated_key_returns_401(self, http):
        reg = http.post(
            "/api/keys/register",
            json={"name": f"deact-check-{uuid.uuid4().hex[:8]}", "tier": "free"},
        )
        key = reg.json()["api_key"]
        key_auth = {"Authorization": f"Bearer {key}"}

        http.delete("/api/keys", headers=key_auth)

        resp = http.get("/api/usage", headers=key_auth)
        assert resp.status_code in (401, 403)


class TestResponseHeaders:
    """Headers that products rely on for rate limiting and debugging."""

    def test_request_id_header(self, http, auth):
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT},
        )
        request_id = resp.headers.get("x-request-id") or resp.headers.get("X-Request-Id")
        assert request_id, "Missing X-Request-Id header"

    def test_rate_limit_headers(self, http, auth):
        """Rate limit headers present when Redis rate limiter is active."""
        resp = http.post(
            "/api/optimize",
            headers=auth,
            json={"prompt": SAMPLE_PROMPT},
        )
        headers = {k.lower(): v for k, v in resp.headers.items()}
        has_rate_limit = any(k.startswith("x-ratelimit") for k in headers)
        # Rate limit headers only present with Redis; skip if in-memory fallback
        if not has_rate_limit:
            pytest.skip("No X-RateLimit headers — Redis rate limiter not active")


class TestErrorFormat:
    """Products parse error responses — the shape must be consistent."""

    def test_401_without_auth(self, http):
        resp = http.get("/api/usage")
        assert resp.status_code in (401, 403, 422)
        data = resp.json()
        assert "detail" in data or "error" in data or "message" in data

    def test_401_with_bad_key(self, http):
        resp = http.get(
            "/api/usage",
            headers={"Authorization": "Bearer fk_invalid_key_000000"},
        )
        assert resp.status_code in (401, 403)
        data = resp.json()
        assert "detail" in data or "error" in data or "message" in data

    def test_422_missing_prompt(self, http, auth):
        resp = http.post("/api/optimize", headers=auth, json={})
        assert resp.status_code == 422
        data = resp.json()
        assert "detail" in data or "error" in data
