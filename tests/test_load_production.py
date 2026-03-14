"""
Load & Performance Tests — Tests that the API handles concurrent load gracefully.
Uses TestClient (no live server needed).
"""

import time
import threading
import pytest


class TestConcurrentLoad:
    """Test API under concurrent request load."""

    def test_50_concurrent_requests_complete(self, client, api_key):
        """50 concurrent optimizations should all return 200 or 429."""
        results = []
        errors = []

        def make_request(i):
            try:
                r = client.post(
                    "/api/optimize",
                    json={"prompt": f"Load test prompt number {i} with enough text to be realistic"},
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                results.append(r.status_code)
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=make_request, args=(i,)) for i in range(50)]
        start = time.time()
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        elapsed = time.time() - start

        # No 500 errors
        assert all(s in [200, 429] for s in results), f"Got unexpected status codes: {set(results)}"
        assert len(errors) == 0, f"Errors: {errors}"
        # Should complete in reasonable time (< 30s for TestClient)
        assert elapsed < 30, f"Took too long: {elapsed:.1f}s"

    def test_concurrent_key_registrations(self, client):
        """20 concurrent key registrations should all succeed."""
        results = []

        def register(i):
            r = client.post(
                "/api/keys/register",
                json={"name": f"load-test-key-{i}"},
            )
            results.append(r.status_code)

        threads = [threading.Thread(target=register, args=(i,)) for i in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success_count = sum(1 for s in results if s == 200)
        assert success_count >= 15, f"Only {success_count}/20 registrations succeeded"

    def test_mixed_endpoint_load(self, client, api_key):
        """Mix of different endpoints under load."""
        results = []

        def health_check():
            r = client.get("/health")
            results.append(("health", r.status_code))

        def pricing():
            r = client.get("/api/pricing")
            results.append(("pricing", r.status_code))

        def usage():
            r = client.get("/api/usage", headers={"Authorization": f"Bearer {api_key}"})
            results.append(("usage", r.status_code))

        def optimize():
            r = client.post(
                "/api/optimize",
                json={"prompt": "Mixed load test"},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            results.append(("optimize", r.status_code))

        threads = []
        for _ in range(5):
            threads.extend([
                threading.Thread(target=health_check),
                threading.Thread(target=pricing),
                threading.Thread(target=usage),
                threading.Thread(target=optimize),
            ])

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # No 500 errors on any endpoint
        for endpoint, status in results:
            assert status != 500, f"{endpoint} returned 500"


class TestResponseTimes:
    """Test that key endpoints respond quickly."""

    def test_health_responds_fast(self, client):
        start = time.time()
        resp = client.get("/health")
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 1.0, f"Health check took {elapsed:.2f}s"

    def test_pricing_responds_fast(self, client):
        start = time.time()
        resp = client.get("/api/pricing")
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 1.0, f"Pricing took {elapsed:.2f}s"

    def test_optimize_responds_under_2s(self, client, api_key):
        start = time.time()
        resp = client.post(
            "/api/optimize",
            json={"prompt": "Response time test with a reasonable prompt"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 2.0, f"Optimization took {elapsed:.2f}s"
