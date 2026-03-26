"""Angle generation background job."""


async def run_angle_generation(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    topic_ids: list[str],
    format: str = "longform",
) -> dict:
    """ARQ task: generate content angles for selected topics."""
    supabase = ctx["supabase"]

    supabase.table("jobs").update({"status": "running", "started_at": "now()"}).eq("id", job_id).execute()

    try:
        angles_created = 0

        for topic_id in topic_ids:
            topic = supabase.table("topics").select("*").eq("id", topic_id).single().execute()
            if not topic.data:
                continue

            # AI angle generation will be implemented with LLM integration
            # For now, mark the topic as "developing"
            supabase.table("topics").update({"status": "developing"}).eq("id", topic_id).execute()
            angles_created += 1

        supabase.table("jobs").update({
            "status": "complete",
            "completed_at": "now()",
            "result": {"angles_created": angles_created},
        }).eq("id", job_id).execute()

        return {"angles_created": angles_created}

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed", "completed_at": "now()", "error": str(e),
        }).eq("id", job_id).execute()
        raise
