"""Angle routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/angles", tags=["angles"])


class CreateAngleRequest(BaseModel):
    external_id: str
    topic_id: str | None = None
    format: str
    title: str = ""
    contrast: dict = {}
    target_audience: str = ""
    pain_addressed: str = ""
    proof_method: str = ""
    content_job: str = ""
    status: str = "draft"


class UpdateAngleRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    title: str | None = None


@router.get("")
async def list_angles(
    workspace_id: str,
    status: str | None = Query(None),
    topic_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("angles").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    if topic_id:
        query = query.eq("topic_id", topic_id)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data


@router.post("", status_code=201)
async def create_angle(
    workspace_id: str,
    req: CreateAngleRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("angles").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/{angle_id}")
async def get_angle(
    workspace_id: str,
    angle_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("angles").select("*").eq("id", angle_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Angle not found")
    return result.data


@router.put("/{angle_id}")
async def update_angle(
    workspace_id: str,
    angle_id: str,
    req: UpdateAngleRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("angles").update(update_data).eq("id", angle_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return result.data[0] if result.data else {"status": "updated"}
