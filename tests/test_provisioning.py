"""Tests for the account-gated key provisioning endpoint (POST /api/keys/provision).

Replaces the removed anonymous POST /api/keys/register. Verifies:
  - secret required (403 without / wrong secret)
  - one active free key per account (409 on duplicate)
  - paid tiers supported via provisioning
  - global daily free-provision ceiling (429 + alert log)
  - production fail-closed when PROVISION_SECRET is unset (503)
  - the old anonymous /api/keys/register endpoint is gone
"""

import uuid

import pytest

from conftest import provision_key, TEST_PROVISION_SECRET

SECRET_HEADER = {"X-Provision-Secret": TEST_PROVISION_SECRET}


def _acct():
    return f"acct_{uuid.uuid4().hex}"


def test_provision_success_returns_contract_fields(client):
    acct = _acct()
    resp = client.post(
        "/api/keys/provision",
        json={"name": "ok", "tier": "free", "account_id": acct},
        headers=SECRET_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["api_key"].startswith("fk_")
    assert data["tier"] == "free"
    assert data["account_id"] == acct


def test_provision_without_secret_403(client):
    resp = client.post(
        "/api/keys/provision",
        json={"name": "x", "tier": "free", "account_id": _acct()},
    )
    assert resp.status_code == 403


def test_provision_wrong_secret_403(client):
    resp = client.post(
        "/api/keys/provision",
        json={"name": "x", "tier": "free", "account_id": _acct()},
        headers={"X-Provision-Secret": "nope"},
    )
    assert resp.status_code == 403


def test_provision_duplicate_free_key_409(client):
    acct = _acct()
    first = client.post(
        "/api/keys/provision",
        json={"name": "first", "tier": "free", "account_id": acct},
        headers=SECRET_HEADER,
    )
    assert first.status_code == 200
    second = client.post(
        "/api/keys/provision",
        json={"name": "second", "tier": "free", "account_id": acct},
        headers=SECRET_HEADER,
    )
    assert second.status_code == 409


def test_provision_paid_tier_no_duplicate_limit(client):
    # The one-key-per-account rule applies only to FREE keys. A second pro key
    # for the same account is allowed.
    acct = _acct()
    for tier in ["pro", "pro"]:
        resp = client.post(
            "/api/keys/provision",
            json={"name": "p", "tier": tier, "account_id": acct},
            headers=SECRET_HEADER,
        )
        assert resp.status_code == 200


def test_provision_anonymous_register_removed(client):
    resp = client.post("/api/keys/register", json={"name": "x", "tier": "free"})
    assert resp.status_code in (404, 405)


def test_provision_key_usable_for_optimize(client):
    key = provision_key(client, name="usable", tier="free")
    resp = client.post(
        "/api/optimize",
        json={"prompt": "Hello world this is a provisioning smoke test"},
        headers={"Authorization": f"Bearer {key}"},
    )
    assert resp.status_code == 200


def test_provision_daily_ceiling_returns_429(client, monkeypatch):
    import main
    # Force a tiny ceiling so the 3rd free provision trips it.
    monkeypatch.setenv("FORTRESS_MAX_FREE_PROVISIONS_PER_DAY", "2")
    main._free_provision_counts.clear()

    statuses = []
    for _ in range(3):
        r = client.post(
            "/api/keys/provision",
            json={"name": "ceil", "tier": "free", "account_id": _acct()},
            headers=SECRET_HEADER,
        )
        statuses.append(r.status_code)

    assert statuses[:2] == [200, 200]
    assert statuses[2] == 429


def test_provision_paid_tier_not_subject_to_ceiling(client, monkeypatch):
    import main
    monkeypatch.setenv("FORTRESS_MAX_FREE_PROVISIONS_PER_DAY", "0")
    main._free_provision_counts.clear()
    # Free would be blocked at ceiling 0, but paid tiers bypass the ceiling.
    resp = client.post(
        "/api/keys/provision",
        json={"name": "paid", "tier": "pro", "account_id": _acct()},
        headers=SECRET_HEADER,
    )
    assert resp.status_code == 200


def test_provision_fail_closed_in_production_without_secret(client, monkeypatch):
    # In production with PROVISION_SECRET unset, the endpoint must 503.
    # Exercise the REAL production check (set the env) rather than monkeypatching
    # the symbol, so a name-collision/regression in _is_production_env is caught.
    monkeypatch.delenv("PROVISION_SECRET", raising=False)
    monkeypatch.setenv("FORTRESS_ENV", "production")
    resp = client.post(
        "/api/keys/provision",
        json={"name": "x", "tier": "free", "account_id": _acct()},
        headers={"X-Provision-Secret": "anything"},
    )
    assert resp.status_code == 503
