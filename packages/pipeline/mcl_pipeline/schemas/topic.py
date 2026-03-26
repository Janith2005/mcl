"""Topic schema - discovered content topic.

Ported from GVB schemas/topic.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TopicSource(BaseModel):
    platform: str  # youtube, instagram, tiktok, reddit, etc.
    url: str
    author: str = ""
    engagement_signals: str = ""


class CCNFit(BaseModel):
    """Core/Casual/New audience fit."""
    model_config = ConfigDict(populate_by_name=True)

    core: bool = False
    casual: bool = False
    new_audience: bool = False
    pass_: bool = Field(default=False, alias="pass")


class TopicScoring(BaseModel):
    icp_relevance: int = Field(ge=1, le=10)
    timeliness: int = Field(ge=1, le=10)
    content_gap: int = Field(ge=1, le=10)
    proof_potential: int = Field(ge=1, le=10)
    total: int = Field(ge=4, le=40)
    weighted_total: float
    ccn_fit: Optional[CCNFit] = None


class CompetitorCoverage(BaseModel):
    competitor: str = ""
    url: str = ""
    performance: str = ""


class Topic(BaseModel):
    """A discovered topic scored against the creator's ICP."""
    id: str
    title: str
    description: str = ""
    source: TopicSource
    discovered_at: datetime
    scoring: TopicScoring
    pillars: list[str] = Field(default_factory=list)
    competitor_coverage: list[CompetitorCoverage] = Field(default_factory=list)
    status: str = Field(default="new")  # new | developing | scripted | passed
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
