"""Discovery job — scrapes YouTube/Reddit and scores topics against the brain.

Falls back to LLM-generated topics if scrapers fail (e.g. yt-dlp not available,
YouTube rate-limited, no competitor handles configured).
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from supabase import Client

from mcl_pipeline.scoring.engine import score_topic
from worker.jobs.brain_loader import load_brain
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


async def _scrape_youtube(brain, keywords: list[str], mode: str) -> list[dict]:
    """Try YouTube scraping. Returns raw video dicts."""
    try:
        from mcl_pipeline.recon.scraper.youtube import get_channel_videos

        results = []

        if mode in ("keywords", "both") and keywords:
            for kw in keywords[:3]:  # Limit to 3 keywords
                search_url = f"ytsearch10:{kw}"
                videos = await asyncio.to_thread(
                    get_channel_videos, search_url, max_videos=10
                )
                results.extend(videos)

        if mode in ("competitors", "both") and brain.competitors:
            for comp in brain.competitors[:5]:  # Limit to 5 competitors
                handle = comp.handle
                if not handle:
                    continue
                videos = await asyncio.to_thread(
                    get_channel_videos, handle, max_videos=15
                )
                results.extend(videos)

        return results

    except Exception as e:
        logger.warning("YouTube scraper failed: %s — falling back to LLM", e)
        return []


def _videos_to_topics(videos: list[dict], brain, storage: SupabaseStorage) -> list[dict]:
    """Score raw videos and convert to topic rows ready for DB insert."""
    topics = []
    seen = set()

    for video in videos:
        video_id = video.get("video_id", "")
        if video_id in seen:
            continue
        seen.add(video_id)

        title = video.get("title", "")
        description = video.get("description", "") or ""
        views = video.get("views", 0) or 0

        scoring = score_topic(
            title=title,
            description=description,
            brain=brain,
            views=int(views),
            is_competitor=True,
        )

        topics.append({
            "id": f"yt-{video_id}" if video_id else None,
            "external_id": f"yt-{video_id}" if video_id else None,
            "title": title,
            "description": description[:500],
            "status": "discovered",
            "source": {
                "platform": "youtube",
                "url": video.get("url", ""),
                "author": video.get("channel", ""),
                "engagement_signals": f"{int(views):,} views",
            },
            "scoring": scoring,
            "pillars": [],
            "notes": "",
        })

    return topics


def _llm_fallback_topics(brain, keywords: list[str], mode: str, count: int = 8) -> list[dict]:
    """Generate topic ideas via LLM when scrapers are unavailable."""
    niche = brain.identity.niche
    pillars = ", ".join(p.name for p in brain.pillars) if brain.pillars else niche
    kw_str = ", ".join(keywords) if keywords else niche

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a content strategist for a creator in the '{niche}' niche. "
                f"Content pillars: {pillars}. "
                "Generate high-potential YouTube content topics. "
                "Return a JSON array of objects with keys: "
                "title (string), description (string, 1-2 sentences), "
                "scoring (object with icp_relevance, timeliness, content_gap, proof_potential, total, weighted_total — all integers 1-10 except weighted_total which is a float), "
                "source_platform (string: 'youtube'|'tiktok'|'reddit'). "
                "No extra keys. No markdown."
            ),
        },
        {
            "role": "user",
            "content": f"Generate {count} content topic ideas. Keywords/context: {kw_str}",
        },
    ]

    try:
        data = chat_json(messages)
        if not isinstance(data, list):
            data = data.get("topics", []) if isinstance(data, dict) else []

        topics = []
        for item in data[:count]:
            scoring = item.get("scoring", {})
            # Ensure all scoring fields exist
            for field in ["icp_relevance", "timeliness", "content_gap", "proof_potential"]:
                scoring.setdefault(field, 6)
            scoring.setdefault("total", sum(scoring[f] for f in ["icp_relevance", "timeliness", "content_gap", "proof_potential"]))
            scoring.setdefault("weighted_total", float(scoring["total"]))

            topics.append({
                "external_id": None,
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "status": "discovered",
                "source": {
                    "platform": item.get("source_platform", "ai-generated"),
                    "url": "",
                    "author": "",
                    "engagement_signals": "AI-generated",
                },
                "scoring": scoring,
                "pillars": [],
                "notes": "",
            })

        return topics

    except Exception as e:
        logger.error("LLM fallback topic generation failed: %s", e)
        return []


async def run_discovery(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    mode: str = "both",
    keywords: list[str] | None = None,
) -> dict:
    """ARQ job: discover topics from YouTube/Reddit or via LLM fallback."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")
    keywords = keywords or []

    _update_job(supabase, job_id, "running")
    logger.info("[discover] job=%s workspace=%s mode=%s", job_id, workspace_id, mode)

    try:
        brain = load_brain(supabase, workspace_id, redis)
        storage = SupabaseStorage(supabase, workspace_id)

        # Try real scraper first
        videos = await _scrape_youtube(brain, keywords, mode)

        if videos:
            topics = _videos_to_topics(videos, brain, storage)
            source = "scraper"
        else:
            # LLM fallback
            effective_keywords = keywords or [brain.identity.niche]
            topics = _llm_fallback_topics(brain, effective_keywords, mode)
            source = "llm"

        saved = storage.save_topics(topics)
        logger.info("[discover] saved %d topics via %s", saved, source)

        _update_job(supabase, job_id, "completed", result_count=saved, source=source)
        return {"status": "completed", "result_count": saved, "source": source}

    except Exception as e:
        logger.error("[discover] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
