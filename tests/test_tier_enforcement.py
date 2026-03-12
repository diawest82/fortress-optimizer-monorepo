"""
Test Suite: Free Tier Enforcement & Key Deactivation
Tests that token limits are enforced and deactivated keys are rejected.

Run: cd backend && python3 -m pytest ../tests/test_tier_enforcement.py -v
"""

import os
import sys
import pytest

# Force SQLite
os.environ["DATABASE_URL"] = "sqlite:///./test_tier_enforce.db"
os.environ["API_KEY_SECRET"] = "test-secret-key"

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import database

TEST_DB_URL = "sqlite:///./test_tier_enforce.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

database.engine = test_engine
database.SessionLocal = TestSession

import models  # noqa: F401


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


database.get_db = override_get_db

from main import app, _hash_key
from fastapi.testclient import TestClient

app.dependency_overrides[database.get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    import pathlib
    pathlib.Path("./test_tier_enforce.db").unlink(missing_ok=True)
    test_engine.dispose()
    database.Base.metadata.create_all(bind=test_engine)
    yield
    database.Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    pathlib.Path("./test_tier_enforce.db").unlink(missing_ok=True)


def register_key(name="test", tier="free"):
    resp = client.post("/api/keys/register", json={"name": name, "tier": tier})
    assert resp.status_code == 200
    return resp.json()["api_key"]


def auth_headers(api_key):
    return {"Authorization": f"Bearer {api_key}"}


def set_tokens(key, count):
    """Set tokens_optimized for a key directly in DB."""
    key_hash = _hash_key(key)
    db = TestSession()
    db_key = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()
    db_key.tokens_optimized = count
    db.commit()
    db.close()


def deactivate_key(key):
    """Set is_active=False for a key."""
    key_hash = _hash_key(key)
    db = TestSession()
    db_key = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()
    db_key.is_active = False
    db.commit()
    db.close()


# ─── Free Tier Token Limit Enforcement ──────────────────────────────────────


class TestFreeTierEnforcement:
    def test_free_tier_allows_under_limit(self):
        key = register_key(tier="free")
        resp = client.post("/api/optimize",
                           json={"prompt": "Hello world test prompt"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_free_tier_blocks_over_limit(self):
        key = register_key(tier="free")
        set_tokens(key, 50001)
        resp = client.post("/api/optimize",
                           json={"prompt": "This should be blocked"},
                           headers=auth_headers(key))
        assert resp.status_code == 429

    def test_free_tier_blocks_at_exact_limit(self):
        key = register_key(tier="free")
        set_tokens(key, 50000)
        resp = client.post("/api/optimize",
                           json={"prompt": "At the limit"},
                           headers=auth_headers(key))
        assert resp.status_code == 429

    def test_free_tier_allows_just_under_limit(self):
        key = register_key(tier="free")
        set_tokens(key, 49999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Just under the limit"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_pro_tier_unlimited(self):
        key = register_key(tier="pro")
        set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Pro tier unlimited test"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_team_tier_unlimited(self):
        key = register_key(tier="team")
        set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Team tier unlimited test"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_enterprise_tier_unlimited(self):
        key = register_key(tier="enterprise")
        set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Enterprise tier unlimited test"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_error_message_mentions_upgrade(self):
        key = register_key(tier="free")
        set_tokens(key, 60000)
        resp = client.post("/api/optimize",
                           json={"prompt": "Over the limit"},
                           headers=auth_headers(key))
        assert resp.status_code == 429
        body = resp.json()
        msg = body.get("detail", body.get("error", "")).lower()
        assert "upgrade" in msg


# ─── Key Deactivation ──────────────────────────────────────────────────────


class TestKeyDeactivation:
    def test_active_key_works(self):
        key = register_key()
        resp = client.post("/api/optimize",
                           json={"prompt": "Active key test"},
                           headers=auth_headers(key))
        assert resp.status_code == 200

    def test_deactivated_key_rejected_on_optimize(self):
        key = register_key()
        deactivate_key(key)
        resp = client.post("/api/optimize",
                           json={"prompt": "Should be rejected"},
                           headers=auth_headers(key))
        assert resp.status_code == 401

    def test_deactivated_key_rejected_on_usage(self):
        key = register_key()
        deactivate_key(key)
        resp = client.get("/api/usage", headers=auth_headers(key))
        assert resp.status_code == 401

    def test_deactivated_key_rejected_on_providers(self):
        key = register_key()
        deactivate_key(key)
        resp = client.get("/api/providers", headers=auth_headers(key))
        assert resp.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
