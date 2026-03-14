"""
Redis Rate Limiter Tests — Tests sliding-window rate limiting with Redis backend.
TDD: Tests written before rate_limiter_redis.py implementation.
"""

import pytest
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))


class TestRedisRateLimiter:
    """Test the Redis-backed rate limiter."""

    def _make_limiter(self, **kwargs):
        from rate_limiter_redis import RedisRateLimiter
        # Use in-memory fallback for tests (no Redis needed)
        return RedisRateLimiter(redis_url="", **kwargs)

    def test_allows_requests_under_limit(self):
        limiter = self._make_limiter(requests_per_minute=10)
        assert limiter.is_allowed("test-key") is True

    def test_blocks_after_limit_exceeded(self):
        limiter = self._make_limiter(requests_per_minute=3, requests_per_day=100)
        for _ in range(3):
            limiter.is_allowed("test-key")
        assert limiter.is_allowed("test-key") is False

    def test_per_key_isolation(self):
        limiter = self._make_limiter(requests_per_minute=2, requests_per_day=100)
        for _ in range(2):
            limiter.is_allowed("key-a")
        # key-a is exhausted
        assert limiter.is_allowed("key-a") is False
        # key-b should still work
        assert limiter.is_allowed("key-b") is True

    def test_get_usage_returns_counts(self):
        limiter = self._make_limiter(requests_per_minute=10, requests_per_day=100)
        limiter.is_allowed("usage-key")
        limiter.is_allowed("usage-key")
        usage = limiter.get_usage("usage-key")
        assert usage["requests_this_minute"] == 2
        assert "rpm_limit" in usage
        assert "rpd_limit" in usage

    def test_has_rate_limit_headers(self):
        limiter = self._make_limiter(requests_per_minute=10, requests_per_day=100)
        limiter.is_allowed("header-key")
        headers = limiter.get_headers("header-key")
        assert "X-RateLimit-Limit" in headers
        assert "X-RateLimit-Remaining" in headers

    def test_graceful_fallback_on_bad_redis_url(self):
        """Should fall back to in-memory when Redis is unreachable."""
        from rate_limiter_redis import RedisRateLimiter
        limiter = RedisRateLimiter(
            redis_url="redis://localhost:59999",  # Non-existent
            requests_per_minute=10,
        )
        # Should not raise, should use fallback
        assert limiter.is_allowed("fallback-key") is True
