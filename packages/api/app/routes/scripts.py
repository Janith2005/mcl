"""Script routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/scripts", tags=["scripts"])


class CreateScriptRequest(BaseModel):
    external_id: str
    angle_id: str | None = None
    platform: str
    title: str
    script_structure: dict | None = None
    filming_cards: list[dict] = []
    shortform_structure: dict | None = None
    estimated_duration: str = ""
    status: str = "draft"


class UpdateScriptRequest(BaseModel):
    title: str | None = None
    status: str | None = None
    script_structure: dict | None = None
    filming_cards: list[dict] | None = None
    shortform_structure: dict | None = None
    notes: str | None = None


@router.get("")
async def list_scripts(
    workspace_id: str,
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("scripts").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data


@router.post("", status_code=201)
async def create_script(
    workspace_id: str,
    req: CreateScriptRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("scripts").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/{script_id}")
async def get_script(
    workspace_id: str,
    script_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("scripts").select("*").eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")
    return result.data


@router.put("/{script_id}")
async def update_script(
    workspace_id: str,
    script_id: str,
    req: UpdateScriptRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("scripts").update(update_data).eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return result.data[0] if result.data else {"status": "updated"}


@router.patch("/{script_id}/publish")
async def publish_script(
    workspace_id: str,
    script_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("scripts").update({"status": "published"}).eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return {"status": "published", "script_id": script_id}
