"""Recon routes - competitor scraping and skeleton ripper."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from redis.asyncio import Redis
from arq.connections import ArqRedis
from app.deps import get_supabase, get_redis
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/recon", tags=["recon"])


class ScrapeRequest(BaseModel):
    competitor_handles: list[str]
    platform: str = "youtube"
    max_items: int = 20


class RipperRequest(BaseModel):
    video_urls: list[str]
    synthesis_mode: str = "detailed"  # detailed | summary


@router.post("/scrape")
async def start_scrape(
    workspace_id: str,
    req: ScrapeRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    redis: Redis = Depends(get_redis),
):
    job_result = supabase.table("jobs").insert({
        "workspace_id": workspace_id,
        "type": "recon",
        "status": "pending",
    }).execute()
    job_id = job_result.data[0]["id"]

    arq = ArqRedis(redis)
    await arq.enqueue_job(
        "run_scrape",
        workspace_id=workspace_id,
        job_id=job_id,
        competitor_handles=req.competitor_handles,
        platform=req.platform,
        max_items=req.max_items,
    )

    return {"job_id": job_id, "status": "pending", "type": "recon"}


@router.post("/ripper")
async def start_ripper(
    workspace_id: str,
    req: RipperRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    redis: Redis = Depends(get_redis),
):
    job_result = supabase.table("jobs").insert({
        "workspace_id": workspace_id,
        "type": "recon",
        "status": "pending",
    }).execute()
    job_id = job_result.data[0]["id"]

    arq = ArqRedis(redis)
    await arq.enqueue_job(
        "run_ripper",
        workspace_id=workspace_id,
        job_id=job_id,
        video_urls=req.video_urls,
        synthesis_mode=req.synthesis_mode,
    )

    return {"job_id": job_id, "status": "pending", "type": "recon"}


@router.get("/reports")
async def list_reports(
    workspace_id: str,
    limit: int = Query(20, le=100),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("skeleton_reports").select("*").eq(
        "workspace_id", workspace_id
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/reports/{report_id}")
async def get_report(
    workspace_id: str,
    report_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("skeleton_reports").select("*").eq("id", report_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return result.data
