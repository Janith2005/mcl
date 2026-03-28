"""Workspace lookup helpers."""
import os
from supabase import Client

DEV_SKIP_AUTH = os.environ.get("DEV_SKIP_AUTH", "").lower() == "true"
DEV_WORKSPACE_ID = "00000000-0000-0000-0000-000000000002"


def get_workspace_id_for_user(supabase: Client, user_id: str) -> str:
    """Return the primary workspace ID for a user."""
    if DEV_SKIP_AUTH:
        return DEV_WORKSPACE_ID
    result = supabase.table("workspace_members").select("workspace_id").eq(
        "user_id", user_id
    ).order("invited_at").limit(1).execute()
    if result.data:
        return result.data[0]["workspace_id"]
    return DEV_WORKSPACE_ID
