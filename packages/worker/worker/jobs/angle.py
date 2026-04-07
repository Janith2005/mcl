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


def _to_int(value, default: int) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _to_float(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def _row_to_topic(row: dict) -> Topic:
    """Convert a Supabase topics row into a Topic pydantic model."""
    source_raw = row.get("source")
    scoring_raw = row.get("scoring")
    source_data = source_raw if isinstance(source_raw, dict) else {}
    scoring_data = scoring_raw if isinstance(scoring_raw, dict) else {}

    icp_relevance = _clamp(_to_int(scoring_data.get("icp_relevance", scoring_data.get("relevance", 5)), 5), 1, 10)
    timeliness = _clamp(_to_int(scoring_data.get("timeliness", scoring_data.get("virality", 5)), 5), 1, 10)
    content_gap = _clamp(_to_int(scoring_data.get("content_gap", scoring_data.get("competition", 5)), 5), 1, 10)
    proof_potential = _clamp(_to_int(scoring_data.get("proof_potential", 5), 5), 1, 10)
    total_default = icp_relevance + timeliness + content_gap + proof_potential
    total = _clamp(_to_int(scoring_data.get("total", total_default), total_default), 4, 40)
    weighted_total = _to_float(scoring_data.get("weighted_total", float(total)), float(total))

    source = TopicSource(
        platform=str(source_data.get("platform", "unknown")),
        url=str(source_data.get("url", "")),
        author=str(source_data.get("author", "")),
        engagement_signals=str(source_data.get("engagement_signals", "")),
    )

    scoring = TopicScoring(
        icp_relevance=icp_relevance,
        timeliness=timeliness,
        content_gap=content_gap,
        proof_potential=proof_potential,
        total=total,
        weighted_total=weighted_total,
    )

    discovered_at = row.get("discovered_at") or datetime.now(timezone.utc)
    raw_pillars = row.get("pillars") or []
    pillars = [str(p) for p in raw_pillars] if isinstance(raw_pillars, list) else []

    return Topic(
        id=str(row["id"]),
        title=str(row.get("title", "")),
        description=str(row.get("description", "") or ""),
        source=source,
        discovered_at=discovered_at,
        scoring=scoring,
        pillars=pillars,
        status=str(row.get("status", "new")),
        notes=str(row.get("notes", "") or ""),
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

    data = None
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            data = chat_json(messages, temperature=0.1, retries=2)
            break
        except Exception as e:
            last_error = e
            logger.warning(
                "[angle] generation parse failed for topic %s (attempt %d/3): %s",
                topic.id,
                attempt + 1,
                e,
            )
    if data is None:
        raise RuntimeError(f"Could not generate valid JSON angles: {last_error}") from last_error

    if isinstance(data, dict):
        data = data.get("angles", [data])
    if not isinstance(data, list):
        return []

    angles = []
    for item in data[:4]:
        contrast = item.get("contrast", {})
        funnel = item.get("funnel_direction", {})
        external_id = item.get("external_id")
        if not external_id:
            topic_hint = str(topic.id).split("-")[0]
            external_id = f"auto-angle-{topic_hint}-{uuid.uuid4()}"
        angles.append({
            "external_id": str(external_id),
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
        topic_errors: list[str] = []
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
                topic_errors.append(f"{topic_id}: {e}")
                continue

        saved = storage.save_angles(all_angles)
        logger.info("[angle] saved %d angles", saved)

        if saved == 0 and topic_errors and topic_ids:
            error_message = "Angle generation failed for all requested topics."
            _update_job(
                supabase,
                job_id,
                "failed",
                error=error_message,
                result_count=0,
                failed_topics=topic_errors[:10],
            )
            return {
                "status": "failed",
                "result_count": 0,
                "error": error_message,
                "failed_topics": topic_errors[:10],
            }

        if topic_errors:
            _update_job(
                supabase,
                job_id,
                "completed",
                result_count=saved,
                failed_topics=topic_errors[:10],
            )
            return {
                "status": "completed",
                "result_count": saved,
                "failed_topics": topic_errors[:10],
            }

        _update_job(supabase, job_id, "completed", result_count=saved)
        return {"status": "completed", "result_count": saved}

    except Exception as e:
        logger.error("[angle] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
