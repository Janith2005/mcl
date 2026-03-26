"""Insight schema - aggregated performance patterns.

Ported from GVB schemas/insight.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TopTopic(BaseModel):
    topic: str
    avg_performance: float
    content_count: int = Field(ge=1)
    best_platform: str = ""
    trend: str = "stable"  # rising | stable | declining


class HookStats(BaseModel):
    times_used: int = Field(default=0, ge=0)
    avg_ctr: float = 0
    avg_retention_30s: float = 0
    avg_engagement: float = 0
    best_platform: str = ""
    trend: str = "stable"


class ThumbnailPattern(BaseModel):
    style: str = ""
    text_approach: str = ""
    avg_ctr: float = 0
    sample_count: int = 0


class OptimalPostingTime(BaseModel):
    best_day: str = ""
    best_time: str = ""
    timezone: str = ""
    confidence: str = "low"  # low | medium | high


class CompetitorInsight(BaseModel):
    competitor: str = ""
    strategy_summary: str = ""
    top_performing_topics: list[str] = Field(default_factory=list)
    posting_frequency: str = ""


class FormatPerformance(BaseModel):
    avg_views: float = 0
    avg_engagement: float = 0
    content_count: int = 0
    trend: str = "stable"


class HookPerformanceMap(BaseModel):
    contradiction: Optional[HookStats] = None
    specificity: Optional[HookStats] = None
    timeframe_tension: Optional[HookStats] = None
    pov_as_advice: Optional[HookStats] = None
    vulnerable_confession: Optional[HookStats] = None
    pattern_interrupt: Optional[HookStats] = None


class Insight(BaseModel):
    """Aggregated patterns from analysis cycles."""
    last_updated: datetime
    analysis_count: int = Field(default=0, ge=0)
    top_topics: list[TopTopic] = Field(default_factory=list)
    hook_performance: Optional[HookPerformanceMap] = None
    thumbnail_patterns: list[ThumbnailPattern] = Field(default_factory=list)
    optimal_posting_times: dict[str, OptimalPostingTime] = Field(default_factory=dict)
    competitor_insights: list[CompetitorInsight] = Field(default_factory=list)
    content_format_performance: dict[str, FormatPerformance] = Field(default_factory=dict)

    # MCL-specific
    workspace_id: Optional[str] = None
