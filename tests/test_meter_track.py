"""Phase 3 — POST /api/meter/track."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import conftest
from main import API_KEY_SECRET
from models import ApiKey


def _make_key(prefix, tier="free"):
    """Insert a key with a given prefix directly into the test DB."""
    raw = f"{prefix}{uuid.uuid4().hex}"
    key_hash = hashlib.sha256(f"{API_KEY_SECRET}:{raw}".encode()).hexdigest()
    db = conftest._TestSession()
    db.add(ApiKey(key_hash=key_hash, name=f"{prefix}key", tier=tier))
    db.commit()
    db.close()
    return raw


def _track(client, headers, **body):
    payload = {"provider": "openai", "model": "gpt-4o", "input_tokens": 1000, "output_tokens": 500}
    payload.update(body)
    return client.post("/api/meter/track", json=payload, headers=headers)


def test_track_happy_path(client, auth_headers):
    resp = _track(client, auth_headers, attribution={"feature": "summarize"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "recorded"
    assert data["duplicate"] is False
    assert data["event_id"].startswith("ue_")
    assert data["cost"]["estimated"] is True


def test_track_requires_auth(client):
    resp = client.post("/api/meter/track", json={"provider": "openai", "input_tokens": 10})
    assert resp.status_code == 401


def test_track_rejects_readonly_key(client):
    ro = _make_key("fkr_")
    resp = _track(client, {"Authorization": f"Bearer {ro}"})
    assert resp.status_code == 403


def test_track_provider_default_pricing(client, auth_headers):
    resp = _track(client, auth_headers, model="some-unknown-model")
    assert resp.status_code == 200
    assert resp.json()["cost"]["estimated"] is True


def test_track_unpriceable_provider_recorded(client, auth_headers):
    resp = _track(client, auth_headers, provider="ollama", model="llama3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cost"]["estimated"] is False
    assert data["cost"]["cost_usd"] is None
    ev = client.get("/api/meter/events", headers=auth_headers).json()
    assert ev["total"] == 1


def test_track_zero_tokens_rejected(client, auth_headers):
    resp = _track(client, auth_headers, input_tokens=0, output_tokens=0)
    assert resp.status_code == 422


def test_track_negative_tokens_rejected(client, auth_headers):
    resp = _track(client, auth_headers, input_tokens=-1)
    assert resp.status_code == 422


def test_track_future_occurred_at_rejected(client, auth_headers):
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    resp = _track(client, auth_headers, occurred_at=future)
    assert resp.status_code == 422


def test_track_stale_occurred_at_rejected(client, auth_headers):
    stale = (datetime.now(timezone.utc) - timedelta(days=91)).isoformat()
    resp = _track(client, auth_headers, occurred_at=stale)
    assert resp.status_code == 422


def test_track_idempotency_returns_existing(client, auth_headers):
    r1 = _track(client, auth_headers, idempotency_key="abc-123")
    r2 = _track(client, auth_headers, idempotency_key="abc-123")
    assert r1.status_code == 200 and r2.status_code == 200
    assert r2.json()["duplicate"] is True
    assert r1.json()["event_id"] == r2.json()["event_id"]
    ev = client.get("/api/meter/events", headers=auth_headers).json()
    assert ev["total"] == 1


def test_track_idempotency_scoped_per_key(client, auth_headers):
    _track(client, auth_headers, idempotency_key="shared")
    key_b = client.post("/api/keys/provision", json={"name": "b", "tier": "free", "account_id": "acct_mt_b"}, headers={"X-Provision-Secret": "test-provision-secret"}).json()["api_key"]
    headers_b = {"Authorization": f"Bearer {key_b}"}
    _track(client, headers_b, idempotency_key="shared")
    assert client.get("/api/meter/events", headers=auth_headers).json()["total"] == 1
    assert client.get("/api/meter/events", headers=headers_b).json()["total"] == 1


def test_track_does_not_consume_quota(client, auth_headers):
    before = client.get("/api/usage", headers=auth_headers).json()
    _track(client, auth_headers)
    after = client.get("/api/usage", headers=auth_headers).json()
    assert before["requests"] == after["requests"]
    assert before["tokens_optimized"] == after["tokens_optimized"]
    assert before["tokens_remaining"] == after["tokens_remaining"]
