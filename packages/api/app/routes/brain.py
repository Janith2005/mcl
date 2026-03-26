"""Agent brain routes."""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from mcl_pipeline.schemas.brain import AgentBrain
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.middleware.cache import cache_brain, get_cached_brain, invalidate_brain_cache

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/brain", tags=["brain"])


@router.get("")
async def get_brain(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Check Redis cache first
    cached = await get_cached_brain(workspace_id)
    if cached is not None:
        return cached

    result = supabase.table("brains").select("data, version").eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data or not result.data["data"]:
        raise HTTPException(status_code=404, detail="Brain not found. Run onboarding first.")

    # Cache on read
    await cache_brain(workspace_id, result.data)
    return result.data


@router.put("")
async def update_brain(
    workspace_id: str,
    brain: AgentBrain,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    data = brain.model_dump(mode="json")
    supabase.table("brains").upsert({
        "workspace_id": workspace_id,
        "data": data,
        "updated_by": user["user_id"],
    }).execute()

    # Invalidate cache on write
    await invalidate_brain_cache(workspace_id)
    return {"status": "updated"}
