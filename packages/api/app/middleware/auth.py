"""JWT and API key authentication."""
import os
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.deps import get_supabase

security = HTTPBearer(auto_error=False)

DEV_SKIP_AUTH = os.environ.get("DEV_SKIP_AUTH", "").lower() == "true"
# Fixed UUID must match the one created by /api/v1/dev/setup
DEV_USER = {"user_id": "00000000-0000-0000-0000-000000000001", "email": "dev@localhost.dev"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Verify JWT or API key and return user info."""
    if DEV_SKIP_AUTH:
        return DEV_USER

    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    # Try JWT first
    try:
        user = supabase.auth.get_user(token)
        return {"user_id": user.user.id, "email": user.user.email}
    except Exception:
        pass

    # Try API key (prefixed with "mcl_")
    if token.startswith("mcl_"):
        prefix = token[:12]
        result = supabase.table("api_keys").select("*").eq("key_prefix", prefix).execute()
        if result.data:
            import bcrypt
            key_data = result.data[0]
            if bcrypt.checkpw(token.encode(), key_data["key_hash"].encode()):
                supabase.table("api_keys").update(
                    {"last_used_at": "now()"}
                ).eq("id", key_data["id"]).execute()
                return {
                    "user_id": key_data["user_id"],
                    "workspace_id": key_data["workspace_id"],
                }

    raise HTTPException(status_code=401, detail="Invalid credentials")
