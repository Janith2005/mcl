"""Reddit channel plugin.

Discovers trending topics via Reddit's public JSON API (no OAuth required).
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

_HEADERS = {"User-Agent": "mcl-pipeline/0.1 (influence-pirates)"}


class RedditDiscoverChannel(DiscoverChannel):
    """Discover trending topics from Reddit's public search API."""

    @property
    def platform_name(self) -> str:
        return "reddit"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """Search Reddit for posts matching brain pillars + ICP keywords."""
        all_keywords = list(keywords)
        for pillar in brain.pillars:
            all_keywords.extend(pillar.keywords)

        topics: list[Topic] = []
        seen_ids: set[str] = set()

        for keyword in all_keywords:
            if len(topics) >= max_results:
                break
            try:
                results = await asyncio.to_thread(
                    self._search_reddit, keyword, max_results - len(topics)
                )
            except Exception:
                logger.exception("Reddit search failed for keyword: %s", keyword)
                continue

            for post in results:
                post_id = post.get("id", "")
                if post_id in seen_ids:
                    continue
                seen_ids.add(post_id)

                title = post.get("title", "")
                description = post.get("selftext", "")[:500]
                url = f"https://reddit.com{post.get('permalink', '')}"
                author = post.get("author", "")
                score_val = post.get("score", 0)
                num_comments = post.get("num_comments", 0)

                engagement = f"score={score_val}, comments={num_comments}"

                scores = score_topic(
                    title=title,
                    description=description,
                    brain=brain,
                    views=score_val,
                    timeliness=6,
                )

                topic = Topic(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=description,
                    source=TopicSource(
                        platform="reddit",
                        url=url,
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
        """Fetch top posts from a subreddit (competitor handle = subreddit name)."""
        subreddit = competitor.handle.lstrip("/").lstrip("r/").lstrip("@")
        try:
            posts = await asyncio.to_thread(
                self._fetch_subreddit_top, subreddit, max_items
            )
        except Exception:
            logger.exception("Reddit scrape failed for subreddit: %s", subreddit)
            return []
        return posts

    # --- Private sync helpers (run in thread) ---

    def _search_reddit(self, keyword: str, limit: int = 20) -> list[dict]:
        """Search Reddit via public JSON endpoint."""
        url = "https://www.reddit.com/search.json"
        params = {"q": keyword, "sort": "relevance", "limit": min(limit, 25)}
        resp = requests.get(url, headers=_HEADERS, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        children = data.get("data", {}).get("children", [])
        return [child["data"] for child in children if child.get("kind") == "t3"]

    def _fetch_subreddit_top(self, subreddit: str, limit: int = 20) -> list[dict]:
        """Fetch top posts from a subreddit."""
        url = f"https://www.reddit.com/r/{subreddit}/top.json"
        params = {"t": "month", "limit": min(limit, 25)}
        resp = requests.get(url, headers=_HEADERS, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        children = data.get("data", {}).get("children", [])
        results = []
        for child in children:
            post = child.get("data", {})
            results.append({
                "title": post.get("title", ""),
                "url": f"https://reddit.com{post.get('permalink', '')}",
                "score": post.get("score", 0),
                "num_comments": post.get("num_comments", 0),
                "author": post.get("author", ""),
            })
        return results
