"""ARQ worker entrypoint."""
from arq.connections import RedisSettings


async def startup(ctx: dict) -> None:
    """Initialize worker context with Supabase client and pipeline."""
    pass  # Populated in Phase 3


async def shutdown(ctx: dict) -> None:
    """Cleanup on worker shutdown."""
    pass


class WorkerSettings:
    functions = []  # Populated in Phase 3
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings()
    max_jobs = 10
    job_timeout = 600  # 10 minutes
