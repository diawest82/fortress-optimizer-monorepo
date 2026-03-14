"""
Concurrent User Workflows — Tests multiple simultaneous API users.
Uses FastAPI TestClient (no live server required).
"""

import threading
import pytest


class TestSimultaneousKeyRegistration:
    """Test multiple API keys being registered concurrently."""

    def test_concurrent_registrations_produce_unique_keys(self, client):
        keys = []
        lock = threading.Lock()

        def register(i):
            resp = client.post("/api/keys/register", json={"name": f"concurrent-{i}"})
            with lock:
                if resp.status_code == 200:
                    keys.append(resp.json()["api_key"])

        threads = [threading.Thread(target=register, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(keys) == 10, f"Expected 10 keys, got {len(keys)}"
        assert len(set(keys)) == 10, "All keys should be unique"

    def test_concurrent_registrations_all_succeed(self, client):
        statuses = []
        lock = threading.Lock()

        def register(i):
            resp = client.post("/api/keys/register", json={"name": f"batch-{i}"})
            with lock:
                statuses.append(resp.status_code)

        threads = [threading.Thread(target=register, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert all(s == 200 for s in statuses)


class TestSimultaneousUsageTracking:
    """Test multiple users checking usage simultaneously."""

    def test_concurrent_usage_reads(self, client):
        # Create 5 keys
        keys = []
        for i in range(5):
            resp = client.post("/api/keys/register", json={"name": f"usage-{i}"})
            keys.append(resp.json()["api_key"])

        results = []
        lock = threading.Lock()

        def check_usage(key):
            resp = client.get("/api/usage", headers={"Authorization": f"Bearer {key}"})
            with lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=check_usage, args=(k,)) for k in keys for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success = sum(1 for s in results if s == 200)
        assert success >= len(keys) * 2, f"Too many failures: {success}/{len(results)}"


class TestSimultaneousOptimization:
    """Test concurrent optimization requests."""

    def test_concurrent_optimize_calls(self, client):
        keys = []
        for i in range(3):
            resp = client.post("/api/keys/register", json={"name": f"opt-{i}"})
            keys.append(resp.json()["api_key"])

        results = []
        lock = threading.Lock()

        def optimize(key):
            resp = client.post(
                "/api/optimize",
                json={"prompt": "Hello world this is a concurrent test prompt"},
                headers={"Authorization": f"Bearer {key}"},
            )
            with lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=optimize, args=(k,)) for k in keys for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        success = sum(1 for s in results if s == 200)
        assert success >= 4, f"Expected >=4 successes, got {success}/{len(results)}"


class TestKeyIsolation:
    """Test that API keys don't interfere with each other."""

    def test_usage_isolated_per_key(self, client):
        key1 = client.post("/api/keys/register", json={"name": "iso-1"}).json()["api_key"]
        key2 = client.post("/api/keys/register", json={"name": "iso-2"}).json()["api_key"]

        # Only key1 makes an optimize call
        client.post(
            "/api/optimize",
            json={"prompt": "Isolation test prompt here"},
            headers={"Authorization": f"Bearer {key1}"},
        )

        usage1 = client.get("/api/usage", headers={"Authorization": f"Bearer {key1}"}).json()
        usage2 = client.get("/api/usage", headers={"Authorization": f"Bearer {key2}"}).json()

        assert usage1["requests"] == 1
        assert usage2["requests"] == 0
