"""Script generation job — generates a full content script from an angle + hooks."""
from __future__ import annotations

import logging
import uuid as uuid_lib
from datetime import datetime, timezone

from supabase import Client

from mcl_pipeline.prompts.script import get_script_system_prompt
from mcl_pipeline.schemas.angle import Angle, Contrast, FunnelDirection
from mcl_pipeline.schemas.hook import Hook, HookScore
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


def _row_to_angle(row: dict) -> Angle:
    contrast_data = row.get("contrast") or {}
    funnel_data = row.get("funnel_direction") or {}

    return Angle(
        id=str(row["id"]),
        topic_id=str(row.get("topic_id", "")),
        format=row.get("format", "longform"),
        title=row.get("title", ""),
        contrast=Contrast(
            common_belief=contrast_data.get("common_belief", ""),
            surprising_truth=contrast_data.get("surprising_truth", ""),
            contrast_strength=contrast_data.get("contrast_strength", "moderate"),
        ),
        target_audience=row.get("target_audience", ""),
        pain_addressed=row.get("pain_addressed", ""),
        proof_method=row.get("proof_method", ""),
        funnel_direction=FunnelDirection(
            cta_type=funnel_data.get("cta_type", ""),
            cta_copy=funnel_data.get("cta_copy", ""),
        ),
        content_job=row.get("content_job", "build_trust"),
        created_at=datetime.now(timezone.utc),
        status=row.get("status", "draft"),
        workspace_id=row.get("workspace_id"),
    )


def _row_to_hook(row: dict) -> Hook:
    score_data = row.get("score") or {}
    return Hook(
        id=str(row["id"]),
        angle_id=str(row.get("angle_id", "")),
        platform=row.get("platform", "youtube_longform"),
        pattern=row.get("pattern", "contradiction"),
        hook_text=row.get("hook_text", ""),
        visual_cue=row.get("visual_cue", ""),
        score=HookScore(
            contrast_fit=score_data.get("contrast_fit", 7),
            pattern_strength=score_data.get("pattern_strength", 7),
            platform_fit=score_data.get("platform_fit", 7),
            composite=score_data.get("composite", 7),
        ),
        status=row.get("status", "draft"),
        created_at=datetime.now(timezone.utc),
        workspace_id=row.get("workspace_id"),
    )


def _generate_longform_script(brain, angle: Angle, hooks: list[Hook], doc_context: str = "") -> dict:
    """Generate a longform YouTube script structure."""
    system_prompt = get_script_system_prompt(brain, angle, hooks)
    if doc_context:
        system_prompt += f"\n\n## Brand Voice Reference Documents\nMatch the tone, style, and vocabulary from these documents:\n\n{doc_context}"

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                "Generate a complete longform YouTube script. "
                "Return a JSON object with: "
                "script_structure (object with: opening_hook (string), intro (string with proof/promise/plan), "
                "sections (array of objects: title, talking_points (array of strings), proof_element, transition), "
                "mid_cta (string), closing_cta (string), outro (string)), "
                "filming_cards (array of objects: scene_number (int), section_name (string), "
                "shot_type (string: talking_head|screen_recording|b_roll|split_screen|whiteboard), "
                "say (string), show (string), duration (string), notes (string)), "
                "estimated_duration (string, e.g. '12-15 minutes'). "
                "No markdown. Return raw JSON only."
            ),
        },
    ]

    return chat_json(messages)


def _generate_shortform_script(brain, angle: Angle, hooks: list[Hook], doc_context: str = "") -> dict:
    """Generate a shortform Reels/TikTok/Shorts script."""
    system_prompt = get_script_system_prompt(brain, angle, hooks)
    if doc_context:
        system_prompt += f"\n\n## Brand Voice Reference Documents\nMatch the tone, style, and vocabulary from these documents:\n\n{doc_context}"

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                "Generate a complete shortform Reels/TikTok/Shorts script. "
                "Return a JSON object with: "
                "shortform_structure (object with: "
                "beats (array of objects: beat_number (int), timestamp (string), action (string), "
                "visual (string), text_overlay (string), audio_note (string)), "
                "caption (string), hashtags (array of strings), cta (string), "
                "estimated_duration (string)), "
                "filming_cards (array of objects: scene_number (int), shot_type (string), "
                "say (string), show (string), duration (string)). "
                "No markdown. Return raw JSON only."
            ),
        },
    ]

    return chat_json(messages)


async def run_script_generation(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    angle_id: str,
    hook_ids: list[str] | None = None,
) -> dict:
    """ARQ job: generate a full script for an angle."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")
    hook_ids = hook_ids or []

    _update_job(supabase, job_id, "running")
    logger.info("[script] job=%s workspace=%s angle=%s", job_id, workspace_id, angle_id)

    try:
        brain = load_brain(supabase, workspace_id, redis)
        doc_context = load_document_context(supabase, workspace_id)
        storage = SupabaseStorage(supabase, workspace_id)

        # Load angle
        angle_result = supabase.table("angles").select("*").eq(
            "id", angle_id
        ).eq("workspace_id", workspace_id).single().execute()

        if not angle_result.data:
            raise ValueError(f"Angle {angle_id} not found")

        angle = _row_to_angle(angle_result.data)

        # Load hooks (if specified)
        hooks: list[Hook] = []
        if hook_ids:
            hooks_result = supabase.table("hooks").select("*").in_(
                "id", hook_ids
            ).execute()
            hooks = [_row_to_hook(r) for r in (hooks_result.data or [])]

        # Generate script based on format
        if angle.format == "shortform":
            script_data = _generate_shortform_script(brain, angle, hooks, doc_context)
            platform = "instagram_reels"
            title = f"{angle.title} (Shortform)"
        else:
            script_data = _generate_longform_script(brain, angle, hooks, doc_context)
            platform = "youtube_longform"
            title = angle.title or "Untitled Script"

        script_row = {
            "external_id": f"script-{uuid_lib.uuid4()}",
            "angle_id": angle_id,
            "platform": platform,
            "title": title,
            "script_structure": script_data.get("script_structure") or script_data,
            "filming_cards": script_data.get("filming_cards", []),
            "shortform_structure": script_data.get("shortform_structure"),
            "estimated_duration": script_data.get("estimated_duration", ""),
            "status": "draft",
        }

        saved = storage.save_script(script_row)

        # Mark angle as scripted
        supabase.table("angles").update({"status": "scripted"}).eq(
            "id", angle_id
        ).execute()

        script_id = saved["id"] if saved else None
        logger.info("[script] saved script %s", script_id)

        _update_job(supabase, job_id, "completed", script_id=script_id)
        return {"status": "completed", "script_id": script_id}

    except Exception as e:
        logger.error("[script] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
