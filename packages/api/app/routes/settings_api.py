"""Settings routes — API key management (third-party keys stored in brain config)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.lib.workspace import get_workspace_id_for_user

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class ApiKeyRequest(BaseModel):
    name: str   # e.g. "OpenAI", "Claude (Anthropic)"
    key: str    # The raw key value


@router.post("/api-keys")
async def configure_api_key(
    req: ApiKeyRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Store a third-party API key reference in brain config (masked for display)."""
    if not req.key or len(req.key) < 8:
        raise HTTPException(status_code=400, detail="Key too short")

    workspace_id = get_workspace_id_for_user(supabase, user["user_id"])

    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    brain_data: dict = dict((result.data or {}).get("data") or {})

    keys: dict = dict(brain_data.get("third_party_keys") or {})
    # Store only masked version — never store raw keys in DB
    keys[req.name] = {
        "masked": f"{'•' * 8}{req.key[-4:]}",
        "configured": True,
    }
    brain_data["third_party_keys"] = keys

    supabase.table("brains").update({"data": brain_data}).eq("workspace_id", workspace_id).execute()

    return {"status": "saved", "name": req.name, "masked": keys[req.name]["masked"]}


@router.get("/api-keys")
async def list_api_keys(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    workspace_id = get_workspace_id_for_user(supabase, user["user_id"])
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    brain_data = (result.data or {}).get("data") or {}
    keys = brain_data.get("third_party_keys") or {}
    return [{"name": name, **info} for name, info in keys.items()]
