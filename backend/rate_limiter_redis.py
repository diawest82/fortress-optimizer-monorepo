"""
Redis-backed sliding-window rate limiter with in-memory fallback.

Uses sorted sets for precise sliding-window counting when Redis is available.
Falls back to the same in-memory algorithm when Redis is unreachable.
"""

import time
import logging
from collections import defaultdict
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    def __init__(
        self,
        redis_url: str = "",
        requests_per_minute: int = 100,
        requests_per_day: int = 10000,
    ):
        self.rpm = requests_per_minute
        self.rpd = requests_per_day
        self._redis = None
        self._redis_url = redis_url
        self._redis_retry_after = 0  # timestamp when to retry Redis connection
        self._redis_retry_interval = 30  # seconds between reconnection attempts

        if redis_url:
            self._connect_redis()

        # In-memory fallback
        self._minute_buckets: Dict[str, list] = defaultdict(list)
        self._day_buckets: Dict[str, list] = defaultdict(list)

    def _connect_redis(self):
        """Attempt to connect to Redis. Sets self._redis on success."""
        try:
            import redis
            self._redis = redis.from_url(self._redis_url, socket_connect_timeout=2)
            self._redis.ping()
            logger.info("Redis rate limiter connected")
            self._redis_retry_after = 0
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory fallback: {e}")
            self._redis = None
            self._redis_retry_after = time.time() + self._redis_retry_interval

    def is_allowed(self, key_hash: str) -> bool:
        # Try reconnecting to Redis if we lost connection
        if not self._redis and self._redis_url and time.time() > self._redis_retry_after:
            logger.info("Attempting Redis reconnection...")
            self._connect_redis()
        if self._redis:
            return self._is_allowed_redis(key_hash)
        return self._is_allowed_memory(key_hash)

    def get_usage(self, key_hash: str) -> dict:
        now = time.time()
        if self._redis:
            try:
                rpm_used = self._redis.zcount(f"rl:min:{key_hash}", now - 60, "+inf")
                rpd_used = self._redis.zcount(f"rl:day:{key_hash}", now - 86400, "+inf")
            except Exception:
                rpm_used = self._count_memory(self._minute_buckets, key_hash, 60)
                rpd_used = self._count_memory(self._day_buckets, key_hash, 86400)
        else:
            rpm_used = self._count_memory(self._minute_buckets, key_hash, 60)
            rpd_used = self._count_memory(self._day_buckets, key_hash, 86400)

        return {
            "requests_this_minute": rpm_used,
            "requests_this_day": rpd_used,
            "rpm_limit": self.rpm,
            "rpd_limit": self.rpd,
        }

    def get_headers(self, key_hash: str) -> dict:
        usage = self.get_usage(key_hash)
        return {
            "X-RateLimit-Limit": str(self.rpm),
            "X-RateLimit-Remaining": str(max(0, self.rpm - usage["requests_this_minute"])),
            "X-RateLimit-Reset": str(int(time.time()) + 60),
        }

    # --- Redis implementation ---

    def _is_allowed_redis(self, key_hash: str) -> bool:
        now = time.time()
        try:
            pipe = self._redis.pipeline()
            min_key = f"rl:min:{key_hash}"
            day_key = f"rl:day:{key_hash}"

            # Clean and count minute window
            pipe.zremrangebyscore(min_key, "-inf", now - 60)
            pipe.zcard(min_key)
            # Clean and count day window
            pipe.zremrangebyscore(day_key, "-inf", now - 86400)
            pipe.zcard(day_key)
            results = pipe.execute()

            rpm_count = results[1]
            rpd_count = results[3]

            if rpm_count >= self.rpm or rpd_count >= self.rpd:
                return False

            pipe = self._redis.pipeline()
            pipe.zadd(min_key, {str(now): now})
            pipe.expire(min_key, 120)
            pipe.zadd(day_key, {str(now): now})
            pipe.expire(day_key, 90000)
            pipe.execute()
            return True
        except Exception as e:
            logger.warning(f"Redis error, falling back to memory (will retry in {self._redis_retry_interval}s): {e}")
            self._redis = None
            self._redis_retry_after = time.time() + self._redis_retry_interval
            return self._is_allowed_memory(key_hash)

    # --- In-memory fallback ---

    def _is_allowed_memory(self, key_hash: str) -> bool:
        now = time.time()
        self._minute_buckets[key_hash] = [
            t for t in self._minute_buckets[key_hash] if t > now - 60
        ]
        self._day_buckets[key_hash] = [
            t for t in self._day_buckets[key_hash] if t > now - 86400
        ]

        if len(self._minute_buckets[key_hash]) >= self.rpm:
            return False
        if len(self._day_buckets[key_hash]) >= self.rpd:
            return False

        self._minute_buckets[key_hash].append(now)
        self._day_buckets[key_hash].append(now)
        return True

    def _count_memory(self, buckets: dict, key_hash: str, window: int) -> int:
        now = time.time()
        return len([t for t in buckets.get(key_hash, []) if t > now - window])
