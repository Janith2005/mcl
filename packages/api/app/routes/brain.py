"""Agent brain routes."""
import io
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
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

    # Flatten: merge brain data fields with metadata so the frontend can read them directly
    brain_data = result.data.get("data") or {}
    response = {
        "demographics": brain_data.get("demographics", ""),
        "pain_points": brain_data.get("pain_points", ""),
        "desires": brain_data.get("desires", ""),
        "guardrails": brain_data.get("guardrails", []),
        "insights": brain_data.get("insights", []),
        "usage_mins": brain_data.get("usage_mins", 0),
        "usage_limit": brain_data.get("usage_limit", 1000),
        "version": result.data.get("version", 1),
    }

    # Cache on read
    await cache_brain(workspace_id, response)
    return response


class GuardrailRequest(BaseModel):
    title: str
    description: str
    severity: str = "medium"


@router.post("/sync")
async def sync_brain(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Trigger a brain sync — updates version timestamp and invalidates cache."""
    result = supabase.table("brains").select("data, version").eq(
        "workspace_id", workspace_id
    ).single().execute()

    if not result.data:
        # Initialize brain if it doesn't exist
        supabase.table("brains").insert({
            "workspace_id": workspace_id,
            "data": {"guardrails": [], "insights": [], "usage_mins": 0, "usage_limit": 1000},
            "version": 1,
        }).execute()
        await invalidate_brain_cache(workspace_id)
        return {"status": "initialized", "version": 1}

    new_version = (result.data.get("version") or 0) + 1
    supabase.table("brains").update({
        "version": new_version,
        "updated_by": user["user_id"],
    }).eq("workspace_id", workspace_id).execute()
    await invalidate_brain_cache(workspace_id)
    return {"status": "synced", "version": new_version}


@router.get("/export")
async def export_brain(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Export the brain schema as JSON."""
    result = supabase.table("brains").select("data, version").eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Brain not found.")
    payload = json.dumps(result.data, indent=2, default=str).encode()
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="brain-schema.json"'},
    )


@router.post("/guardrails")
async def add_guardrail(
    workspace_id: str,
    req: GuardrailRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Add a guardrail to the brain data."""
    result = supabase.table("brains").select("data").eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Brain not found.")
    data = result.data.get("data") or {}
    guardrails = data.get("guardrails") or []
    new_guardrail = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
    }
    guardrails.append(new_guardrail)
    data["guardrails"] = guardrails
    supabase.table("brains").update({"data": data}).eq("workspace_id", workspace_id).execute()
    await invalidate_brain_cache(workspace_id)
    return new_guardrail


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
