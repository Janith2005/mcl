"""ARQ worker entrypoint."""
import os
from arq.connections import RedisSettings
from supabase import create_client

from app.jobs.discover import run_discovery
from app.jobs.angle import run_angle_generation
from app.jobs.script import run_script_generation
from app.jobs.analyze import run_analytics
from app.jobs.rescore import run_rescore


async def startup(ctx: dict) -> None:
    """Initialize worker context with Supabase client."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and supabase_key:
        ctx["supabase"] = create_client(supabase_url, supabase_key)


async def shutdown(ctx: dict) -> None:
    """Cleanup on worker shutdown."""
    pass


class WorkerSettings:
    functions = [
        run_discovery,
        run_angle_generation,
        run_script_generation,
        run_analytics,
        run_rescore,
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
    )
    max_jobs = 10
    job_timeout = 600  # 10 minutes
