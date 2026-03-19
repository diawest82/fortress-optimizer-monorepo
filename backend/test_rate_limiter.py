"""
Test Suite 8: Rate Limiter Unit Tests
Verifies sliding window correctness, limits, and cleanup.
"""

import time
import pytest
from main import RateLimiter


class TestRateLimiterBasic:
    def test_first_request_allowed(self):
        rl = RateLimiter(requests_per_minute=10, requests_per_day=100)
        assert rl.is_allowed("key1") is True

    def test_multiple_requests_allowed(self):
        rl = RateLimiter(requests_per_minute=10, requests_per_day=100)
        for _ in range(10):
            assert rl.is_allowed("key1") is True

    def test_exceeding_rpm_blocked(self):
        rl = RateLimiter(requests_per_minute=5, requests_per_day=100)
        for _ in range(5):
            rl.is_allowed("key1")
        assert rl.is_allowed("key1") is False

    def test_exceeding_rpd_blocked(self):
        rl = RateLimiter(requests_per_minute=1000, requests_per_day=5)
        for _ in range(5):
            rl.is_allowed("key1")
        assert rl.is_allowed("key1") is False

    def test_different_keys_independent(self):
        rl = RateLimiter(requests_per_minute=3, requests_per_day=100)
        for _ in range(3):
            rl.is_allowed("key1")
        # key1 should be blocked
        assert rl.is_allowed("key1") is False
        # key2 should still be allowed
        assert rl.is_allowed("key2") is True


class TestRateLimiterSlidingWindow:
    def test_window_resets_after_time(self):
        rl = RateLimiter(requests_per_minute=2, requests_per_day=100)
        # Manually set old timestamps
        rl._minute_buckets["key1"] = [time.time() - 120, time.time() - 120]
        # Old entries should be cleaned, new request allowed
        assert rl.is_allowed("key1") is True

    def test_day_window_resets(self):
        rl = RateLimiter(requests_per_minute=100, requests_per_day=2)
        # Set old day entries
        rl._day_buckets["key1"] = [time.time() - 90000, time.time() - 90000]
        assert rl.is_allowed("key1") is True

    def test_partial_window_cleanup(self):
        rl = RateLimiter(requests_per_minute=3, requests_per_day=100)
        now = time.time()
        # 2 old entries (should be cleaned) + 1 current
        rl._minute_buckets["key1"] = [now - 120, now - 120, now - 5]
        # After cleanup: 1 in window + new request = 2 (under limit of 3)
        assert rl.is_allowed("key1") is True


class TestRateLimiterUsageTracking:
    def test_get_usage_empty(self):
        rl = RateLimiter()
        usage = rl.get_usage("nonexistent")
        assert usage["requests_this_minute"] == 0
        assert usage["requests_this_day"] == 0

    def test_get_usage_after_requests(self):
        rl = RateLimiter()
        rl.is_allowed("key1")
        rl.is_allowed("key1")
        usage = rl.get_usage("key1")
        assert usage["requests_this_minute"] == 2
        assert usage["requests_this_day"] == 2

    def test_get_usage_limits_reported(self):
        rl = RateLimiter(requests_per_minute=50, requests_per_day=5000)
        usage = rl.get_usage("key1")
        assert usage["rpm_limit"] == 50
        assert usage["rpd_limit"] == 5000

    def test_blocked_request_not_counted(self):
        rl = RateLimiter(requests_per_minute=2, requests_per_day=100)
        rl.is_allowed("key1")
        rl.is_allowed("key1")
        rl.is_allowed("key1")  # blocked
        usage = rl.get_usage("key1")
        assert usage["requests_this_minute"] == 2  # blocked one not counted


class TestRateLimiterEdgeCases:
    def test_zero_rpm_blocks_all(self):
        rl = RateLimiter(requests_per_minute=0, requests_per_day=100)
        assert rl.is_allowed("key1") is False

    def test_zero_rpd_blocks_all(self):
        rl = RateLimiter(requests_per_minute=100, requests_per_day=0)
        assert rl.is_allowed("key1") is False

    def test_boundary_rpm(self):
        rl = RateLimiter(requests_per_minute=1, requests_per_day=100)
        assert rl.is_allowed("key1") is True
        assert rl.is_allowed("key1") is False

    def test_concurrent_keys_no_interference(self):
        rl = RateLimiter(requests_per_minute=5, requests_per_day=100)
        keys = [f"key_{i}" for i in range(10)]
        for key in keys:
            for _ in range(5):
                assert rl.is_allowed(key) is True
            assert rl.is_allowed(key) is False


class TestRateLimiterDefaults:
    def test_default_rpm(self):
        rl = RateLimiter()
        assert rl.rpm == 100

    def test_default_rpd(self):
        rl = RateLimiter()
        assert rl.rpd == 10000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
