"""Analytics job — analyzes content performance and evolves the agent brain."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client

from mcl_pipeline.prompts.analyze import get_analyze_system_prompt
from mcl_pipeline.prompts.update_brain import get_update_brain_system_prompt
from mcl_pipeline.schemas.analytics import AnalyticsEntry, AnalyticsMetrics
from mcl_pipeline.schemas.insight import Insight
from worker.jobs.brain_loader import load_brain, save_brain
from worker.jobs.supabase_storage import SupabaseStorage
from worker.llm import chat, chat_json

logger = logging.getLogger(__name__)


def _update_job(supabase: Client, job_id: str, status: str, **meta) -> None:
    update = {"status": status}
    if meta:
        update["result"] = meta
    try:
        supabase.table("jobs").update(update).eq("id", job_id).execute()
    except Exception as e:
        logger.error("Failed to update job %s: %s", job_id, e)


def _row_to_analytics_entry(row: dict) -> AnalyticsEntry:
    metrics_data = row.get("metrics") or {}
    return AnalyticsEntry(
        content_id=str(row.get("content_id") or row.get("id", "")),
        platform=row.get("platform", "youtube"),
        published_at=datetime.now(timezone.utc),
        analyzed_at=datetime.now(timezone.utc),
        days_since_publish=row.get("days_since_publish", 0),
        metrics=AnalyticsMetrics(
            views=metrics_data.get("views", 0),
            impressions=metrics_data.get("impressions", 0),
            ctr=metrics_data.get("ctr", 0.0),
            retention_30s=metrics_data.get("retention_30s", 0.0),
            avg_view_duration=metrics_data.get("avg_view_duration", 0),
            completion_rate=metrics_data.get("completion_rate", 0.0),
            likes=metrics_data.get("likes", 0),
            comments=metrics_data.get("comments", 0),
            shares=metrics_data.get("shares", 0),
            saves=metrics_data.get("saves", 0),
            subscribers_gained=metrics_data.get("subscribers_gained", 0),
            engagement_rate=metrics_data.get("engagement_rate", 0.0),
        ),
        hook_pattern=row.get("hook_pattern", ""),
        topic_category=row.get("topic_category", ""),
        pillar=row.get("pillar", ""),
        is_winner=row.get("is_winner", False),
        workspace_id=row.get("workspace_id"),
    )


def _analyze_performance(brain, entries: list[AnalyticsEntry]) -> dict:
    """Call LLM to generate performance insights."""
    if not entries:
        return {"insights": "No analytics data available yet.", "recommendations": []}

    system_prompt = get_analyze_system_prompt(brain, entries)

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                "Analyze the performance data and return a JSON object with: "
                "top_topics (array of strings — top 3 performing topic types), "
                "hook_performance (object mapping pattern name to performance rating 1-10), "
                "format_performance (object with 'longform' and 'shortform' ratings 1-10), "
                "recommendations (array of 3-5 specific action items as strings), "
                "brain_weight_adjustments (object with optional adjustments to: "
                "icp_relevance, timeliness, content_gap, proof_potential — each a float delta like +0.1 or -0.2, max ±0.3), "
                "summary (string, 2-3 sentences). "
                "No markdown. Raw JSON only."
            ),
        },
    ]

    try:
        return chat_json(messages)
    except Exception as e:
        logger.error("Analytics LLM call failed: %s", e)
        return {
            "top_topics": [],
            "recommendations": ["Add more analytics data for insights"],
            "brain_weight_adjustments": {},
            "summary": "Insufficient data for analysis.",
        }


def _evolve_brain_weights(brain, adjustments: dict) -> None:
    """Apply brain weight adjustments conservatively (max ±0.3 per cycle)."""
    if not adjustments:
        return

    weights = brain.learning_weights
    for field, delta in adjustments.items():
        if not hasattr(weights, field):
            continue
        # Clamp delta to ±0.3
        clamped = max(-0.3, min(0.3, float(delta)))
        current = getattr(weights, field)
        new_val = round(max(0.1, min(3.0, current + clamped)), 2)
        setattr(weights, field, new_val)


async def run_analytics(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    content_ids: list[str] | None = None,
) -> dict:
    """ARQ job: analyze performance data and evolve the agent brain."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")

    _update_job(supabase, job_id, "running")
    logger.info("[analyze] job=%s workspace=%s", job_id, workspace_id)

    try:
        brain = load_brain(supabase, workspace_id, redis)
        storage = SupabaseStorage(supabase, workspace_id)

        # Load analytics entries
        raw_entries = storage.load_analytics(limit=100)

        if content_ids:
            raw_entries = [e for e in raw_entries if str(e.get("content_id") or e.get("id")) in content_ids]

        entries = [_row_to_analytics_entry(r) for r in raw_entries]

        # Build minimal insight object for the update_brain prompt
        insight = Insight(
            last_updated=datetime.now(timezone.utc),
            analysis_count=len(entries),
            workspace_id=workspace_id,
        )

        # Generate insights
        analysis = _analyze_performance(brain, entries)

        # Evolve brain weights
        adjustments = analysis.get("brain_weight_adjustments", {})
        _evolve_brain_weights(brain, adjustments)

        brain.metadata.last_analysis = datetime.now(timezone.utc)

        # Save evolved brain
        save_brain(supabase, workspace_id, brain, redis)

        # Store insights in brain table's insights column
        try:
            supabase.table("brains").update({
                "insights": analysis,
            }).eq("workspace_id", workspace_id).execute()
        except Exception:
            pass  # Non-fatal if insights column doesn't exist

        logger.info("[analyze] completed, adjusted weights: %s", adjustments)

        _update_job(supabase, job_id, "completed",
                    entries_analyzed=len(entries),
                    adjustments=adjustments)
        return {"status": "completed", "entries_analyzed": len(entries)}

    except Exception as e:
        logger.error("[analyze] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
