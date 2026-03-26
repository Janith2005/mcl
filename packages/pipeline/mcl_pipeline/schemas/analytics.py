"""Analytics entry schema.

Ported from GVB schemas/analytics-entry.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AnalyticsMetrics(BaseModel):
    views: int = Field(default=0, ge=0)
    impressions: int = Field(default=0, ge=0)
    ctr: float = Field(default=0, ge=0, le=100)
    retention_30s: float = Field(default=0, ge=0, le=100)
    avg_view_duration: float = 0
    avg_view_percentage: float = Field(default=0, ge=0, le=100)
    completion_rate: float = Field(default=0, ge=0, le=100)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    shares: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    subscribers_gained: int = Field(default=0, ge=0)
    engagement_rate: float = Field(default=0, ge=0)


class ThumbnailAnalysis(BaseModel):
    url: str = ""
    text_overlay: str = ""
    emotion: str = ""
    style: str = ""
    ctr_performance: str = ""


class WinnerMetrics(BaseModel):
    threshold_used: str = ""
    percentile: float = Field(default=0, ge=0, le=100)


class AnalyticsEntry(BaseModel):
    """Per-content performance data."""
    id: str
    content_id: str
    platform: str
    published_at: Optional[datetime] = None
    analyzed_at: datetime
    days_since_publish: int = Field(default=0, ge=0)
    metrics: AnalyticsMetrics = Field(default_factory=AnalyticsMetrics)
    thumbnail: Optional[ThumbnailAnalysis] = None
    hook_pattern_used: str = ""
    topic_category: str = ""
    content_pillar: str = ""
    is_winner: bool = False
    winner_reason: str = ""
    winner_metrics: Optional[WinnerMetrics] = None
    collection_method: str = ""
    source_url: str = ""
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
