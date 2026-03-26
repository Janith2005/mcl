"""System monitoring and metrics routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from supabase import Client

from app.deps import get_supabase
from app.routes.admin import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin", "monitoring"])


@router.get("/metrics")
async def get_system_metrics(
    _admin: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    """Return high-level system metrics for the monitoring dashboard.

    Metrics returned:
    - active_workspaces: count of non-deleted workspaces
    - total_users: distinct user count from workspace_members
    - jobs_today: count of jobs created today
    - jobs_failed_today: count of failed jobs created today
    - active_subscriptions: count grouped by plan name
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0,
    ).isoformat()

    # Active workspaces (not soft-deleted)
    ws_result = (
        supabase.table("workspaces")
        .select("id", count="exact")
        .is_("deleted_at", "null")
        .execute()
    )
    active_workspaces = ws_result.count or 0

    # Total distinct users
    members_result = (
        supabase.table("workspace_members")
        .select("user_id", count="exact")
        .execute()
    )
    total_users = members_result.count or 0

    # Jobs created today
    jobs_today_result = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", today_start)
        .execute()
    )
    jobs_today = jobs_today_result.count or 0

    # Failed jobs today
    jobs_failed_result = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", today_start)
        .eq("status", "failed")
        .execute()
    )
    jobs_failed_today = jobs_failed_result.count or 0

    # Active subscriptions grouped by plan
    subs_result = (
        supabase.table("subscriptions")
        .select("plan_id, plans(name)")
        .eq("status", "active")
        .execute()
    )
    plan_counts: dict[str, int] = {}
    for sub in subs_result.data or []:
        plan_name = "unknown"
        plans = sub.get("plans")
        if isinstance(plans, dict):
            plan_name = plans.get("name", "unknown")
        plan_counts[plan_name] = plan_counts.get(plan_name, 0) + 1

    return {
        "active_workspaces": active_workspaces,
        "total_users": total_users,
        "jobs_today": jobs_today,
        "jobs_failed_today": jobs_failed_today,
        "active_subscriptions": plan_counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
