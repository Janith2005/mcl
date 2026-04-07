"""Workspace management routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from postgrest.exceptions import APIError
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str
    slug: str


class UpdateWorkspaceRequest(BaseModel):
    name: str | None = None
    workspace_name: str | None = None
    default_niche: str | None = None


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"


@router.get("")
async def list_workspaces(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("workspace_members").select(
        "workspace_id, role, workspaces(id, name, slug, plan, created_at)"
    ).eq("user_id", user["user_id"]).is_("workspaces.deleted_at", "null").execute()
    return result.data


@router.post("", status_code=201)
async def create_workspace(
    req: CreateWorkspaceRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    ws = supabase.table("workspaces").insert({
        "name": req.name,
        "slug": req.slug,
        "owner_id": user["user_id"],
    }).execute()

    workspace_id = ws.data[0]["id"]

    # Add owner as member
    supabase.table("workspace_members").insert({
        "workspace_id": workspace_id,
        "user_id": user["user_id"],
        "role": "owner",
        "accepted_at": "now()",
    }).execute()

    # Create empty brain
    supabase.table("brains").insert({
        "workspace_id": workspace_id,
        "data": {},
    }).execute()

    return ws.data[0]


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("workspaces").select("*").eq("id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return result.data


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    req: UpdateWorkspaceRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    # Normalize alias field
    if 'workspace_name' in update_data:
        update_data['name'] = update_data.pop('workspace_name')
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        result = supabase.table("workspaces").update(update_data).eq("id", workspace_id).execute()
    except APIError as exc:
        # Older schemas may not have `default_niche` on workspaces.
        # Retry without it so saving workspace name still works.
        detail = str(exc)
        if "default_niche" in detail and "workspaces" in detail:
            fallback_update = {k: v for k, v in update_data.items() if k != "default_niche"}
            if not fallback_update:
                return {"status": "updated"}
            result = supabase.table("workspaces").update(fallback_update).eq("id", workspace_id).execute()
        else:
            raise HTTPException(status_code=400, detail=detail) from exc
    return result.data[0] if result.data else {"status": "updated"}


@router.post("/{workspace_id}/invite")
async def invite_member(
    workspace_id: str,
    req: InviteMemberRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Optional best-effort member attach if admin lookup is supported by SDK.
    invitee = None
    try:
        admin_api = getattr(supabase.auth, "admin", None)
        lookup = getattr(admin_api, "get_user_by_email", None)
        if callable(lookup):
            invitee = lookup(req.email)
    except Exception:
        invitee = None

    user_id = getattr(getattr(invitee, "user", None), "id", None)
    if user_id:
        supabase.table("workspace_members").insert({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": req.role,
        }).execute()

    from app.services.email import send_invite
    delivery = "sent"
    try:
        send_invite(req.email, workspace_id, f"https://app.influencepirates.com/invite/{workspace_id}")
    except Exception:
        # In local/dev environments email providers are commonly unconfigured.
        delivery = "skipped"

    return {"status": "invited", "email": req.email, "delivery": delivery}
