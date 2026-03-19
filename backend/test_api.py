"""
Test Suite 1: Backend FastAPI Endpoint Tests
Tests all API endpoints against real DB using SQLite in-memory.
"""

import os
import sys
import pytest

# Force SQLite BEFORE any app imports
os.environ["DATABASE_URL"] = "sqlite:///./test_fortress.db"
os.environ["API_KEY_SECRET"] = "test-secret-key"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Patch database module BEFORE main imports it
import database

TEST_DB_URL = "sqlite:///./test_fortress.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

database.engine = test_engine
database.SessionLocal = TestSession

# Import models (they use database.Base which is unchanged)
import models  # noqa: F401

# Patch get_db
def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()

database.get_db = override_get_db

# NOW import main
from main import app, _hash_key, RateLimiter

from fastapi.testclient import TestClient

app.dependency_overrides[database.get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Create tables before each test, drop after"""
    import pathlib
    pathlib.Path("./test_fortress.db").unlink(missing_ok=True)
    # Dispose old connections so SQLite file is released
    test_engine.dispose()
    database.Base.metadata.create_all(bind=test_engine)
    yield
    database.Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    pathlib.Path("./test_fortress.db").unlink(missing_ok=True)


def register_key(name="test", tier="free"):
    if tier != "free":
        # Non-free tiers can't be self-registered; insert directly into DB
        import uuid
        raw_key = f"fk_{uuid.uuid4().hex}"
        key_hash = _hash_key(raw_key)
        db = TestSession()
        db.add(models.ApiKey(key_hash=key_hash, name=name, tier=tier))
        db.commit()
        db.close()
        return raw_key
    resp = client.post("/api/keys/register", json={"name": name, "tier": tier})
    assert resp.status_code == 200
    return resp.json()["api_key"]


def auth_headers(api_key):
    return {"Authorization": f"Bearer {api_key}"}


# ─── Health Endpoint ──────────────────────────────────────────────────────────


class TestHealthEndpoint:
    def test_health_returns_200(self):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_status_healthy(self):
        resp = client.get("/health")
        assert resp.json()["status"] == "healthy"

    def test_health_has_version(self):
        assert "version" in client.get("/health").json()

    def test_health_has_database_field(self):
        assert "database" in client.get("/health").json()

    def test_health_has_timestamp(self):
        assert "timestamp" in client.get("/health").json()

    def test_health_no_auth_required(self):
        assert client.get("/health").status_code == 200


# ─── Key Registration ────────────────────────────────────────────────────────


class TestKeyRegistration:
    def test_register_returns_api_key(self):
        resp = client.post("/api/keys/register", json={"name": "test-key", "tier": "free"})
        assert resp.status_code == 200
        assert resp.json()["api_key"].startswith("fk_")

    def test_register_echoes_tier(self):
        resp = client.post("/api/keys/register", json={"name": "k", "tier": "free"})
        assert resp.json()["tier"] == "free"

    def test_register_echoes_name(self):
        resp = client.post("/api/keys/register", json={"name": "my-key"})
        assert resp.json()["name"] == "my-key"

    def test_register_includes_rate_limits(self):
        data = client.post("/api/keys/register", json={"name": "t"}).json()
        assert data["rate_limits"]["requests_per_minute"] == 100
        assert data["rate_limits"]["requests_per_day"] == 10000

    def test_register_default_tier_is_free(self):
        assert client.post("/api/keys/register", json={"name": "t"}).json()["tier"] == "free"

    def test_register_only_free_tier(self):
        resp = client.post("/api/keys/register", json={"name": "k-free", "tier": "free"})
        assert resp.status_code == 200

    def test_register_paid_tiers_rejected(self):
        for tier in ["pro", "team", "enterprise"]:
            resp = client.post("/api/keys/register", json={"name": f"k-{tier}", "tier": tier})
            assert resp.status_code == 422

    def test_register_invalid_tier(self):
        assert client.post("/api/keys/register", json={"name": "t", "tier": "bad"}).status_code == 422

    def test_register_missing_name(self):
        assert client.post("/api/keys/register", json={"tier": "free"}).status_code == 422

    def test_register_empty_name(self):
        assert client.post("/api/keys/register", json={"name": ""}).status_code == 422

    def test_register_name_too_long(self):
        assert client.post("/api/keys/register", json={"name": "x" * 101}).status_code == 422

    def test_register_unique_keys(self):
        k1 = register_key("t1")
        k2 = register_key("t2")
        assert k1 != k2


# ─── Authentication ───────────────────────────────────────────────────────────


class TestAuthentication:
    def test_missing_auth_returns_401(self):
        assert client.post("/api/optimize", json={"prompt": "hello"}).status_code == 401

    def test_invalid_key_format_returns_401(self):
        resp = client.post("/api/optimize", json={"prompt": "hello"},
                           headers={"Authorization": "Bearer short"})
        assert resp.status_code == 401

    def test_wrong_prefix_returns_401(self):
        resp = client.post("/api/optimize", json={"prompt": "hello"},
                           headers={"Authorization": "Bearer sk_1234567890"})
        assert resp.status_code == 401

    def test_nonexistent_key_returns_401(self):
        resp = client.post("/api/optimize", json={"prompt": "hello"},
                           headers={"Authorization": "Bearer fk_nonexistent1234567890"})
        assert resp.status_code == 401

    def test_valid_key_accepted(self):
        key = register_key()
        resp = client.post("/api/optimize", json={"prompt": "hello world test"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_x_api_key_header_works(self):
        key = register_key()
        resp = client.post("/api/optimize", json={"prompt": "hello world test"},
                           headers={"X-API-Key": key})
        assert resp.status_code == 200

    def test_bearer_header_works(self):
        key = register_key()
        resp = client.post("/api/optimize", json={"prompt": "hello world test"},
                           headers={"Authorization": f"Bearer {key}"})
        assert resp.status_code == 200


# ─── Optimize Endpoint ────────────────────────────────────────────────────────


class TestOptimizeEndpoint:
    def test_optimize_returns_success(self):
        key = register_key()
        resp = client.post("/api/optimize",
                           json={"prompt": "Hello world this is a test prompt"},
                           headers=auth_headers(key))
        assert resp.json()["status"] == "success"

    def test_optimize_has_request_id(self):
        key = register_key()
        resp = client.post("/api/optimize", json={"prompt": "Hello world test"},
                           headers=auth_headers(key))
        assert resp.json()["request_id"].startswith("opt_")

    def test_optimize_has_tokens(self):
        key = register_key()
        data = client.post("/api/optimize", json={"prompt": "Hello world test here"},
                           headers=auth_headers(key)).json()
        assert "tokens" in data
        for field in ["original", "optimized", "savings", "savings_percentage"]:
            assert field in data["tokens"]

    def test_optimize_has_optimization(self):
        key = register_key()
        data = client.post("/api/optimize", json={"prompt": "Test prompt"},
                           headers=auth_headers(key)).json()
        assert "optimized_prompt" in data["optimization"]
        assert "technique" in data["optimization"]

    def test_optimize_all_levels(self):
        key = register_key()
        for level in ["conservative", "balanced", "aggressive"]:
            resp = client.post("/api/optimize",
                               json={"prompt": "Test prompt for opt", "level": level},
                               headers=auth_headers(key))
            assert resp.status_code == 200

    def test_optimize_invalid_level(self):
        key = register_key()
        assert client.post("/api/optimize", json={"prompt": "t", "level": "bad"},
                           headers=auth_headers(key)).status_code == 422

    def test_optimize_empty_prompt(self):
        key = register_key()
        assert client.post("/api/optimize", json={"prompt": ""},
                           headers=auth_headers(key)).status_code == 422

    def test_optimize_prompt_too_long(self):
        key = register_key()
        assert client.post("/api/optimize", json={"prompt": "x" * 50001},
                           headers=auth_headers(key)).status_code == 422

    def test_optimize_custom_provider(self):
        key = register_key()
        resp = client.post("/api/optimize",
                           json={"prompt": "Test prompt", "provider": "anthropic"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_optimize_updates_usage_counters(self):
        key = register_key()
        client.post("/api/optimize", json={"prompt": "Hello world test prompt"},
                    headers=auth_headers(key))
        data = client.get("/api/usage", headers=auth_headers(key)).json()
        assert data["requests"] == 1
        assert data["tokens_optimized"] > 0

    def test_optimize_creates_unique_request_ids(self):
        key = register_key()
        r1 = client.post("/api/optimize", json={"prompt": "Test one"},
                         headers=auth_headers(key)).json()
        r2 = client.post("/api/optimize", json={"prompt": "Test two"},
                         headers=auth_headers(key)).json()
        assert r1["request_id"] != r2["request_id"]


# ─── Usage Endpoint ──────────────────────────────────────────────────────────


class TestUsageEndpoint:
    def test_usage_returns_data(self):
        key = register_key()
        data = client.get("/api/usage", headers=auth_headers(key)).json()
        for field in ["tier", "tokens_optimized", "tokens_saved", "requests"]:
            assert field in data

    def test_usage_fresh_key_zeros(self):
        key = register_key()
        data = client.get("/api/usage", headers=auth_headers(key)).json()
        assert data["tokens_optimized"] == 0
        assert data["requests"] == 0

    def test_usage_reflects_tier(self):
        key = register_key(tier="pro")
        assert client.get("/api/usage", headers=auth_headers(key)).json()["tier"] == "pro"

    def test_usage_free_tier_limit(self):
        key = register_key(tier="free")
        assert client.get("/api/usage", headers=auth_headers(key)).json()["tokens_limit"] == 50000

    def test_usage_pro_tier_unlimited(self):
        key = register_key(tier="pro")
        assert client.get("/api/usage", headers=auth_headers(key)).json()["tokens_limit"] == "unlimited"

    def test_usage_has_rate_limit_info(self):
        key = register_key()
        data = client.get("/api/usage", headers=auth_headers(key)).json()
        assert data["rate_limit"]["rpm_limit"] == 100

    def test_usage_has_reset_date(self):
        key = register_key()
        assert "reset_date" in client.get("/api/usage", headers=auth_headers(key)).json()

    def test_usage_requires_auth(self):
        assert client.get("/api/usage").status_code == 401

    def test_usage_increments(self):
        key = register_key()
        client.post("/api/optimize", json={"prompt": "Test one two three"},
                    headers=auth_headers(key))
        client.post("/api/optimize", json={"prompt": "Test four five six"},
                    headers=auth_headers(key))
        assert client.get("/api/usage", headers=auth_headers(key)).json()["requests"] == 2


# ─── Providers Endpoint ──────────────────────────────────────────────────────


class TestProvidersEndpoint:
    def test_providers_returns_list(self):
        key = register_key()
        data = client.get("/api/providers", headers=auth_headers(key)).json()
        assert isinstance(data["providers"], list)

    def test_providers_count_matches(self):
        key = register_key()
        data = client.get("/api/providers", headers=auth_headers(key)).json()
        assert data["count"] == len(data["providers"])

    def test_providers_includes_major(self):
        key = register_key()
        providers = client.get("/api/providers", headers=auth_headers(key)).json()["providers"]
        assert "openai" in providers and "anthropic" in providers

    def test_providers_requires_auth(self):
        assert client.get("/api/providers").status_code == 401


# ─── Pricing Endpoint ────────────────────────────────────────────────────────


class TestPricingEndpoint:
    def test_pricing_returns_200(self):
        assert client.get("/api/pricing").status_code == 200

    def test_pricing_has_four_tiers(self):
        tiers = client.get("/api/pricing").json()["tiers"]
        assert set(tiers.keys()) == {"free", "pro", "team", "enterprise"}

    def test_pricing_free_tier_zero(self):
        assert client.get("/api/pricing").json()["tiers"]["free"]["price_monthly"] == 0

    def test_pricing_pro_tier_price(self):
        assert client.get("/api/pricing").json()["tiers"]["pro"]["price_monthly"] == 9.99

    def test_pricing_team_tier_sliding_scale(self):
        team = client.get("/api/pricing").json()["tiers"]["team"]
        assert team["price_monthly"] == "sliding_scale"
        assert team["max_seats"] == 500
        assert "pricing_scale" in team

    def test_pricing_no_auth_required(self):
        assert client.get("/api/pricing").status_code == 200

    def test_pricing_has_currency(self):
        assert client.get("/api/pricing").json()["currency"] == "USD"


# ─── Error Handling ──────────────────────────────────────────────────────────


class TestErrorHandling:
    def test_method_not_allowed(self):
        assert client.delete("/health").status_code == 405

    def test_error_response_format(self):
        data = client.post("/api/optimize", json={"prompt": "test"}).json()
        assert data["status"] == "error"
        assert "error" in data
        assert "timestamp" in data


# ─── Key Hash Verification ───────────────────────────────────────────────────


class TestKeyHashing:
    def test_hash_deterministic(self):
        assert _hash_key("fk_test123") == _hash_key("fk_test123")

    def test_hash_different_keys(self):
        assert _hash_key("fk_test123") != _hash_key("fk_test456")

    def test_hash_is_sha256_length(self):
        assert len(_hash_key("fk_test123")) == 64


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
