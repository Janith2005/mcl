"""Script generation background job."""


async def run_script_generation(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    angle_id: str,
    hook_ids: list[str] | None = None,
) -> dict:
    """ARQ task: generate a full script for an angle."""
    supabase = ctx["supabase"]

    supabase.table("jobs").update({"status": "running", "started_at": "now()"}).eq("id", job_id).execute()

    try:
        # Load angle
        angle = supabase.table("angles").select("*").eq("id", angle_id).single().execute()
        if not angle.data:
            raise ValueError(f"Angle {angle_id} not found")

        # AI script generation will be implemented with LLM integration
        # For now, update angle status
        supabase.table("angles").update({"status": "scripted"}).eq("id", angle_id).execute()

        supabase.table("jobs").update({
            "status": "complete",
            "completed_at": "now()",
            "result": {"angle_id": angle_id, "scripts_created": 1},
        }).eq("id", job_id).execute()

        return {"scripts_created": 1}

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed", "completed_at": "now()", "error": str(e),
        }).eq("id", job_id).execute()
        raise
