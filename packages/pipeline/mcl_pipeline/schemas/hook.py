"""Hook schema - generated hooks from content angles.

Ported from GVB schemas/hook.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HookScore(BaseModel):
    contrast_fit: float = Field(ge=0, le=10)
    pattern_strength: float = Field(ge=0, le=10)
    platform_fit: float = Field(ge=0, le=10)
    composite: float = Field(ge=0, le=10)


class HookPerformance(BaseModel):
    ctr: Optional[float] = None
    retention_30s: Optional[float] = None
    engagement_rate: Optional[float] = None
    analyzed_at: Optional[datetime] = None


class Hook(BaseModel):
    """Content hook using one of 6 proven patterns."""
    id: str
    angle_id: str
    platform: str  # youtube_longform | youtube_shorts | instagram_reels | tiktok | linkedin
    pattern: str  # contradiction | specificity | timeframe_tension | pov_as_advice | vulnerable_confession | pattern_interrupt
    hook_text: str
    visual_cue: str = ""
    score: HookScore
    cta_pairing: str = ""
    status: str = Field(default="draft")  # draft | approved | used | winner | dud
    performance: Optional[HookPerformance] = None
    created_at: datetime
    notes: str = ""
    source: str = Field(default="original")  # original | swipe
    swipe_reference: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
