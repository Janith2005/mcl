"""Agent Brain schema - central persistent memory.

Ported from GVB schemas/agent-brain.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Identity(BaseModel):
    """Creator identity and brand positioning."""
    name: str = Field(description="Creator's name")
    brand: str = Field(description="Brand name or handle")
    niche: str = Field(description="Primary content niche")
    tone: list[str] = Field(default_factory=list, description="Content tone descriptors")
    differentiator: str = Field(default="", description="What makes this creator unique")


class ICP(BaseModel):
    """Ideal Customer Profile."""
    segments: list[str] = Field(description="Audience segments")
    pain_points: list[str] = Field(description="Top pain points")
    goals: list[str] = Field(description="What the audience wants to achieve")
    platforms_they_use: list[str] = Field(default_factory=list)
    budget_range: str = Field(default="")


class Pillar(BaseModel):
    """Content pillar."""
    name: str
    description: str
    keywords: list[str] = Field(default_factory=list)


class PlatformConfig(BaseModel):
    """Platform configuration."""
    research: list[str] = Field(description="Platforms to scan for discovery")
    posting: list[str] = Field(description="Platforms the creator posts on")
    api_keys_configured: list[str] = Field(default_factory=list)


class Competitor(BaseModel):
    """Competitor to monitor."""
    name: str
    platform: str
    handle: str
    why_watch: str = Field(default="")


class WeeklySchedule(BaseModel):
    shorts_per_day: int = Field(default=2, ge=0)
    shorts_days: list[str] = Field(default_factory=list)
    longform_per_week: int = Field(default=2, ge=0)
    longform_days: list[str] = Field(default_factory=list)


class Cadence(BaseModel):
    weekly_schedule: WeeklySchedule = Field(default_factory=WeeklySchedule)
    optimal_times: dict[str, str] = Field(default_factory=dict)


class CTAStrategy(BaseModel):
    default_cta: str = Field(default="")
    lead_magnet_url: str = Field(default="")
    community_url: str = Field(default="")
    newsletter_url: str = Field(default="")
    website_url: str = Field(default="")


class Monetization(BaseModel):
    primary_funnel: str
    secondary_funnels: list[str] = Field(default_factory=list)
    cta_strategy: CTAStrategy = Field(default_factory=CTAStrategy)
    client_capture: str = Field(default="")


class LearningWeights(BaseModel):
    icp_relevance: float = Field(default=1.0, ge=0.1, le=5.0)
    timeliness: float = Field(default=1.0, ge=0.1, le=5.0)
    content_gap: float = Field(default=1.0, ge=0.1, le=5.0)
    proof_potential: float = Field(default=1.0, ge=0.1, le=5.0)


class HookPreferences(BaseModel):
    contradiction: float = Field(default=0, ge=0)
    specificity: float = Field(default=0, ge=0)
    timeframe_tension: float = Field(default=0, ge=0)
    pov_as_advice: float = Field(default=0, ge=0)
    vulnerable_confession: float = Field(default=0, ge=0)
    pattern_interrupt: float = Field(default=0, ge=0)


class VisualTypePerformance(BaseModel):
    type: str
    avg_engagement: float = 0
    sample_count: int = 0
    trend: str = "stable"  # rising | stable | declining


class VisualPatterns(BaseModel):
    top_visual_types: list[VisualTypePerformance] = Field(default_factory=list)
    top_pattern_interrupts: list[dict] = Field(default_factory=list)
    text_overlay_colors: dict[str, dict] = Field(default_factory=dict)
    pacing_performance: dict[str, dict] = Field(default_factory=dict)


class PerformancePatterns(BaseModel):
    top_performing_topics: list[str] = Field(default_factory=list)
    top_performing_formats: list[str] = Field(default_factory=list)
    audience_growth_drivers: list[str] = Field(default_factory=list)
    avg_ctr: float = Field(default=0)
    avg_retention_30s: float = Field(default=0)
    total_content_analyzed: int = Field(default=0, ge=0)
    view_to_follower_ratio: float = Field(default=0)
    avg_saves: float = Field(default=0)
    avg_shares: float = Field(default=0)


class AudienceBlocker(BaseModel):
    lie: str = Field(description="The false belief the audience holds")
    destruction: str = Field(description="How content destroys this lie")
    pillar: str = Field(description="Which content pillar addresses this")


class ContentJobs(BaseModel):
    build_trust: list[str] = Field(default_factory=list)
    demonstrate_capability: list[str] = Field(default_factory=list)
    drive_action: list[str] = Field(default_factory=list)


class EvolutionEntry(BaseModel):
    timestamp: datetime
    reason: str
    changes: list[str]


class BrainMetadata(BaseModel):
    version: str = Field(default="0.1.0", pattern=r"^\d+\.\d+\.\d+$")
    created_at: datetime
    updated_at: datetime
    last_onboard: Optional[datetime] = None
    last_analysis: Optional[datetime] = None
    evolution_log: list[EvolutionEntry] = Field(default_factory=list)


class AgentBrain(BaseModel):
    """Central brain for the MCL system. Evolving memory that all modules read."""
    identity: Identity
    icp: ICP
    pillars: list[Pillar]
    platforms: PlatformConfig
    competitors: list[Competitor]
    cadence: Cadence
    monetization: Monetization
    learning_weights: LearningWeights = Field(default_factory=LearningWeights)
    hook_preferences: HookPreferences = Field(default_factory=HookPreferences)
    visual_patterns: Optional[VisualPatterns] = None
    performance_patterns: PerformancePatterns = Field(default_factory=PerformancePatterns)
    audience_blockers: list[AudienceBlocker] = Field(default_factory=list)
    content_jobs: Optional[ContentJobs] = None
    metadata: BrainMetadata

    # MCL-specific additions (not in GVB)
    workspace_id: Optional[str] = Field(default=None, description="Supabase workspace ID")
