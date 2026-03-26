"""Swipe hook schema - competitor hooks saved as inspiration.

Ported from GVB schemas/swipe-hook.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SwipeEngagement(BaseModel):
    views: int = Field(ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    engagement_rate: float = 0


class VisualHook(BaseModel):
    on_screen: str = ""
    text_overlays: str = ""
    visual_type: str = ""  # talking_head | screen_recording | split_screen | b_roll | text_only | branded_graphic | other
    pattern_interrupt: bool = False
    pacing: str = ""  # fast | moderate | slow


class SwipeHook(BaseModel):
    """Competitor hook saved as inspiration reference."""
    id: str
    hook_text: str
    pattern: str  # contradiction | specificity | timeframe_tension | pov_as_advice | vulnerable_confession | pattern_interrupt
    why_it_works: str
    competitor: str
    platform: str
    url: str
    engagement: SwipeEngagement
    competitor_angle: str = ""
    topic_keywords: list[str] = Field(default_factory=list)
    source_video_title: str = ""
    saved_at: datetime
    used_count: int = Field(default=0, ge=0)
    visual_hook: Optional[VisualHook] = None
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
