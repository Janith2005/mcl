"""Analytics routes."""
import io
import csv
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["analytics"])


class CreateAnalyticsRequest(BaseModel):
    external_id: str = ""
    content_id: str | None = None
    platform: str
    metrics: dict = {}
    hook_pattern_used: str = ""
    topic_category: str = ""
    content_pillar: str = ""
    is_winner: bool = False
    winner_reason: str = ""


@router.get("/analytics")
async def list_entries(
    workspace_id: str,
    range: str = Query("30d"),
    is_winner: bool | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Return analytics data structured for the frontend dashboard."""
    query = supabase.table("analytics_entries").select("*").eq("workspace_id", workspace_id)
    if is_winner is not None:
        query = query.eq("is_winner", is_winner)
    result = query.order("analyzed_at", desc=True).limit(limit).execute()
    entries = result.data or []

    # Build top_performers from winner entries
    top_performers = []
    for e in entries:
        if e.get("is_winner"):
            metrics = e.get("metrics") or {}
            views_raw = metrics.get("views", 0)
            top_performers.append({
                "id": e["id"],
                "title": e.get("winner_reason") or e.get("topic_category") or "Top Content",
                "published_at": e.get("analyzed_at", ""),
                "views": f"{views_raw:,}" if isinstance(views_raw, int) else str(views_raw),
                "views_raw": views_raw if isinstance(views_raw, int) else 0,
                "trend": "up",
                "trend_label": "+trending",
                "category_label": e.get("topic_category") or "General",
                "category_color": "var(--ip-primary)",
                "accent_color": "var(--ip-stage-discover)",
            })

    # Build hook_pattern_data
    pattern_stats: dict = {}
    for e in entries:
        pattern = e.get("hook_pattern_used") or "Unknown"
        metrics = e.get("metrics") or {}
        views = metrics.get("views", 0)
        ctr = metrics.get("click_through_rate", 0)
        if pattern not in pattern_stats:
            pattern_stats[pattern] = {"count": 0, "total_views": 0, "total_ctr": 0}
        pattern_stats[pattern]["count"] += 1
        pattern_stats[pattern]["total_views"] += views if isinstance(views, (int, float)) else 0
        pattern_stats[pattern]["total_ctr"] += ctr if isinstance(ctr, (int, float)) else 0

    colors = ["var(--ip-primary)", "var(--ip-accent-maroon)", "var(--ip-stage-hook)", "var(--ip-stage-script)"]
    hook_pattern_data = [
        {
            "label": pattern,
            "avg_view": int(stats["total_views"] / stats["count"]) if stats["count"] else 0,
            "click_through": round(stats["total_ctr"] / stats["count"], 1) if stats["count"] else 0,
            "color": colors[i % len(colors)],
        }
        for i, (pattern, stats) in enumerate(pattern_stats.items())
    ]

    # Pipeline health stages from topics + scripts
    topics_result = supabase.table("topics").select("status").eq("workspace_id", workspace_id).execute()
    topics = topics_result.data or []
    total_topics = len(topics) or 1
    status_counts: dict = {}
    for t in topics:
        s = t.get("status", "new")
        status_counts[s] = status_counts.get(s, 0) + 1

    pipeline_stages = [
        {"label": "Discover", "count": status_counts.get("new", 0), "total": total_topics,
         "percent": round(status_counts.get("new", 0) / total_topics * 100), "pill_label": "Discovered", "color": "var(--ip-stage-discover)"},
        {"label": "Score", "count": status_counts.get("scored", 0), "total": total_topics,
         "percent": round(status_counts.get("scored", 0) / total_topics * 100), "pill_label": "Scored", "color": "var(--ip-primary)"},
        {"label": "Script", "count": status_counts.get("scripted", 0), "total": total_topics,
         "percent": round(status_counts.get("scripted", 0) / total_topics * 100), "pill_label": "Scripted", "color": "var(--ip-stage-script)"},
        {"label": "Publish", "count": status_counts.get("published", 0), "total": total_topics,
         "percent": round(status_counts.get("published", 0) / total_topics * 100), "pill_label": "Published", "color": "var(--ip-stage-publish)"},
    ]

    # Tactical log — recent non-winner entries as performance log
    tactical_log = [
        {
            "title": e.get("topic_category") or "Content",
            "subtitle": e.get("hook_pattern_used") or "Hook pattern",
            "views": str((e.get("metrics") or {}).get("views", "—")),
            "engagement": str((e.get("metrics") or {}).get("engagement_rate", "—")),
            "feedback": e.get("winner_reason") or "Analyzed",
            "avatar": e.get("content_pillar") or "G",
        }
        for e in entries[:5]
    ]

    return {
        "top_performers": top_performers,
        "hook_pattern_data": hook_pattern_data,
        "pipeline_stages": pipeline_stages,
        "tactical_log": tactical_log,
    }


@router.post("/analytics", status_code=201)
async def create_entry(
    workspace_id: str,
    req: CreateAnalyticsRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("analytics_entries").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/analytics/export")
async def export_analytics(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Export analytics entries as CSV."""
    result = supabase.table("analytics_entries").select("*").eq(
        "workspace_id", workspace_id
    ).order("analyzed_at", desc=True).execute()
    entries = result.data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "platform", "topic_category", "content_pillar", "hook_pattern_used",
                     "is_winner", "winner_reason", "analyzed_at"])
    for e in entries:
        writer.writerow([
            e.get("id"), e.get("platform"), e.get("topic_category"),
            e.get("content_pillar"), e.get("hook_pattern_used"),
            e.get("is_winner"), e.get("winner_reason"), e.get("analyzed_at"),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="analytics-report.csv"'},
    )


@router.get("/insights")
async def get_insights(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("insights").select("data, last_updated").eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        return {"data": {}, "last_updated": None}
    return result.data
