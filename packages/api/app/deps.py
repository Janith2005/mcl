"""FastAPI dependency injection."""
from functools import lru_cache
from supabase import create_client, Client
from redis.asyncio import Redis
from app.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


async def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)
