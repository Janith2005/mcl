"""Shared test fixtures."""
import pytest
from datetime import datetime, timezone
from mcl_pipeline.schemas.brain import (
    AgentBrain, Identity, ICP, Pillar, PlatformConfig,
    Competitor, Cadence, Monetization, LearningWeights,
    HookPreferences, PerformancePatterns, BrainMetadata,
)


@pytest.fixture
def sample_brain() -> AgentBrain:
    """A fully populated AgentBrain for testing."""
    return AgentBrain(
        identity=Identity(
            name="Test Creator",
            brand="@testcreator",
            niche="AI Automation",
            tone=["practical", "bold"],
            differentiator="Builds live on camera",
        ),
        icp=ICP(
            segments=["agency owners", "solopreneurs"],
            pain_points=["can't scale without hiring", "drowning in manual tasks"],
            goals=["automate operations", "scale revenue"],
        ),
        pillars=[
            Pillar(name="AI Automation", description="Using AI to automate business", keywords=["ai", "automation", "agent"]),
            Pillar(name="Content Strategy", description="Growing through content", keywords=["content", "youtube", "viral"]),
        ],
        platforms=PlatformConfig(research=["youtube", "reddit"], posting=["youtube", "instagram_reels"]),
        competitors=[
            Competitor(name="Chase H", platform="youtube", handle="@Chase-H-AI", why_watch="Great demos"),
        ],
        cadence=Cadence(),
        monetization=Monetization(primary_funnel="community"),
        learning_weights=LearningWeights(),
        hook_preferences=HookPreferences(),
        performance_patterns=PerformancePatterns(),
        metadata=BrainMetadata(
            version="0.1.0",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ),
    )
