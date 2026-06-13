"""Phase 2 — optimize endpoint attribution + cost integration."""


def _optimize(client, headers, body=None):
    payload = {"prompt": "Hello world, this is a test prompt for optimization."}
    if body:
        payload.update(body)
    return client.post("/api/optimize", json=payload, headers=headers)


def test_optimize_without_attribution_still_works(client, auth_headers):
    resp = _optimize(client, auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    # Pre-existing fields intact
    assert data["status"] == "success"
    assert "request_id" in data
    assert "optimization" in data
    assert "tokens" in data
    assert "timestamp" in data
    # New additive field present and null
    assert data["cost"] is None


def test_optimize_without_attribution_writes_event(client, auth_headers):
    _optimize(client, auth_headers)
    ev = client.get("/api/meter/events", headers=auth_headers).json()
    assert ev["total"] == 1
    event = ev["events"][0]
    assert event["event_type"] == "optimize"
    assert event["feature"] is None
    assert event["customer_id"] is None
    assert event["workflow"] is None
    assert event["environment"] is None
    assert event["input_tokens"] > 0
    assert event["tokens_saved"] >= 0


def test_optimize_with_attribution_recorded(client, auth_headers):
    attribution = {
        "feature": "chat-summarize",
        "customer_id": "cust_123",
        "workflow": "nightly-batch",
        "environment": "production",
        "tags": {"team": "growth"},
    }
    _optimize(client, auth_headers, {"attribution": attribution})
    event = client.get("/api/meter/events", headers=auth_headers).json()["events"][0]
    assert event["feature"] == "chat-summarize"
    assert event["customer_id"] == "cust_123"
    assert event["workflow"] == "nightly-batch"
    assert event["environment"] == "production"
    assert event["tags"] == {"team": "growth"}


def test_optimize_with_model_returns_cost(client, auth_headers):
    resp = _optimize(client, auth_headers, {"model": "gpt-4o", "provider": "openai"})
    assert resp.status_code == 200
    cost = resp.json()["cost"]
    assert cost is not None
    assert cost["estimated"] is True
    assert cost["original_cost_usd"] > 0
    assert cost["savings_usd"] >= 0
    assert cost["pricing_version"]


def test_optimize_without_model_no_cost(client, auth_headers):
    resp = _optimize(client, auth_headers, {"attribution": {"feature": "x"}})
    assert resp.status_code == 200
    assert resp.json()["cost"] is None
    # Stored event records cost_estimated == False
    event = client.get("/api/meter/events", headers=auth_headers).json()["events"][0]
    assert event["cost_estimated"] is False


def test_optimize_event_links_request_id(client, auth_headers):
    resp = _optimize(client, auth_headers)
    request_id = resp.json()["request_id"]
    event = client.get("/api/meter/events", headers=auth_headers).json()["events"][0]
    assert event["request_id"] == request_id


def test_attribution_validation_rejects_oversize(client, auth_headers):
    # feature too long
    r1 = _optimize(client, auth_headers, {"attribution": {"feature": "x" * 101}})
    assert r1.status_code == 422
    # too many tags
    r2 = _optimize(client, auth_headers, {"attribution": {"tags": {f"k{i}": "v" for i in range(6)}}})
    assert r2.status_code == 422
    # tag key too long
    r3 = _optimize(client, auth_headers, {"attribution": {"tags": {"k" * 41: "v"}}})
    assert r3.status_code == 422


def test_optimize_event_isolated_per_key(client, auth_headers):
    _optimize(client, auth_headers)
    # second, independent key
    key_b = client.post("/api/keys/register", json={"name": "b", "tier": "free"}).json()["api_key"]
    headers_b = {"Authorization": f"Bearer {key_b}"}
    ev_b = client.get("/api/meter/events", headers=headers_b).json()
    assert ev_b["total"] == 0
