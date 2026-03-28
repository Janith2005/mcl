"""Rescore job — re-scores all active topics against the current brain weights."""
from __future__ import annotations

import logging

from supabase import Client

from mcl_pipeline.scoring.engine import score_topic
from worker.jobs.brain_loader import load_brain

logger = logging.getLogger(__name__)


def _update_job(supabase: Client, job_id: str, status: str, **meta) -> None:
    update = {"status": status}
    if meta:
        update["result"] = meta
    try:
        supabase.table("jobs").update(update).eq("id", job_id).execute()
    except Exception as e:
        logger.error("Failed to update job %s: %s", job_id, e)


async def run_rescore(
    ctx: dict,
    workspace_id: str,
    job_id: str,
) -> dict:
    """ARQ job: re-score all non-passed topics using current brain learning weights."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")

    _update_job(supabase, job_id, "running")
    logger.info("[rescore] job=%s workspace=%s", job_id, workspace_id)

    try:
        brain = load_brain(supabase, workspace_id, redis)

        # Load all active topics (not passed, not archived)
        result = supabase.table("topics").select(
            "id, title, description, source, scoring"
        ).eq("workspace_id", workspace_id).neq("status", "passed").execute()

        topics = result.data or []
        updated = 0

        for topic in topics:
            title = topic.get("title", "")
            description = topic.get("description", "") or ""
            source = topic.get("source") or {}
            views_str = source.get("engagement_signals", "0 views")

            # Parse view count from engagement_signals string (e.g. "12,345 views")
            try:
                views = int("".join(c for c in views_str.split(" ")[0] if c.isdigit()))
            except (ValueError, IndexError):
                views = 0

            new_scoring = score_topic(
                title=title,
                description=description,
                brain=brain,
                views=views,
                is_competitor=views > 0,
            )

            try:
                supabase.table("topics").update(
                    {"scoring": new_scoring}
                ).eq("id", topic["id"]).execute()
                updated += 1
            except Exception as e:
                logger.warning("[rescore] failed to update topic %s: %s", topic["id"], e)

        logger.info("[rescore] updated %d / %d topics", updated, len(topics))

        _update_job(supabase, job_id, "completed",
                    total=len(topics), updated=updated)
        return {"status": "completed", "total": len(topics), "updated": updated}

    except Exception as e:
        logger.error("[rescore] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
