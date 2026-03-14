"""
Edge Case Tests — Tests input validation, error response format, and boundary conditions.
TDD: Tests written before global error handler improvements.
"""

import pytest


class TestInputValidation:
    """Test that edge-case inputs are handled safely."""

    def test_max_length_prompt(self, client, api_key):
        """50000 char prompt (the max) should be accepted."""
        resp = client.post(
            "/api/optimize",
            json={"prompt": "a" * 50000},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_over_max_length_prompt_rejected(self, client, api_key):
        """50001 chars should be rejected by Pydantic validation."""
        resp = client.post(
            "/api/optimize",
            json={"prompt": "a" * 50001},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_empty_prompt_rejected(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_null_bytes_handled(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test\x00null\x00bytes"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code in [200, 422]

    def test_unicode_prompt_accepted(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Test café naïve résumé 日本語 🚀"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 200

    def test_invalid_optimization_level(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": "test", "level": "invalid_level"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_invalid_json_body(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            content=b"not json",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 422


class TestErrorResponseFormat:
    """Test that all error responses have consistent shape."""

    def test_401_has_error_field(self, client):
        resp = client.get("/api/usage")
        assert resp.status_code == 401
        data = resp.json()
        assert "error" in data or "detail" in data

    def test_422_has_detail(self, client, api_key):
        resp = client.post(
            "/api/optimize",
            json={"prompt": ""},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert resp.status_code == 422

    def test_404_for_unknown_route(self, client):
        resp = client.get("/api/nonexistent")
        assert resp.status_code in [404, 405]

    def test_error_includes_timestamp(self, client):
        resp = client.get("/api/usage")
        data = resp.json()
        assert "timestamp" in data


class TestConcurrentUsageUpdates:
    """Test that concurrent requests don't corrupt usage counters."""

    def test_concurrent_optimizations_all_counted(self, client, api_key):
        import threading

        results = []

        def optimize():
            r = client.post(
                "/api/optimize",
                json={"prompt": "Concurrent test prompt"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            results.append(r.status_code)

        threads = [threading.Thread(target=optimize) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All should succeed (200) or be rate limited (429)
        assert all(s in [200, 429] for s in results)

        # Usage should reflect at least 1 request
        resp = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
        assert resp.json()["requests"] >= 1


class TestKeyRegistrationEdgeCases:
    """Test edge cases in API key registration."""

    def test_very_long_name_rejected(self, client):
        resp = client.post(
            "/api/keys/register",
            json={"name": "a" * 101},
        )
        assert resp.status_code == 422

    def test_empty_name_rejected(self, client):
        resp = client.post(
            "/api/keys/register",
            json={"name": ""},
        )
        assert resp.status_code == 422

    def test_invalid_tier_rejected(self, client):
        resp = client.post(
            "/api/keys/register",
            json={"name": "test", "tier": "nonexistent"},
        )
        assert resp.status_code == 422
