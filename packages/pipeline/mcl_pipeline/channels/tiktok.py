"""TikTok channel plugin.

Uses yt-dlp for competitor scraping; discovery requires future yt-dlp integration.
"""
from __future__ import annotations

import asyncio
import json
import logging
import subprocess
from typing import Optional

from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic

logger = logging.getLogger(__name__)


class TikTokDiscoverChannel(DiscoverChannel):
    """TikTok channel plugin using yt-dlp for metadata extraction."""

    @property
    def platform_name(self) -> str:
        return "tiktok"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """TikTok discovery is not yet implemented."""
        raise NotImplementedError("TikTok discovery requires yt-dlp integration")

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape TikTok user profile videos via yt-dlp.

        Uses yt-dlp with --dump-json --flat-playlist to extract video metadata
        without downloading any media.
        """
        handle = competitor.handle.lstrip("@")
        profile_url = f"https://www.tiktok.com/@{handle}"

        try:
            results = await asyncio.to_thread(
                self._run_ytdlp, profile_url, max_items
            )
        except Exception:
            logger.exception("TikTok scrape failed for handle: %s", handle)
            return []
        return results

    # --- Private sync helper ---

    def _run_ytdlp(self, url: str, max_items: int = 20) -> list[dict]:
        """Run yt-dlp to extract video metadata."""
        cmd = [
            "yt-dlp",
            "--dump-json",
            "--flat-playlist",
            "--playlist-end", str(max_items),
            "--no-warnings",
            url,
        ]
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except FileNotFoundError:
            logger.error("yt-dlp not found. Install it with: pip install yt-dlp")
            return []
        except subprocess.TimeoutExpired:
            logger.error("yt-dlp timed out for url: %s", url)
            return []

        if result.returncode != 0:
            logger.warning("yt-dlp returned code %d: %s", result.returncode, result.stderr[:500])

        videos: list[dict] = []
        for line in result.stdout.strip().splitlines():
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            videos.append({
                "id": entry.get("id", ""),
                "url": entry.get("url") or entry.get("webpage_url", ""),
                "title": entry.get("title", ""),
                "view_count": entry.get("view_count", 0),
                "like_count": entry.get("like_count", 0),
                "comment_count": entry.get("comment_count", 0),
            })

        return videos
