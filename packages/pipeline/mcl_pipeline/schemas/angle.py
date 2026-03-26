"""Angle schema - content angle via Contrast Formula.

Ported from GVB schemas/angle.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Contrast(BaseModel):
    common_belief: str = Field(description="What the audience currently believes")
    surprising_truth: str = Field(description="The insight that changes thinking")
    contrast_strength: str = Field(description="mild | moderate | strong | extreme")


class FunnelDirection(BaseModel):
    cta_type: str = ""  # community | lead_magnet | newsletter | website | dm | booking | product
    cta_copy: str = ""
    monetization_tie: str = ""


class CompetitorAngle(BaseModel):
    competitor: str = ""
    their_angle: str = ""
    differentiation: str = ""


class Angle(BaseModel):
    """Content angle developed via the Contrast Formula."""
    id: str
    topic_id: str
    format: str  # longform | shortform | linkedin
    title: str = ""
    contrast: Contrast
    target_audience: str = ""
    pain_addressed: str = ""
    proof_method: str = ""
    funnel_direction: Optional[FunnelDirection] = None
    competitor_angles: list[CompetitorAngle] = Field(default_factory=list)
    content_job: str = ""  # build_trust | demonstrate_capability | drive_action
    blocker_destroyed: str = ""
    created_at: datetime
    status: str = Field(default="draft")  # draft | approved | scripted | passed
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
