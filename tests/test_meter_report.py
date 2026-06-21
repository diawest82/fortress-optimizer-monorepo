"""Phase 4 — GET /api/meter/report."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

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
    payload = {"provider": "openai", "model": "gpt-4o", "input_tokens": 1000, "output_tokens": 0}
    payload.update(body)
    return client.post("/api/meter/track", json=payload, headers=headers)


def test_report_default_groups_by_feature(client, auth_headers):
    _track(client, auth_headers, attribution={"feature": "alpha"})
    _track(client, auth_headers)  # un-attributed
    resp = client.get("/api/meter/report", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["group_by"] == ["feature"]
    keys = [g["key"]["feature"] for g in data["groups"]]
    assert "alpha" in keys
    assert None in keys  # un-attributed event


def test_report_group_by_customer_and_day(client, auth_headers):
    _track(client, auth_headers, attribution={"customer_id": "cust_1"})
    resp = client.get("/api/meter/report?group_by=customer_id,day", headers=auth_headers)
    assert resp.status_code == 200
    g = resp.json()["groups"][0]
    assert "customer_id" in g["key"] and "day" in g["key"]
    assert g["key"]["day"] == datetime.now(timezone.utc).strftime("%Y-%m-%d")


def test_report_invalid_group_by_422(client, auth_headers):
    assert client.get("/api/meter/report?group_by=key_hash", headers=auth_headers).status_code == 422


def test_report_more_than_three_dims_422(client, auth_headers):
    r = client.get("/api/meter/report?group_by=feature,customer_id,workflow,provider", headers=auth_headers)
    assert r.status_code == 422


def test_report_totals_correct(client, auth_headers):
    # 3 events, gpt-4o, 1,000,000 input tokens each -> $2.50 each -> $7.50 total
    for _ in range(3):
        _track(client, auth_headers, input_tokens=1_000_000, output_tokens=0)
    totals = client.get("/api/meter/report", headers=auth_headers).json()["totals"]
    assert totals["events"] == 3
    assert totals["input_tokens"] == 3_000_000
    assert totals["cost_usd"] == 7.5


def test_report_totals_not_capped_by_group_limit(client, auth_headers):
    _track(client, auth_headers, attribution={"feature": "a"})
    _track(client, auth_headers, attribution={"feature": "b"})
    data = client.get("/api/meter/report", headers=auth_headers).json()
    grouped_events = sum(g["events"] for g in data["groups"])
    assert data["totals"]["events"] == grouped_events == 2


def test_report_filter_by_provider(client, auth_headers):
    _track(client, auth_headers, provider="openai", model="gpt-4o")
    _track(client, auth_headers, provider="anthropic", model="claude-sonnet-4-6")
    totals = client.get("/api/meter/report?provider=openai", headers=auth_headers).json()["totals"]
    assert totals["events"] == 1


def test_report_date_range_excludes_outside(client, auth_headers):
    old = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    _track(client, auth_headers, occurred_at=old)
    # default 30-day window excludes it
    assert client.get("/api/meter/report", headers=auth_headers).json()["totals"]["events"] == 0
    # widened window includes it
    start = (datetime.now(timezone.utc) - timedelta(days=45)).strftime("%Y-%m-%d")
    assert client.get(f"/api/meter/report?start={start}", headers=auth_headers).json()["totals"]["events"] == 1


def test_report_start_after_end_422(client, auth_headers):
    r = client.get("/api/meter/report?start=2026-06-10&end=2026-06-01", headers=auth_headers)
    assert r.status_code == 422


def test_report_key_isolation(client, auth_headers):
    _track(client, auth_headers)
    key_b = client.post("/api/keys/provision", json={"name": "b", "tier": "free", "account_id": "acct_mr_b"}, headers={"X-Provision-Secret": "test-provision-secret"}).json()["api_key"]
    headers_b = {"Authorization": f"Bearer {key_b}"}
    assert client.get("/api/meter/report", headers=headers_b).json()["totals"]["events"] == 0


def test_report_readonly_key_allowed(client):
    ro = _make_key("fkr_")
    resp = client.get("/api/meter/report", headers={"Authorization": f"Bearer {ro}"})
    assert resp.status_code == 200


def test_report_unpriced_events_counted(client, auth_headers):
    _track(client, auth_headers, provider="ollama", model="llama3")
    totals = client.get("/api/meter/report", headers=auth_headers).json()["totals"]
    assert totals["unpriced_events"] == 1
    assert totals["cost_usd"] == 0.0
