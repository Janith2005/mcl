"""Script schema - full content scripts with filming cards.

Ported from GVB schemas/script.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OpeningHook(BaseModel):
    hook_text: str
    pattern: str
    visual_direction: str = ""


class IntroFramework(BaseModel):
    """3 P's: Proof/Promise/Plan."""
    proof: str = ""
    promise: str = ""
    plan: str = ""


class RetentionHook(BaseModel):
    text: str
    timestamp_target: str = ""
    technique: str = ""


class ScriptSection(BaseModel):
    title: str
    talking_points: list[str] = Field(default_factory=list)
    proof_element: str = ""
    transition: str = ""
    duration_estimate: str = ""


class MidCTA(BaseModel):
    text: str
    type: str = ""
    placement: str = ""


class ClosingCTA(BaseModel):
    text: str
    type: str = ""
    template_source: str = ""


class Outro(BaseModel):
    subscribe_prompt: str = ""
    next_video_tease: str = ""


class ScriptStructure(BaseModel):
    opening_hook: OpeningHook
    intro_framework: Optional[IntroFramework] = None
    retention_hook: RetentionHook
    sections: list[ScriptSection] = Field(min_length=3, max_length=5)
    mid_cta: MidCTA
    closing_cta: ClosingCTA
    outro: Outro


class FilmingCard(BaseModel):
    scene_number: int
    section_name: str
    shot_type: str  # talking_head | screen_recording | b_roll | split_screen | whiteboard
    say: list[str] = Field(default_factory=list)
    show: str = ""
    duration_estimate: str = ""
    notes: str = ""


class Beat(BaseModel):
    beat_number: int
    timestamp: str = ""
    action: str = ""
    visual: str = ""
    text_overlay: str = ""
    audio_note: str = ""


class ShortformCTA(BaseModel):
    text: str
    type: str = ""
    placement: str = ""


class ShortformStructure(BaseModel):
    beats: list[Beat] = Field(default_factory=list)
    caption: str = ""
    hashtags: list[str] = Field(default_factory=list)
    cta: ShortformCTA
    estimated_duration: str = ""


class ScriptPerformance(BaseModel):
    views: int = 0
    ctr: float = 0
    avg_view_duration: float = 0
    retention_30s: float = 0
    engagement_rate: float = 0
    analyzed_at: Optional[datetime] = None


class Script(BaseModel):
    """Full content script with filming cards."""
    id: str
    angle_id: str
    hook_ids: list[str] = Field(default_factory=list)
    platform: str  # youtube_longform | youtube_shorts | instagram_reels | tiktok | linkedin
    title: str
    script_structure: Optional[ScriptStructure] = None
    filming_cards: list[FilmingCard] = Field(default_factory=list)
    shortform_structure: Optional[ShortformStructure] = None
    estimated_duration: str = ""
    status: str = Field(default="draft")  # draft | filming | published | analyzed
    performance: Optional[ScriptPerformance] = None
    created_at: datetime
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
