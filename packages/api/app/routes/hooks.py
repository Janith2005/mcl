"""Hook routes (generated hooks + swipe hooks)."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["hooks"])


class CreateHookRequest(BaseModel):
    external_id: str
    angle_id: str | None = None
    platform: str
    pattern: str
    hook_text: str
    visual_cue: str = ""
    score: dict = {}
    status: str = "draft"


@router.get("/hooks")
async def list_hooks(
    workspace_id: str,
    angle_id: str | None = Query(None),
    pattern: str | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("hooks").select("*").eq("workspace_id", workspace_id)
    if angle_id:
        query = query.eq("angle_id", angle_id)
    if pattern:
        query = query.eq("pattern", pattern)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.post("/hooks", status_code=201)
async def create_hook(
    workspace_id: str,
    req: CreateHookRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("hooks").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/swipe-hooks")
async def list_swipe_hooks(
    workspace_id: str,
    pattern: str | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("swipe_hooks").select("*").eq("workspace_id", workspace_id)
    if pattern:
        query = query.eq("pattern", pattern)
    result = query.order("saved_at", desc=True).limit(limit).execute()
    return result.data
