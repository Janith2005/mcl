"""Angle generation job — generates Contrast Formula angles for a set of topics."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from supabase import Client

from mcl_pipeline.prompts.angle import get_angle_system_prompt
from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
from worker.jobs.brain_loader import load_brain, load_document_context
from worker.jobs.supabase_storage import SupabaseStorage
from worker.llm import chat_json

logger = logging.getLogger(__name__)


def _update_job(supabase: Client, job_id: str, status: str, **meta) -> None:
    update = {"status": status}
    if meta:
        update["result"] = meta
    try:
        supabase.table("jobs").update(update).eq("id", job_id).execute()
    except Exception as e:
        logger.error("Failed to update job %s: %s", job_id, e)


def _row_to_topic(row: dict) -> Topic:
    """Convert a Supabase topics row into a Topic pydantic model."""
    source_data = row.get("source") or {}
    scoring_data = row.get("scoring") or {}

    source = TopicSource(
        platform=source_data.get("platform", "unknown"),
        url=source_data.get("url", ""),
        author=source_data.get("author", ""),
        engagement_signals=source_data.get("engagement_signals", ""),
    )

    scoring = TopicScoring(
        icp_relevance=scoring_data.get("icp_relevance", 5),
        timeliness=scoring_data.get("timeliness", 5),
        content_gap=scoring_data.get("content_gap", 5),
        proof_potential=scoring_data.get("proof_potential", 5),
        total=scoring_data.get("total", 20),
        weighted_total=float(scoring_data.get("weighted_total", 20.0)),
    )

    return Topic(
        id=str(row["id"]),
        title=row.get("title", ""),
        description=row.get("description", "") or "",
        source=source,
        discovered_at=datetime.now(timezone.utc),
        scoring=scoring,
        pillars=row.get("pillars") or [],
        status=row.get("status", "discovered"),
        notes=row.get("notes", "") or "",
        workspace_id=row.get("workspace_id"),
    )


def _generate_angles_for_topic(brain, topic: Topic, content_format: str, doc_context: str = "") -> list[dict]:
    """Call LLM to generate angles for a single topic."""
    system_prompt = get_angle_system_prompt(brain, topic)
    if doc_context:
        system_prompt += f"\n\n## Brand Voice Reference\nUse the creator's documented style and tone:\n\n{doc_context}"

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Generate 4 angles for the topic '{topic.title}' using the Contrast Formula. "
                f"Format: {content_format}. "
                "Return a JSON array of objects. Each object must have: "
                "title (string), "
                "contrast (object with: common_belief, surprising_truth, contrast_strength ['mild'|'moderate'|'strong'|'extreme']), "
                "target_audience (string), "
                "pain_addressed (string), "
                "proof_method (string), "
                "content_job (string: 'build_trust'|'demonstrate_capability'|'drive_action'), "
                "funnel_direction (object with: cta_type, cta_copy). "
                "No extra keys. No markdown fences."
            ),
        },
    ]

    data = chat_json(messages)
    if isinstance(data, dict):
        data = data.get("angles", [data])
    if not isinstance(data, list):
        return []

    angles = []
    for item in data[:4]:
        contrast = item.get("contrast", {})
        funnel = item.get("funnel_direction", {})
        angles.append({
            "topic_id": topic.id,
            "format": content_format,
            "title": item.get("title", ""),
            "contrast": {
                "common_belief": contrast.get("common_belief", ""),
                "surprising_truth": contrast.get("surprising_truth", ""),
                "contrast_strength": contrast.get("contrast_strength", "moderate"),
            },
            "target_audience": item.get("target_audience", ""),
            "pain_addressed": item.get("pain_addressed", ""),
            "proof_method": item.get("proof_method", ""),
            "content_job": item.get("content_job", "build_trust"),
            "funnel_direction": {
                "cta_type": funnel.get("cta_type", ""),
                "cta_copy": funnel.get("cta_copy", ""),
            },
            "status": "draft",
            "notes": "",
        })

    return angles


async def run_angle_generation(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    topic_ids: list[str],
    format: str = "longform",
) -> dict:
    """ARQ job: generate Contrast Formula angles for a list of topic IDs."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")

    _update_job(supabase, job_id, "running")
    logger.info("[angle] job=%s workspace=%s topics=%s", job_id, workspace_id, topic_ids)

    try:
        brain = load_brain(supabase, workspace_id, redis)
        doc_context = load_document_context(supabase, workspace_id)
        storage = SupabaseStorage(supabase, workspace_id)

        all_angles = []
        for topic_id in topic_ids:
            try:
                result = supabase.table("topics").select("*").eq(
                    "id", topic_id
                ).eq("workspace_id", workspace_id).single().execute()

                if not result.data:
                    logger.warning("[angle] topic %s not found", topic_id)
                    continue

                topic = _row_to_topic(result.data)
                angles = _generate_angles_for_topic(brain, topic, format, doc_context)
                all_angles.extend(angles)

                # Mark topic as developing
                supabase.table("topics").update({"status": "developing"}).eq(
                    "id", topic_id
                ).execute()

            except Exception as e:
                logger.error("[angle] failed for topic %s: %s", topic_id, e)
                continue

        saved = storage.save_angles(all_angles)
        logger.info("[angle] saved %d angles", saved)

        _update_job(supabase, job_id, "completed", result_count=saved)
        return {"status": "completed", "result_count": saved}

    except Exception as e:
        logger.error("[angle] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
