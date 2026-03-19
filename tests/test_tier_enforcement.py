"""
Test Suite: Free Tier Enforcement & Key Deactivation
Tests that token limits are enforced and deactivated keys are rejected.

Run: cd backend && python3 -m pytest ../tests/test_tier_enforcement.py -v
"""

import pytest

import database
import models
from main import _hash_key


def _register_key(client, name="test", tier="free"):
    if tier != "free":
        # Non-free tiers can't be self-registered; insert directly into DB
        import uuid
        raw_key = f"fk_{uuid.uuid4().hex}"
        key_hash = _hash_key(raw_key)
        db = database.SessionLocal()
        db.add(models.ApiKey(key_hash=key_hash, name=name, tier=tier))
        db.commit()
        db.close()
        return raw_key
    resp = client.post("/api/keys/register", json={"name": name, "tier": tier})
    assert resp.status_code == 200
    return resp.json()["api_key"]


def _auth_headers(api_key):
    return {"Authorization": f"Bearer {api_key}"}


def _set_tokens(key, count):
    """Set tokens_optimized for a key directly in DB."""
    key_hash = _hash_key(key)
    db = database.SessionLocal()
    db_key = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()
    db_key.tokens_optimized = count
    db.commit()
    db.close()


def _deactivate_key(key):
    """Set is_active=False for a key."""
    key_hash = _hash_key(key)
    db = database.SessionLocal()
    db_key = db.query(models.ApiKey).filter(models.ApiKey.key_hash == key_hash).first()
    db_key.is_active = False
    db.commit()
    db.close()


# --- Free Tier Token Limit Enforcement ---


class TestFreeTierEnforcement:
    def test_free_tier_allows_under_limit(self, client):
        key = _register_key(client, tier="free")
        resp = client.post("/api/optimize",
                           json={"prompt": "Hello world test prompt"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_free_tier_blocks_over_limit(self, client):
        key = _register_key(client, tier="free")
        _set_tokens(key, 50001)
        resp = client.post("/api/optimize",
                           json={"prompt": "This should be blocked"},
                           headers=_auth_headers(key))
        assert resp.status_code == 429

    def test_free_tier_blocks_at_exact_limit(self, client):
        key = _register_key(client, tier="free")
        _set_tokens(key, 50000)
        resp = client.post("/api/optimize",
                           json={"prompt": "At the limit"},
                           headers=_auth_headers(key))
        assert resp.status_code == 429

    def test_free_tier_allows_just_under_limit(self, client):
        key = _register_key(client, tier="free")
        _set_tokens(key, 49999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Just under the limit"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_pro_tier_unlimited(self, client):
        key = _register_key(client, tier="pro")
        _set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Pro tier unlimited test"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_team_tier_unlimited(self, client):
        key = _register_key(client, tier="team")
        _set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Team tier unlimited test"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_enterprise_tier_unlimited(self, client):
        key = _register_key(client, tier="enterprise")
        _set_tokens(key, 999999)
        resp = client.post("/api/optimize",
                           json={"prompt": "Enterprise tier unlimited test"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_error_message_mentions_upgrade(self, client):
        key = _register_key(client, tier="free")
        _set_tokens(key, 60000)
        resp = client.post("/api/optimize",
                           json={"prompt": "Over the limit"},
                           headers=_auth_headers(key))
        assert resp.status_code == 429
        body = resp.json()
        msg = body.get("detail", body.get("error", "")).lower()
        assert "upgrade" in msg


# --- Key Deactivation ---


class TestKeyDeactivation:
    def test_active_key_works(self, client):
        key = _register_key(client)
        resp = client.post("/api/optimize",
                           json={"prompt": "Active key test"},
                           headers=_auth_headers(key))
        assert resp.status_code == 200

    def test_deactivated_key_rejected_on_optimize(self, client):
        key = _register_key(client)
        _deactivate_key(key)
        resp = client.post("/api/optimize",
                           json={"prompt": "Should be rejected"},
                           headers=_auth_headers(key))
        assert resp.status_code == 401

    def test_deactivated_key_rejected_on_usage(self, client):
        key = _register_key(client)
        _deactivate_key(key)
        resp = client.get("/api/usage", headers=_auth_headers(key))
        assert resp.status_code == 401

    def test_deactivated_key_rejected_on_providers(self, client):
        key = _register_key(client)
        _deactivate_key(key)
        resp = client.get("/api/providers", headers=_auth_headers(key))
        assert resp.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
