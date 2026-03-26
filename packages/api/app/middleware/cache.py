"""Redis cache middleware for brain data."""
import json
from typing import Any

import redis.asyncio as redis
import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)

settings = Settings()
_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """Return a shared async Redis connection."""
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _brain_key(workspace_id: str) -> str:
    return f"brain:{workspace_id}"


async def cache_brain(workspace_id: str, brain_data: dict[str, Any], ttl: int = 300) -> None:
    """Cache brain JSON in Redis with a TTL (default 5 minutes)."""
    r = await get_redis()
    key = _brain_key(workspace_id)
    try:
        await r.set(key, json.dumps(brain_data), ex=ttl)
        logger.debug("brain_cached", workspace_id=workspace_id, ttl=ttl)
    except redis.RedisError as exc:
        logger.warning("brain_cache_write_failed", workspace_id=workspace_id, error=str(exc))


async def get_cached_brain(workspace_id: str) -> dict[str, Any] | None:
    """Return cached brain data or None if not present."""
    r = await get_redis()
    key = _brain_key(workspace_id)
    try:
        raw = await r.get(key)
        if raw is not None:
            logger.debug("brain_cache_hit", workspace_id=workspace_id)
            return json.loads(raw)
        logger.debug("brain_cache_miss", workspace_id=workspace_id)
    except redis.RedisError as exc:
        logger.warning("brain_cache_read_failed", workspace_id=workspace_id, error=str(exc))
    return None


async def invalidate_brain_cache(workspace_id: str) -> None:
    """Delete cached brain on brain update."""
    r = await get_redis()
    key = _brain_key(workspace_id)
    try:
        await r.delete(key)
        logger.debug("brain_cache_invalidated", workspace_id=workspace_id)
    except redis.RedisError as exc:
        logger.warning("brain_cache_invalidate_failed", workspace_id=workspace_id, error=str(exc))
