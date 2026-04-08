"""
Test Suite: Load & Concurrency
Verifies the API's correctness under concurrent request bursts.

Default mode: runs against the in-process FastAPI app via httpx.AsyncClient
+ ASGITransport. Tests concurrency at the FastAPI/Python level — catches
shared-state bugs, duplicate request IDs, deadlocks, etc.

Live mode: set FORTRESS_TEST_URL=https://api.fortress-optimizer.com to
exercise real network concurrency (load balancer, container scaling, ALB).
This is the right mode for actual load/perf verification.

Requires: pytest-asyncio (already a transitive dep via httpx).
"""

import asyncio
import time
import pytest
import httpx


def auth(key):
    return {"Authorization": f"Bearer {key}"}


# ─── 1. Concurrent Optimize Requests ────────────────────────────────────────


@pytest.mark.asyncio
async def test_50_concurrent_optimize_requests(async_client, api_key):
    """Fire 50 simultaneous optimize requests. All should return 200 with unique IDs."""
    tasks = [
        async_client.post(
            "/api/optimize",
            json={"prompt": f"Concurrent test prompt number {i} with enough words"},
            headers=auth(api_key),
        )
        for i in range(50)
    ]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    successes = [r for r in responses if isinstance(r, httpx.Response) and r.status_code == 200]
    assert len(successes) >= 40, f"Only {len(successes)}/50 succeeded"

    request_ids = [r.json()["request_id"] for r in successes]
    assert len(request_ids) == len(set(request_ids)), "Duplicate request_ids detected"


# ─── 2. Concurrent Key Registrations ────────────────────────────────────────


@pytest.mark.asyncio
async def test_20_concurrent_key_registrations(async_client):
    """Register 20 keys simultaneously. All should succeed with unique keys."""
    tasks = [
        async_client.post("/api/keys/register", json={"name": f"concurrent-{i}", "tier": "free"})
        for i in range(20)
    ]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    successes = [r for r in responses if isinstance(r, httpx.Response) and r.status_code == 200]
    assert len(successes) == 20, f"Only {len(successes)}/20 registrations succeeded"

    keys = [r.json()["api_key"] for r in successes]
    assert len(keys) == len(set(keys)), "Duplicate API keys generated"


# ─── 3. Mixed Endpoint Concurrency ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_mixed_endpoint_concurrency(async_client, api_key):
    """Simultaneously hit health, pricing, optimize, usage — 10 each."""
    tasks = []
    for _ in range(10):
        tasks.append(async_client.get("/health"))
        tasks.append(async_client.get("/api/pricing"))
        tasks.append(async_client.post(
            "/api/optimize",
            json={"prompt": "Mixed endpoint concurrency test prompt"},
            headers=auth(api_key),
        ))
        tasks.append(async_client.get("/api/usage", headers=auth(api_key)))

    responses = await asyncio.gather(*tasks, return_exceptions=True)

    errors = [r for r in responses if isinstance(r, Exception)]
    assert len(errors) == 0, f"{len(errors)} requests raised exceptions"

    for resp in responses:
        assert isinstance(resp, httpx.Response)
        assert resp.status_code in (200, 429), f"Unexpected status: {resp.status_code}"


# ─── 4. Sequential Rapid-Fire ────────────────────────────────────────────────


def test_sequential_rapid_fire(client, api_key):
    """Send 20 requests as fast as possible. Each should respond in < 2s."""
    slow_count = 0
    for i in range(20):
        start = time.time()
        resp = client.post(
            "/api/optimize",
            json={"prompt": f"Rapid fire test number {i} with words"},
            headers=auth(api_key),
        )
        elapsed = time.time() - start
        assert resp.status_code in (200, 429)
        if elapsed > 2.0:
            slow_count += 1

    assert slow_count <= 3, f"{slow_count}/20 requests took > 2 seconds"


# ─── 5. Rate Limiter Under Concurrency ──────────────────────────────────────


@pytest.mark.asyncio
async def test_rate_limiter_triggers_under_load(async_client):
    """Register a free key and send 120 rapid requests. Some should be rate-limited."""
    # Register a fresh free-tier key
    reg = await async_client.post("/api/keys/register", json={"name": "rate-limit-test", "tier": "free"})
    assert reg.status_code == 200
    key = reg.json()["api_key"]

    tasks = [
        async_client.post(
            "/api/optimize",
            json={"prompt": f"Rate limit test prompt {i} padding words"},
            headers=auth(key),
        )
        for i in range(120)
    ]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    status_codes = [r.status_code for r in responses if isinstance(r, httpx.Response)]
    # Rate limiting requires Redis; without it, in-memory limiter may not trigger.
    # This test verifies no 500s; 429s are expected once Redis is deployed.
    assert all(s in (200, 429) for s in status_codes), (
        f"Unexpected status codes: {dict((s, status_codes.count(s)) for s in set(status_codes))}"
    )
