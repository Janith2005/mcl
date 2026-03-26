"""Instagram channel plugin.

Wraps the ported GVB recon/scraper/instagram.py behind the DiscoverChannel interface.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic

logger = logging.getLogger(__name__)


class InstagramDiscoverChannel(DiscoverChannel):
    def __init__(self, username: str = "", password: str = ""):
        self._username = username
        self._password = password
        self._client = None

    def _get_client(self):
        """Lazily instantiate and login the InstaClient."""
        if self._client is None:
            from mcl_pipeline.recon.scraper.instagram import InstaClient

            self._client = InstaClient()
            if self._username and self._password:
                success = self._client.login(self._username, self._password)
                if not success:
                    logger.error(
                        "Instagram login failed for @%s", self._username
                    )
                    self._client = None
                    raise RuntimeError(
                        f"Instagram login failed for @{self._username}"
                    )
        return self._client

    @property
    def platform_name(self) -> str:
        return "instagram"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        raise NotImplementedError(
            "Instagram discovery requires scraping competitor profiles. "
            "Use scrape_competitor() instead."
        )

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 50,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape Instagram reels using Instaloader.

        Calls the real InstaClient.get_competitor_reels from the ported GVB scraper.
        """
        handle = competitor.handle.lstrip("@")
        logger.info("Scraping Instagram competitor: @%s", handle)

        client = self._get_client()
        reels = await asyncio.to_thread(
            client.get_competitor_reels,
            handle,
            max_reels=max_items,
            progress_callback=progress_callback,
        )

        logger.info("Scraped %d reels from @%s", len(reels), handle)

        return reels
