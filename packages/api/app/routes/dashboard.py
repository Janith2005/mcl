"""Dashboard summary routes."""
from fastapi import APIRouter, Depends
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["dashboard"])

STAGE_COLORS = {
    "new": "var(--ip-stage-discover)",
    "scored": "var(--ip-stage-discover)",
    "developing": "var(--ip-stage-angle)",
    "hook": "var(--ip-stage-hook)",
    "scripted": "var(--ip-stage-script)",
    "published": "var(--ip-stage-publish)",
}


@router.get("/dashboard/stages")
async def get_pipeline_stages(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Return counts per pipeline stage for the funnel widget."""
    topics_result = supabase.table("topics").select("status").eq("workspace_id", workspace_id).execute()
    topics = topics_result.data or []

    counts: dict[str, int] = {"new": 0, "developing": 0, "scripted": 0, "published": 0}
    for t in topics:
        s = t.get("status", "new")
        counts[s] = counts.get(s, 0) + 1

    angles_result = supabase.table("angles").select("id", count="exact").eq("workspace_id", workspace_id).execute()
    angle_count = angles_result.count or 0

    scripts_result = supabase.table("scripts").select("id", count="exact").eq("workspace_id", workspace_id).execute()
    script_count = scripts_result.count or 0

    return [
        {"label": "Discover", "count": counts.get("new", 0) + counts.get("scored", 0), "color": "var(--ip-stage-discover)"},
        {"label": "Angle", "count": angle_count, "color": "var(--ip-stage-angle)"},
        {"label": "Hook", "count": counts.get("hook", 0), "color": "var(--ip-stage-hook)"},
        {"label": "Script", "count": script_count, "color": "var(--ip-stage-script)"},
        {"label": "Publish", "count": counts.get("published", 0), "color": "var(--ip-stage-publish)"},
    ]


@router.get("/dashboard/feed")
async def get_activity_feed(
    workspace_id: str,
    limit: int = 10,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Return recent activity feed items."""
    jobs_result = (
        supabase.table("jobs")
        .select("id, type, status, created_at, result")
        .eq("workspace_id", workspace_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    jobs = jobs_result.data or []

    TYPE_LABELS = {
        "discover": "Discovery run completed",
        "angle": "Angles generated",
        "script": "Script drafted",
        "analyze": "Analytics processed",
        "rescore": "Topics rescored",
    }

    TYPE_MAP = {
        "discover": "discover",
        "angle": "angle",
        "script": "script",
        "analyze": "analytics",
        "rescore": "discover",
    }

    return [
        {
            "id": j["id"],
            "type": TYPE_MAP.get(j["type"], "hook"),
            "title": f"{TYPE_LABELS.get(j['type'], j['type'])} — {j['status']}",
            "created_at": j["created_at"],
        }
        for j in jobs
    ]
