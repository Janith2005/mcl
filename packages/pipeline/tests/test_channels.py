"""Tests for Phase 6 - Platform Channels."""
import pytest
from mcl_pipeline.channels.registry import ChannelRegistry, register_default_channels, registry
from mcl_pipeline.channels.reddit import RedditDiscoverChannel
from mcl_pipeline.channels.tiktok import TikTokDiscoverChannel
from mcl_pipeline.channels.hackernews import HackerNewsDiscoverChannel
from mcl_pipeline.schemas.brain import Competitor


class TestChannelRegistry:
    def test_registry_lists_all_platforms(self):
        """After register_default_channels, registry should have 5 discover channels."""
        test_registry = ChannelRegistry()
        # Use a fresh registry to avoid polluting global state
        from mcl_pipeline.channels.youtube import YouTubeDiscoverChannel
        from mcl_pipeline.channels.instagram import InstagramDiscoverChannel

        test_registry.register_discover("youtube", YouTubeDiscoverChannel)
        test_registry.register_discover("instagram", InstagramDiscoverChannel)
        test_registry.register_discover("reddit", RedditDiscoverChannel)
        test_registry.register_discover("tiktok", TikTokDiscoverChannel)
        test_registry.register_discover("hackernews", HackerNewsDiscoverChannel)

        platforms = test_registry.list_platforms()
        assert len(platforms["discover"]) == 5
        assert set(platforms["discover"]) == {
            "youtube", "instagram", "reddit", "tiktok", "hackernews",
        }

    def test_register_default_channels_populates_global_registry(self):
        """register_default_channels should populate the global registry."""
        register_default_channels()
        platforms = registry.list_platforms()
        assert "youtube" in platforms["discover"]
        assert "instagram" in platforms["discover"]
        assert "reddit" in platforms["discover"]
        assert "tiktok" in platforms["discover"]
        assert "hackernews" in platforms["discover"]
        assert len(platforms["discover"]) == 5


class TestRedditChannel:
    def test_reddit_platform_name(self):
        channel = RedditDiscoverChannel()
        assert channel.platform_name == "reddit"


class TestTikTokChannel:
    def test_tiktok_platform_name(self):
        channel = TikTokDiscoverChannel()
        assert channel.platform_name == "tiktok"

    @pytest.mark.asyncio
    async def test_tiktok_discover_raises_not_implemented(self, sample_brain):
        channel = TikTokDiscoverChannel()
        with pytest.raises(NotImplementedError, match="TikTok discovery requires yt-dlp integration"):
            await channel.discover_topics(sample_brain, ["test"])


class TestHackerNewsChannel:
    def test_hackernews_platform_name(self):
        channel = HackerNewsDiscoverChannel()
        assert channel.platform_name == "hackernews"

    @pytest.mark.asyncio
    async def test_hackernews_scrape_competitor_returns_empty(self):
        channel = HackerNewsDiscoverChannel()
        competitor = Competitor(
            name="Some HN user",
            platform="hackernews",
            handle="pg",
        )
        result = await channel.scrape_competitor(competitor)
        assert result == []
