"""Rescore background job - re-score all topics with updated brain weights."""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.scoring.engine import score_topic


async def run_rescore(
    ctx: dict,
    workspace_id: str,
    job_id: str,
) -> dict:
    """ARQ task: rescore all non-passed topics with current brain weights."""
    supabase = ctx["supabase"]

    supabase.table("jobs").update({"status": "running", "started_at": "now()"}).eq("id", job_id).execute()

    try:
        # Load brain
        brain_result = supabase.table("brains").select("data").eq(
            "workspace_id", workspace_id
        ).single().execute()
        brain = AgentBrain.model_validate(brain_result.data["data"])

        # Load all active topics
        topics_result = supabase.table("topics").select("*").eq(
            "workspace_id", workspace_id
        ).neq("status", "passed").execute()

        rescored = 0
        for topic_data in topics_result.data:
            scores = score_topic(
                title=topic_data["title"],
                description=topic_data.get("description", ""),
                brain=brain,
            )
            supabase.table("topics").update({
                "scoring": scores,
            }).eq("id", topic_data["id"]).execute()
            rescored += 1

        supabase.table("jobs").update({
            "status": "complete",
            "completed_at": "now()",
            "result": {"topics_rescored": rescored},
        }).eq("id", job_id).execute()

        return {"topics_rescored": rescored}

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed", "completed_at": "now()", "error": str(e),
        }).eq("id", job_id).execute()
        raise
