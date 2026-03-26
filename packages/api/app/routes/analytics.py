"""Analytics routes."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["analytics"])


class CreateAnalyticsRequest(BaseModel):
    external_id: str
    content_id: str | None = None
    platform: str
    metrics: dict = {}
    hook_pattern_used: str = ""
    topic_category: str = ""
    content_pillar: str = ""
    is_winner: bool = False
    winner_reason: str = ""


@router.get("/analytics")
async def list_entries(
    workspace_id: str,
    is_winner: bool | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("analytics_entries").select("*").eq("workspace_id", workspace_id)
    if is_winner is not None:
        query = query.eq("is_winner", is_winner)
    result = query.order("analyzed_at", desc=True).limit(limit).execute()
    return result.data


@router.post("/analytics", status_code=201)
async def create_entry(
    workspace_id: str,
    req: CreateAnalyticsRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("analytics_entries").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/insights")
async def get_insights(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("insights").select("data, last_updated").eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        return {"data": {}, "last_updated": None}
    return result.data
