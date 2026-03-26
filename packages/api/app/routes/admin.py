"""Admin routes for beta access management and system monitoring."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import Client
from redis.asyncio import Redis

from app.deps import get_supabase, get_redis
from app.middleware.auth import get_current_user
from app.middleware.beta_gate import BETA_ALLOWLIST_KEY

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def require_admin(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Ensure the current user is a workspace owner (admin).

    For MVP we check that the user owns at least one workspace.
    """
    result = (
        supabase.table("workspace_members")
        .select("role")
        .eq("user_id", user["user_id"])
        .eq("role", "owner")
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Beta Access Management
# ---------------------------------------------------------------------------

class BetaAccessRequest(BaseModel):
    email: EmailStr


@router.post("/beta-access", status_code=201)
async def add_beta_access(
    req: BetaAccessRequest,
    _admin: dict = Depends(require_admin),
    redis: Redis = Depends(get_redis),
):
    """Add an email to the beta allowlist."""
    await redis.sadd(BETA_ALLOWLIST_KEY, req.email)
    return {"status": "added", "email": req.email}


@router.delete("/beta-access")
async def remove_beta_access(
    req: BetaAccessRequest,
    _admin: dict = Depends(require_admin),
    redis: Redis = Depends(get_redis),
):
    """Remove an email from the beta allowlist."""
    removed = await redis.srem(BETA_ALLOWLIST_KEY, req.email)
    if not removed:
        raise HTTPException(status_code=404, detail="Email not in allowlist")
    return {"status": "removed", "email": req.email}


@router.get("/beta-access")
async def list_beta_access(
    _admin: dict = Depends(require_admin),
    redis: Redis = Depends(get_redis),
):
    """List all emails in the beta allowlist."""
    members = await redis.smembers(BETA_ALLOWLIST_KEY)
    return {"emails": sorted(members)}
