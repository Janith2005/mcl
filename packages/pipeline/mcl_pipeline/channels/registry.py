"""Config-driven channel registry."""
from __future__ import annotations
from typing import Type
from mcl_pipeline.channels.base import DiscoverChannel, PublishChannel, AnalyzeChannel


class ChannelRegistry:
    """Maps platform names to channel implementations."""

    def __init__(self) -> None:
        self._discover: dict[str, Type[DiscoverChannel]] = {}
        self._publish: dict[str, Type[PublishChannel]] = {}
        self._analyze: dict[str, Type[AnalyzeChannel]] = {}

    def register_discover(self, platform: str, cls: Type[DiscoverChannel]) -> None:
        self._discover[platform] = cls

    def register_publish(self, platform: str, cls: Type[PublishChannel]) -> None:
        self._publish[platform] = cls

    def register_analyze(self, platform: str, cls: Type[AnalyzeChannel]) -> None:
        self._analyze[platform] = cls

    def get_discover(self, platform: str) -> Type[DiscoverChannel] | None:
        return self._discover.get(platform)

    def get_publish(self, platform: str) -> Type[PublishChannel] | None:
        return self._publish.get(platform)

    def get_analyze(self, platform: str) -> Type[AnalyzeChannel] | None:
        return self._analyze.get(platform)

    def list_platforms(self) -> dict[str, list[str]]:
        return {
            "discover": list(self._discover.keys()),
            "publish": list(self._publish.keys()),
            "analyze": list(self._analyze.keys()),
        }


# Global registry singleton
registry = ChannelRegistry()


def register_default_channels() -> None:
    """Register all built-in channels."""
    from mcl_pipeline.channels.youtube import YouTubeDiscoverChannel
    from mcl_pipeline.channels.instagram import InstagramDiscoverChannel
    from mcl_pipeline.channels.reddit import RedditDiscoverChannel
    from mcl_pipeline.channels.tiktok import TikTokDiscoverChannel
    from mcl_pipeline.channels.hackernews import HackerNewsDiscoverChannel

    registry.register_discover("youtube", YouTubeDiscoverChannel)
    registry.register_discover("instagram", InstagramDiscoverChannel)
    registry.register_discover("reddit", RedditDiscoverChannel)
    registry.register_discover("tiktok", TikTokDiscoverChannel)
    registry.register_discover("hackernews", HackerNewsDiscoverChannel)
