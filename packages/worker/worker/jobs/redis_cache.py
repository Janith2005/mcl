"""Redis cache backend for pipeline transcript/recon caching."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class RedisCache:
    """Wraps a synchronous redis.Redis client behind the CacheBackend protocol."""

    def __init__(self, redis_client, namespace: str = "mcl"):
        self._r = redis_client
        self._ns = namespace

    def _key(self, key: str) -> str:
        return f"{self._ns}:{key}"

    def get(self, key: str) -> str | None:
        try:
            value = self._r.get(self._key(key))
            return value.decode() if isinstance(value, bytes) else value
        except Exception as e:
            logger.debug("Redis GET error for %s: %s", key, e)
            return None

    def set(self, key: str, value: str, ttl: int | None = 3600) -> None:
        try:
            self._r.set(self._key(key), value, ex=ttl)
        except Exception as e:
            logger.debug("Redis SET error for %s: %s", key, e)

    def exists(self, key: str) -> bool:
        try:
            return bool(self._r.exists(self._key(key)))
        except Exception:
            return False
