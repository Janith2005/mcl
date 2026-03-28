"""Recon routes - competitor scraping and skeleton ripper."""
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from arq import create_pool
from arq.connections import RedisSettings
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/recon", tags=["recon"])


class ScrapeRequest(BaseModel):
    competitor_handles: list[str]
    platform: str = "youtube"
    max_items: int = 20


class RipperRequest(BaseModel):
    video_urls: list[str]
    synthesis_mode: str = "detailed"


async def _enqueue(task_name: str, supabase: Client, workspace_id: str, job_type: str, **kwargs) -> dict:
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


@router.post("/scrape")
async def start_scrape(
    workspace_id: str,
    req: ScrapeRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    return await _enqueue(
        "run_scrape", supabase, workspace_id, "recon",
        competitor_handles=req.competitor_handles,
        platform=req.platform,
        max_items=req.max_items,
    )


@router.post("/ripper")
async def start_ripper(
    workspace_id: str,
    req: RipperRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    return await _enqueue(
        "run_ripper", supabase, workspace_id, "recon",
        video_urls=req.video_urls,
        synthesis_mode=req.synthesis_mode,
    )


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
