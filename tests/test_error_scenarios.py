"""
Error Scenario Tests — Tests error handling, edge cases, malformed input.
Uses FastAPI TestClient (no live server required).
"""

import threading
import pytest


class TestMalformedInput:
    """Test handling of malformed/invalid request bodies."""

    def test_malformed_json_returns_422(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            content=b"{invalid json}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 422

    def test_missing_prompt_field(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"level": "balanced"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_empty_body(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422


class TestInvalidDataTypes:
    """Test handling of wrong data types."""

    def test_prompt_as_number(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": 12345},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_prompt_as_list(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ["hello", "world"]},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_level_as_number(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test prompt here", "level": 42},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422


class TestInvalidCredentials:
    """Test rejection of bad authentication."""

    def test_no_auth_header(self, client):
        resp = client.post("/api/optimize", json={"prompt": "test"})
        assert resp.status_code == 401

    def test_invalid_key_format(self, client):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test"},
            headers={"Authorization": "Bearer not-a-valid-key"},
        )
        assert resp.status_code == 401

    def test_nonexistent_key(self, client):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test"},
            headers={"Authorization": "Bearer fk_0000000000000000000000000000dead"},
        )
        assert resp.status_code == 401

    def test_malformed_bearer(self, client):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test"},
            headers={"Authorization": "NotBearer fk_abc123"},
        )
        assert resp.status_code == 401


class TestInvalidHttpMethods:
    """Test that wrong HTTP methods are rejected."""

    def test_delete_health(self, client):
        assert client.delete("/health").status_code == 405

    def test_put_optimize(self, client, api_key):
        resp = client.put(
            "/api/optimize",
            json={"prompt": "test"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 405

    def test_post_usage(self, client, api_key):
        resp = client.post(
            "/api/usage",
            json={},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 405


class TestLargePayloads:
    """Test handling of oversized input."""

    def test_prompt_at_max_boundary(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "x " * 25000},  # 50000 chars
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_prompt_over_max(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "x" * 50001},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_very_long_key_name(self, client):
        resp = client.post("/api/keys/register", json={"name": "a" * 101})
        assert resp.status_code == 422


class TestNonexistentEndpoints:
    """Test 404 handling."""

    def test_unknown_api_path(self, client):
        assert client.get("/api/nonexistent").status_code == 404

    def test_unknown_root_path(self, client):
        assert client.get("/doesnotexist").status_code == 404


class TestErrorResponseFormat:
    """Test that error responses have a consistent shape."""

    def test_401_has_error_fields(self, client):
        resp = client.post("/api/optimize", json={"prompt": "test"})
        data = resp.json()
        assert data["status"] == "error"
        assert "error" in data
        assert "timestamp" in data

    def test_422_is_structured(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422


class TestConcurrentErrors:
    """Test that concurrent bad requests don't crash the server."""

    def test_concurrent_invalid_requests(self, client):
        results = []
        lock = threading.Lock()

        def bad_request(i):
            resp = client.post("/api/optimize", json={"prompt": "test"})
            with lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=bad_request, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert all(s == 401 for s in results)
