"""Phase 4 — GET /api/meter/events."""

import hashlib
import uuid

import conftest
from main import API_KEY_SECRET
from models import ApiKey


def _make_key(prefix, tier="free"):
    raw = f"{prefix}{uuid.uuid4().hex}"
    key_hash = hashlib.sha256(f"{API_KEY_SECRET}:{raw}".encode()).hexdigest()
    db = conftest._TestSession()
    db.add(ApiKey(key_hash=key_hash, name=f"{prefix}key", tier=tier))
    db.commit()
    db.close()
    return raw


def _track(client, headers, **body):
    payload = {"provider": "openai", "model": "gpt-4o", "input_tokens": 100, "output_tokens": 0}
    payload.update(body)
    return client.post("/api/meter/track", json=payload, headers=headers)


def test_events_pagination(client, auth_headers):
    for i in range(5):
        _track(client, auth_headers, idempotency_key=f"k{i}")
    page1 = client.get("/api/meter/events?limit=2&offset=0", headers=auth_headers).json()
    assert len(page1["events"]) == 2
    assert page1["total"] == 5
    page3 = client.get("/api/meter/events?limit=2&offset=4", headers=auth_headers).json()
    assert len(page3["events"]) == 1


def test_events_limit_bounds(client, auth_headers):
    assert client.get("/api/meter/events?limit=0", headers=auth_headers).status_code == 422
    assert client.get("/api/meter/events?limit=201", headers=auth_headers).status_code == 422


def test_events_ordering_newest_first(client, auth_headers):
    _track(client, auth_headers, attribution={"feature": "first"})
    _track(client, auth_headers, attribution={"feature": "second"})
    events = client.get("/api/meter/events", headers=auth_headers).json()["events"]
    assert events[0]["feature"] == "second"


def test_events_filter_by_feature(client, auth_headers):
    _track(client, auth_headers, attribution={"feature": "x"})
    _track(client, auth_headers, attribution={"feature": "y"})
    data = client.get("/api/meter/events?feature=x", headers=auth_headers).json()
    assert data["total"] == 1
    assert all(e["feature"] == "x" for e in data["events"])


def test_events_no_internal_fields(client, auth_headers):
    _track(client, auth_headers, idempotency_key="secret-idem")
    event = client.get("/api/meter/events", headers=auth_headers).json()["events"][0]
    assert "key_hash" not in event
    assert "id" not in event
    assert "idempotency_key" not in event
    assert not any(k.endswith("microdollars") for k in event)


def test_events_readonly_key_allowed(client):
    ro = _make_key("fkr_")
    resp = client.get("/api/meter/events", headers={"Authorization": f"Bearer {ro}"})
    assert resp.status_code == 200
