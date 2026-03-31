"""ARQ worker entrypoint."""
import os
import logging
from pathlib import Path

# Load root .env before anything else (same pattern as the API)
from dotenv import load_dotenv
_ROOT_ENV = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(_ROOT_ENV, override=False)

from arq.connections import RedisSettings
from supabase import create_client
import redis as redis_sync

from worker.jobs.discover import run_discovery
from worker.jobs.angle import run_angle_generation
from worker.jobs.script import run_script_generation
from worker.jobs.analyze import run_analytics
from worker.jobs.rescore import run_rescore
from worker.jobs.recon import run_scrape, run_ripper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def startup(ctx: dict) -> None:
    """Initialize worker context with Supabase and Redis clients."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
            f"Looked for .env at: {_ROOT_ENV}"
        )

    ctx["supabase"] = create_client(supabase_url, supabase_key)
    logger.info("Supabase client initialized: %s", supabase_url)

    # Synchronous Redis client for brain caching
    redis_host = os.environ.get("REDIS_HOST", "localhost")
    redis_port = int(os.environ.get("REDIS_PORT", 6379))
    redis_password = os.environ.get("REDIS_PASSWORD") or None
    redis_ssl = os.environ.get("REDIS_SSL", "").lower() == "true"
    try:
        ctx["redis"] = redis_sync.Redis(host=redis_host, port=redis_port, password=redis_password, ssl=redis_ssl, decode_responses=True)
        ctx["redis"].ping()
        logger.info("Redis sync client initialized at %s:%s", redis_host, redis_port)
    except Exception as e:
        logger.warning("Redis unavailable (%s) — brain caching disabled", e)
        ctx["redis"] = None


async def shutdown(ctx: dict) -> None:
    """Cleanup on worker shutdown."""
    if ctx.get("redis"):
        try:
            ctx["redis"].close()
        except Exception:
            pass


class WorkerSettings:
    functions = [
        run_discovery,
        run_angle_generation,
        run_script_generation,
        run_analytics,
        run_rescore,
        run_scrape,
        run_ripper,
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        password=os.environ.get("REDIS_PASSWORD") or None,
        ssl=os.environ.get("REDIS_SSL", "").lower() == "true",
    )
    max_jobs = 10
    job_timeout = 600  # 10 minutes
