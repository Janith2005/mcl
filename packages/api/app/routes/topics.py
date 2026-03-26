"""Topic routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/topics", tags=["topics"])


class CreateTopicRequest(BaseModel):
    external_id: str
    title: str
    description: str = ""
    source: dict = {}
    scoring: dict = {}
    pillars: list[str] = []
    status: str = "new"


class UpdateTopicRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    scoring: dict | None = None


@router.get("")
async def list_topics(
    workspace_id: str,
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("topics").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    result = query.order("discovered_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data


@router.post("", status_code=201)
async def create_topic(
    workspace_id: str,
    req: CreateTopicRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("topics").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/{topic_id}")
async def get_topic(
    workspace_id: str,
    topic_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("topics").select("*").eq("id", topic_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Topic not found")
    return result.data


@router.put("/{topic_id}")
async def update_topic(
    workspace_id: str,
    topic_id: str,
    req: UpdateTopicRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("topics").update(update_data).eq("id", topic_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return result.data[0] if result.data else {"status": "updated"}


@router.delete("/{topic_id}")
async def delete_topic(
    workspace_id: str,
    topic_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("topics").delete().eq("id", topic_id).eq("workspace_id", workspace_id).execute()
    return {"status": "deleted"}
