"""Base classes for platform channel plugins.

Each platform implements one or more of these interfaces:
- DiscoverChannel: Scrape/search for content topics
- PublishChannel: Post content to the platform
- AnalyzeChannel: Fetch performance analytics
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic
from mcl_pipeline.schemas.analytics import AnalyticsEntry


class DiscoverChannel(ABC):
    """Interface for discovering content on a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Unique platform identifier (e.g., 'youtube', 'instagram')."""
        ...

    @abstractmethod
    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """Search the platform for trending topics relevant to the brain's ICP."""
        ...

    @abstractmethod
    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape recent content from a competitor."""
        ...


class PublishChannel(ABC):
    """Interface for publishing content to a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        ...

    @abstractmethod
    async def publish(
        self,
        content: dict,
        workspace_id: str,
    ) -> dict:
        """Publish content and return platform-specific metadata."""
        ...


class AnalyzeChannel(ABC):
    """Interface for fetching analytics from a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        ...

    @abstractmethod
    async def fetch_analytics(
        self,
        content_ids: list[str],
        workspace_id: str,
    ) -> list[AnalyticsEntry]:
        """Fetch performance data for published content."""
        ...
