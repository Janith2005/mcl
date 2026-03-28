"""Recon jobs — competitor scraping and skeleton ripper."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client

from worker.jobs.brain_loader import load_brain
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


async def run_scrape(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    competitor_handles: list[str],
    platform: str = "youtube",
    max_items: int = 20,
) -> dict:
    """Scrape competitor channels and extract top-performing content patterns."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")

    _update_job(supabase, job_id, "running")
    logger.info("[recon/scrape] job=%s handles=%s", job_id, competitor_handles)

    try:
        brain = load_brain(supabase, workspace_id, redis)

        # Try yt-dlp scraping first
        scraped = []
        for handle in competitor_handles[:5]:  # cap at 5 channels
            try:
                import yt_dlp
                channel_url = f"https://www.youtube.com/@{handle.lstrip('@')}"
                ydl_opts = {
                    "quiet": True,
                    "extract_flat": True,
                    "playlist_items": f"1:{min(max_items, 10)}",
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(channel_url, download=False)
                    entries = info.get("entries") or []
                    for entry in entries:
                        scraped.append({
                            "handle": handle,
                            "title": entry.get("title", ""),
                            "url": entry.get("url") or entry.get("webpage_url", ""),
                            "view_count": entry.get("view_count", 0),
                            "duration": entry.get("duration", 0),
                        })
            except Exception as e:
                logger.warning("[recon/scrape] yt-dlp failed for %s: %s", handle, e)

        # LLM analysis of scraped content
        messages = [
            {
                "role": "system",
                "content": (
                    f"You are a content intelligence analyst for {brain.identity.niche}. "
                    "Analyze competitor content and extract strategic patterns."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze these competitor videos from {platform}:\n"
                    + "\n".join(f"- {v['handle']}: {v['title']} ({v.get('view_count', 0)} views)" for v in scraped[:20])
                    + "\n\nReturn a JSON object with:\n"
                    "- top_patterns: array of objects {pattern, frequency, example_title}\n"
                    "- hook_styles: array of strings (common hook formulas used)\n"
                    "- content_gaps: array of strings (topics competitors miss)\n"
                    "- posting_insights: string (cadence and timing observations)\n"
                    "- threat_level: 'low' | 'medium' | 'high'\n"
                    "Return raw JSON only."
                ),
            },
        ]

        analysis = chat_json(messages)

        # Save as skeleton report (matches actual DB schema)
        report = {
            "workspace_id": workspace_id,
            "job_id": job_id,
            "skeletons": scraped,
            "synthesis": analysis,
            "config": {"type": "competitor_scrape", "handles": competitor_handles, "platform": platform},
            "status": "complete",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            saved = supabase.table("skeleton_reports").insert(report).execute()
            report_id = saved.data[0]["id"] if saved.data else None
        except Exception as e:
            logger.error("[recon/scrape] Failed to save report: %s", e)
            report_id = None

        _update_job(supabase, job_id, "completed", report_id=report_id, videos_scraped=len(scraped))
        return {"status": "completed", "report_id": report_id, "videos_scraped": len(scraped)}

    except Exception as e:
        logger.error("[recon/scrape] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise


async def run_ripper(
    ctx: dict,
    workspace_id: str,
    job_id: str,
    video_urls: list[str],
    synthesis_mode: str = "detailed",
) -> dict:
    """Rip structure from specific videos and synthesize content skeleton."""
    supabase: Client = ctx["supabase"]
    redis = ctx.get("redis")

    _update_job(supabase, job_id, "running")
    logger.info("[recon/ripper] job=%s urls=%d", job_id, len(video_urls))

    try:
        brain = load_brain(supabase, workspace_id, redis)

        # Extract transcripts / metadata via yt-dlp
        ripped = []
        for url in video_urls[:5]:
            try:
                import yt_dlp
                ydl_opts = {
                    "quiet": True,
                    "writesubtitles": False,
                    "skip_download": True,
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    ripped.append({
                        "url": url,
                        "title": info.get("title", ""),
                        "description": (info.get("description") or "")[:2000],
                        "view_count": info.get("view_count", 0),
                        "like_count": info.get("like_count", 0),
                        "duration": info.get("duration", 0),
                        "tags": info.get("tags") or [],
                        "chapters": info.get("chapters") or [],
                    })
            except Exception as e:
                logger.warning("[recon/ripper] yt-dlp failed for %s: %s", url, e)
                ripped.append({"url": url, "title": "", "description": "", "error": str(e)})

        # LLM skeleton synthesis
        detail = "comprehensive detailed" if synthesis_mode == "detailed" else "concise summary"
        messages = [
            {
                "role": "system",
                "content": (
                    f"You are a content skeleton analyst for {brain.identity.niche}. "
                    "Deconstruct videos into reusable content frameworks."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Create a {detail} skeleton analysis of these videos:\n"
                    + "\n\n".join(
                        f"Title: {v['title']}\nDescription: {v['description'][:500]}\n"
                        f"Views: {v.get('view_count', 0)} | Duration: {v.get('duration', 0)}s"
                        for v in ripped
                    )
                    + "\n\nReturn a JSON object with:\n"
                    "- skeleton: object with {hook_formula, intro_structure, section_flow (array), cta_type, outro_style}\n"
                    "- engagement_drivers: array of strings (what makes this content work)\n"
                    "- adaptable_elements: array of strings (what you can steal and adapt)\n"
                    "- avoid_elements: array of strings (what not to copy)\n"
                    "- estimated_effort: 'low' | 'medium' | 'high'\n"
                    "Return raw JSON only."
                ),
            },
        ]

        synthesis = chat_json(messages)

        report = {
            "workspace_id": workspace_id,
            "job_id": job_id,
            "skeletons": ripped,
            "synthesis": synthesis,
            "config": {"type": "skeleton_rip", "video_urls": video_urls, "synthesis_mode": synthesis_mode},
            "status": "complete",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            saved = supabase.table("skeleton_reports").insert(report).execute()
            report_id = saved.data[0]["id"] if saved.data else None
        except Exception as e:
            logger.error("[recon/ripper] Failed to save report: %s", e)
            report_id = None

        _update_job(supabase, job_id, "completed", report_id=report_id)
        return {"status": "completed", "report_id": report_id}

    except Exception as e:
        logger.error("[recon/ripper] job=%s failed: %s", job_id, e, exc_info=True)
        _update_job(supabase, job_id, "failed", error=str(e))
        raise
