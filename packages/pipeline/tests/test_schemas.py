"""Test Pydantic schema models validate correctly."""
from datetime import datetime, timezone
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
from mcl_pipeline.schemas.angle import Angle, Contrast
from mcl_pipeline.schemas.hook import Hook, HookScore


def test_brain_roundtrip(sample_brain):
    """Brain serializes to dict and back."""
    data = sample_brain.model_dump()
    brain2 = AgentBrain.model_validate(data)
    assert brain2.identity.name == "Test Creator"
    assert len(brain2.pillars) == 2


def test_topic_creation():
    topic = Topic(
        id="topic_20260324_001",
        title="AI Agents for Call Centers",
        source=TopicSource(platform="youtube", url="https://youtube.com/watch?v=test"),
        discovered_at=datetime.now(timezone.utc),
        scoring=TopicScoring(
            icp_relevance=8, timeliness=7, content_gap=6,
            proof_potential=9, total=30, weighted_total=30.0,
        ),
    )
    assert topic.status == "new"


def test_hook_composite_score():
    hook = Hook(
        id="hook_001", angle_id="angle_001",
        platform="youtube_longform", pattern="contradiction",
        hook_text="Everyone thinks X but actually Y",
        score=HookScore(contrast_fit=8, pattern_strength=7, platform_fit=9, composite=8.0),
        created_at=datetime.now(timezone.utc),
    )
    assert hook.score.composite == 8.0
