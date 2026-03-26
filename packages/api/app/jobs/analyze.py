"""Analytics collection background job."""


async def run_analytics(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    content_ids: list[str] | None = None,
) -> dict:
    """ARQ task: collect and analyze performance data."""
    supabase = ctx["supabase"]

    supabase.table("jobs").update({"status": "running", "started_at": "now()"}).eq("id", job_id).execute()

    try:
        # If no specific content_ids, get all published scripts
        if not content_ids:
            result = supabase.table("scripts").select("id").eq(
                "workspace_id", workspace_id
            ).eq("status", "published").execute()
            content_ids = [r["id"] for r in result.data]

        entries_created = 0

        for content_id in content_ids:
            # Analytics collection will use platform APIs (Phase 6)
            entries_created += 1

        supabase.table("jobs").update({
            "status": "complete",
            "completed_at": "now()",
            "result": {"entries_analyzed": entries_created},
        }).eq("id", job_id).execute()

        return {"entries_analyzed": entries_created}

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed", "completed_at": "now()", "error": str(e),
        }).eq("id", job_id).execute()
        raise
