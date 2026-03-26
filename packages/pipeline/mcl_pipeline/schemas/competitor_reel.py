"""Competitor reel schema.

Ported from GVB schemas/competitor-reel.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ReelProfile(BaseModel):
    full_name: str = ""
    followers: int = 0
    username: str = ""


class CompetitorReel(BaseModel):
    """Metadata for a scraped competitor reel or video."""
    shortcode: str
    url: str
    video_url: str = ""
    views: int = Field(ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    caption: str = Field(default="", max_length=200)
    timestamp: Optional[datetime] = None
    profile: Optional[ReelProfile] = None

    # MCL-specific
    workspace_id: Optional[str] = None
