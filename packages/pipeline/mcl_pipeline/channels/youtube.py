"""YouTube channel plugin.

Wraps the ported GVB recon/scraper/youtube.py behind the DiscoverChannel interface.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic
from mcl_pipeline.recon.scraper.youtube import get_channel_videos, save_channel_data

logger = logging.getLogger(__name__)


class YouTubeDiscoverChannel(DiscoverChannel):
    @property
    def platform_name(self) -> str:
        return "youtube"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """YouTube keyword-based discovery via yt-dlp search.

        Searches YouTube for each keyword and returns scored topics.
        """
        from datetime import datetime, timezone
        from mcl_pipeline.scoring.engine import score_topic

        topics: list[Topic] = []

        for keyword in keywords:
            search_url = f"ytsearch{max_results}:{keyword}"
            videos = await asyncio.to_thread(
                get_channel_videos,
                search_url,
                max_videos=max_results,
                progress_callback=progress_callback,
            )

            for video in videos:
                scores = score_topic(
                    title=video.get("title", ""),
                    description=video.get("description", ""),
                    brain=brain,
                    views=video.get("views", 0),
                )

                topic = Topic(
                    id=f"yt-{video.get('video_id', '')}",
                    title=video.get("title", ""),
                    description=video.get("description", ""),
                    source={
                        "platform": "youtube",
                        "url": video.get("url", ""),
                        "author": video.get("channel", ""),
                        "engagement_signals": f"{video.get('views', 0):,} views",
                    },
                    discovered_at=datetime.now(timezone.utc),
                    scoring=scores,
                )
                topics.append(topic)

        return topics

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape YouTube channel videos using yt-dlp.

        Calls the real get_channel_videos function from the ported GVB scraper.
        """
        handle = competitor.handle
        logger.info("Scraping YouTube competitor: %s", handle)

        videos = await asyncio.to_thread(
            get_channel_videos,
            handle,
            max_videos=max_items,
            progress_callback=progress_callback,
        )

        logger.info(
            "Scraped %d videos from %s", len(videos), handle
        )

        return videos
