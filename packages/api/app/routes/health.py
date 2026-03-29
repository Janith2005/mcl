"""Health check endpoint."""
import os
import time
from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_simple():
    """Lightweight health check for Railway/load balancer probes."""
    return {"status": "ok"}


@router.get("/api/v1/health")
async def health_check(request: Request):
    checks: dict = {}
    status = "healthy"

    # Redis check
    redis = getattr(request.app.state, "redis", None)
    if redis:
        try:
            t0 = time.monotonic()
            await redis.ping()
            checks["redis"] = {"status": "ok", "latency_ms": round((time.monotonic() - t0) * 1000, 1)}
        except Exception as e:
            checks["redis"] = {"status": "error", "error": str(e)}
            status = "degraded"
    else:
        checks["redis"] = {"status": "unavailable"}
        status = "degraded"

    # Supabase check — just verify env vars are set
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and supabase_key:
        checks["supabase"] = {"status": "configured", "url": supabase_url}
    else:
        checks["supabase"] = {"status": "not_configured"}
        status = "degraded"

    # LLM check — verify Azure OpenAI env vars
    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    checks["llm"] = {
        "status": "configured" if (azure_endpoint and azure_key) else "not_configured",
        "deployment": os.environ.get("AZURE_OPENAI_DEPLOYMENT", "not_set"),
    }

    return {"status": status, "checks": checks}
