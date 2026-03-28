"""Dev-only bootstrap endpoint — creates a real workspace+user in Supabase for local dev."""
import os
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.deps import get_supabase

DEV_SKIP_AUTH = os.environ.get("DEV_SKIP_AUTH", "").lower() == "true"
DEV_EMAIL = "dev@localhost.dev"
DEV_WORKSPACE_ID = "00000000-0000-0000-0000-000000000002"

router = APIRouter(prefix="/api/v1/dev", tags=["dev"])


@router.post("/setup")
async def dev_setup(supabase: Client = Depends(get_supabase)):
    """Idempotent: creates dev auth user + workspace if they don't exist."""
    if not DEV_SKIP_AUTH:
        raise HTTPException(status_code=403, detail="Only available in dev mode")

    # Fast path: if workspace already exists, return immediately
    existing = supabase.table("workspaces").select("id").eq("id", DEV_WORKSPACE_ID).execute()
    if existing.data:
        return {"workspace_id": DEV_WORKSPACE_ID, "status": "already_exists"}

    # Create dev user in auth.users (ignore if already exists)
    user_id = "00000000-0000-0000-0000-000000000001"
    try:
        result = supabase.auth.admin.create_user({
            "id": user_id,
            "email": DEV_EMAIL,
            "password": "dev-password-local-only",
            "email_confirm": True,
        })
        user_id = result.user.id
    except Exception:
        # User exists — try to look up their actual ID
        try:
            page = supabase.auth.admin.list_users()
            users = page if isinstance(page, list) else getattr(page, 'users', [])
            for u in users:
                if getattr(u, 'email', None) == DEV_EMAIL:
                    user_id = u.id
                    break
        except Exception:
            pass  # Fall back to hardcoded UUID

    # Create workspace
    supabase.table("workspaces").upsert({
        "id": DEV_WORKSPACE_ID,
        "name": "Dev Workspace",
        "slug": "dev-workspace",
        "owner_id": user_id,
    }, on_conflict="id").execute()

    # Create workspace member
    supabase.table("workspace_members").upsert({
        "workspace_id": DEV_WORKSPACE_ID,
        "user_id": user_id,
        "role": "owner",
        "accepted_at": "now()",
    }, on_conflict="workspace_id,user_id").execute()

    # Create brain
    supabase.table("brains").upsert({
        "workspace_id": DEV_WORKSPACE_ID,
        "data": {},
    }, on_conflict="workspace_id").execute()

    return {"workspace_id": DEV_WORKSPACE_ID, "user_id": user_id}
