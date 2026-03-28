"""Pipeline orchestration routes - trigger background jobs."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from supabase import Client
from redis.asyncio import Redis
from arq import create_pool
from arq.connections import RedisSettings
from app.deps import get_supabase, get_redis
from app.middleware.auth import get_current_user
import os

FREE_PLAN_JOB_LIMIT = 50  # jobs per month for free plan


async def check_plan_limit(
    workspace_id: str,
    supabase: Client = Depends(get_supabase),
) -> None:
    """Gate AI pipeline jobs based on workspace plan. Free plan: 50 jobs/month."""
    try:
        ws = supabase.table("workspaces").select("plan").eq("id", workspace_id).single().execute()
        plan = (ws.data or {}).get("plan", "free")
        if plan != "free":
            return  # Paid plans have no limit

        # Count jobs created in the last 30 days
        from datetime import datetime, timezone, timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        result = supabase.table("jobs").select("id", count="exact").eq(
            "workspace_id", workspace_id
        ).gte("created_at", cutoff).execute()
        job_count = result.count or 0

        if job_count >= FREE_PLAN_JOB_LIMIT:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "PLAN_LIMIT_EXCEEDED",
                    "message": f"Free plan limit of {FREE_PLAN_JOB_LIMIT} AI jobs/month reached. Upgrade to continue.",
                    "jobs_used": job_count,
                    "limit": FREE_PLAN_JOB_LIMIT,
                },
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Fail open — don't block jobs if plan check errors

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["pipeline"])


class DiscoverRequest(BaseModel):
    mode: str = "both"  # competitors | keywords | both
    keywords: list[str] | None = None


class AngleRequest(BaseModel):
    topic_ids: list[str]
    format: str = "longform"


class ScriptRequest(BaseModel):
    angle_id: str
    hook_ids: list[str] = []


class AnalyzeRequest(BaseModel):
    content_ids: list[str] | None = None  # None = analyze all published


class RescoreRequest(BaseModel):
    pass  # Rescore uses current brain weights


async def _create_job(
    supabase: Client,
    workspace_id: str,
    job_type: str,
    task_name: str,
    **kwargs,
) -> dict:
    """Create a job record in Supabase and enqueue the ARQ task."""
    job_result = supabase.table("jobs").insert({
        "workspace_id": workspace_id,
        "type": job_type,
        "status": "pending",
    }).execute()
    job_id = job_result.data[0]["id"]

    redis_settings = RedisSettings(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
    )
    arq = await create_pool(redis_settings)
    await arq.enqueue_job(task_name, workspace_id=workspace_id, job_id=job_id, **kwargs)
    await arq.aclose()

    return {"job_id": job_id, "status": "pending", "type": job_type}


@router.post("/pipeline/discover")
async def start_discover(
    workspace_id: str,
    req: DiscoverRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    _: None = Depends(check_plan_limit),
):
    return await _create_job(
        supabase, workspace_id, "discover", "run_discovery",
        mode=req.mode, keywords=req.keywords,
    )


@router.post("/pipeline/angle")
async def start_angle(
    workspace_id: str,
    req: AngleRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    _: None = Depends(check_plan_limit),
):
    return await _create_job(
        supabase, workspace_id, "angle", "run_angle_generation",
        topic_ids=req.topic_ids, format=req.format,
    )


@router.post("/pipeline/script")
async def start_script(
    workspace_id: str,
    req: ScriptRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    _: None = Depends(check_plan_limit),
):
    return await _create_job(
        supabase, workspace_id, "script", "run_script_generation",
        angle_id=req.angle_id, hook_ids=req.hook_ids,
    )


@router.post("/pipeline/analyze")
async def start_analyze(
    workspace_id: str,
    req: AnalyzeRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    return await _create_job(
        supabase, workspace_id, "analyze", "run_analytics",
        content_ids=req.content_ids,
    )


@router.post("/pipeline/rescore")
async def start_rescore(
    workspace_id: str,
    req: RescoreRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    return await _create_job(
        supabase, workspace_id, "rescore", "run_rescore",
    )


@router.get("/jobs")
async def list_jobs(
    workspace_id: str,
    status: str | None = Query(None),
    limit: int = Query(20, le=100),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("jobs").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/jobs/{job_id}")
async def get_job(
    workspace_id: str,
    job_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("jobs").select("*").eq("id", job_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data
