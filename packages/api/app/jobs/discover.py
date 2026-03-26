"""Discovery background job."""
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.channels.registry import registry


async def run_discovery(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    mode: str = "both",
    keywords: list[str] | None = None,
) -> dict:
    """ARQ task: run topic discovery pipeline."""
    supabase = ctx["supabase"]

    # Update job status
    supabase.table("jobs").update({"status": "running", "started_at": "now()"}).eq("id", job_id).execute()

    try:
        # Load brain
        result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
        brain = AgentBrain.model_validate(result.data["data"])

        topics = []

        if mode in ("competitors", "both"):
            for competitor in brain.competitors:
                channel_cls = registry.get_discover(competitor.platform)
                if channel_cls:
                    channel = channel_cls()
                    try:
                        items = await channel.scrape_competitor(competitor)
                        topics.extend(items)
                    except NotImplementedError:
                        pass

        if mode in ("keywords", "both"):
            kws = keywords or []
            for pillar in brain.pillars:
                kws.extend(pillar.keywords)
            # Keyword discovery across channels - Phase 6 implementation

        # Save topics to Supabase
        for topic in topics:
            supabase.table("topics").upsert({
                "workspace_id": workspace_id,
                "external_id": topic.get("id", ""),
                "title": topic.get("title", ""),
                "description": topic.get("description", ""),
                "source": topic.get("source", {}),
                "scoring": topic.get("scoring", {}),
                "status": "new",
            }).execute()

        # Mark complete
        supabase.table("jobs").update({
            "status": "complete",
            "completed_at": "now()",
            "result": {"topics_found": len(topics)},
        }).eq("id", job_id).execute()

        return {"topics_found": len(topics)}

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed",
            "completed_at": "now()",
            "error": str(e),
        }).eq("id", job_id).execute()
        raise
