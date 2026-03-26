"""Hacker News channel plugin.

Discovers trending topics via the HN Algolia public API.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import requests

from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
from mcl_pipeline.scoring.engine import score_topic

logger = logging.getLogger(__name__)


class HackerNewsDiscoverChannel(DiscoverChannel):
    """Discover trending topics from Hacker News via the Algolia API."""

    @property
    def platform_name(self) -> str:
        return "hackernews"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """Query HN Algolia API for stories matching brain pillar keywords."""
        all_keywords = list(keywords)
        for pillar in brain.pillars:
            all_keywords.extend(pillar.keywords)

        topics: list[Topic] = []
        seen_ids: set[str] = set()

        for keyword in all_keywords:
            if len(topics) >= max_results:
                break
            try:
                hits = await asyncio.to_thread(
                    self._search_hn, keyword, max_results - len(topics)
                )
            except Exception:
                logger.exception("HN search failed for keyword: %s", keyword)
                continue

            for hit in hits:
                object_id = hit.get("objectID", "")
                if object_id in seen_ids:
                    continue
                seen_ids.add(object_id)

                title = hit.get("title", "") or ""
                story_url = hit.get("url", "") or f"https://news.ycombinator.com/item?id={object_id}"
                author = hit.get("author", "") or ""
                points = hit.get("points", 0) or 0
                num_comments = hit.get("num_comments", 0) or 0

                engagement = f"points={points}, comments={num_comments}"

                scores = score_topic(
                    title=title,
                    description="",
                    brain=brain,
                    views=points,
                    timeliness=6,
                )

                topic = Topic(
                    id=str(uuid.uuid4()),
                    title=title,
                    description="",
                    source=TopicSource(
                        platform="hackernews",
                        url=story_url,
                        author=author,
                        engagement_signals=engagement,
                    ),
                    discovered_at=datetime.now(timezone.utc),
                    scoring=TopicScoring(**scores),
                    pillars=[keyword],
                    status="new",
                )
                topics.append(topic)

                if progress_callback:
                    progress_callback(len(topics), max_results)

                if len(topics) >= max_results:
                    break

        return topics

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """HN does not have competitor profiles; returns empty list."""
        return []

    # --- Private sync helper ---

    def _search_hn(self, keyword: str, limit: int = 20) -> list[dict]:
        """Search Hacker News via Algolia API."""
        url = "https://hn.algolia.com/api/v1/search"
        params = {
            "query": keyword,
            "tags": "story",
            "hitsPerPage": min(limit, 50),
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("hits", [])
