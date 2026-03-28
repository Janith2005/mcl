"""Supabase-backed brain loader for the worker."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from supabase import Client

from mcl_pipeline.schemas.brain import (
    AgentBrain,
    Identity,
    ICP,
    Pillar,
    PlatformConfig,
    Competitor,
    Cadence,
    WeeklySchedule,
    Monetization,
    CTAStrategy,
    LearningWeights,
    HookPreferences,
    PerformancePatterns,
    BrainMetadata,
)

logger = logging.getLogger(__name__)

BRAIN_CACHE_TTL = 300  # 5 minutes


def _default_brain(workspace_id: str) -> AgentBrain:
    """Return a minimal default brain when none exists in the DB yet."""
    now = datetime.now(timezone.utc)
    return AgentBrain(
        workspace_id=workspace_id,
        identity=Identity(
            name="Creator",
            brand="My Brand",
            niche="content creation",
            tone=["conversational", "educational"],
            differentiator="authentic perspective",
        ),
        icp=ICP(
            segments=["content creators", "entrepreneurs"],
            pain_points=["not enough views", "low engagement", "inconsistent posting"],
            goals=["grow audience", "monetize content", "build brand"],
            platforms_they_use=["youtube", "instagram"],
            budget_range="bootstrap",
        ),
        pillars=[
            Pillar(name="Strategy", description="Content strategy and growth", keywords=["content strategy", "growth", "algorithm"]),
            Pillar(name="Monetization", description="Revenue and income", keywords=["revenue", "income", "brand deals"]),
        ],
        platforms=PlatformConfig(
            research=["youtube", "reddit", "tiktok"],
            posting=["youtube", "instagram"],
        ),
        competitors=[],
        cadence=Cadence(
            weekly_schedule=WeeklySchedule(
                shorts_per_day=1,
                shorts_days=["monday", "wednesday", "friday"],
                longform_per_week=1,
                longform_days=["tuesday"],
            ),
        ),
        monetization=Monetization(
            primary_funnel="newsletter",
            secondary_funnels=["community", "coaching"],
            cta_strategy=CTAStrategy(),
        ),
        learning_weights=LearningWeights(),
        hook_preferences=HookPreferences(),
        metadata=BrainMetadata(
            version="0.1.0",
            created_at=now,
            updated_at=now,
        ),
    )


def _row_to_brain(row: dict, workspace_id: str) -> AgentBrain:
    """Deserialize a Supabase brain row into AgentBrain."""
    now = datetime.now(timezone.utc)

    # Helper: safely parse a sub-object or return empty dict
    def _d(key: str) -> dict:
        v = row.get(key)
        return v if isinstance(v, dict) else {}

    def _l(key: str) -> list:
        v = row.get(key)
        return v if isinstance(v, list) else []

    try:
        id_data = _d("identity")
        identity = Identity(
            name=id_data.get("name", "Creator"),
            brand=id_data.get("brand", "Brand"),
            niche=id_data.get("niche", "content"),
            tone=id_data.get("tone", ["conversational"]),
            differentiator=id_data.get("differentiator", ""),
        )

        icp_data = _d("icp")
        icp = ICP(
            segments=icp_data.get("segments", []),
            pain_points=icp_data.get("pain_points", []),
            goals=icp_data.get("goals", []),
            platforms_they_use=icp_data.get("platforms_they_use", icp_data.get("platforms", [])),
            budget_range=icp_data.get("budget_range", icp_data.get("budget", "")),
        )

        pillars = [
            Pillar(
                name=p.get("name", ""),
                description=p.get("description", ""),
                keywords=p.get("keywords", []),
            )
            for p in _l("pillars")
        ]
        if not pillars:
            pillars = [Pillar(name="General", description="General content", keywords=[])]

        plat_data = _d("platforms")
        platforms = PlatformConfig(
            research=plat_data.get("research", ["youtube"]),
            posting=plat_data.get("posting", ["youtube"]),
        )

        competitors = [
            Competitor(
                name=c.get("name", ""),
                platform=c.get("platform", "youtube"),
                handle=c.get("handle", ""),
                why_watch=c.get("why_watch", ""),
            )
            for c in _l("competitors")
        ]

        weights_data = _d("learning_weights")
        weights = LearningWeights(**weights_data) if weights_data else LearningWeights()

        hook_data = _d("hook_preferences")
        hooks = HookPreferences(**hook_data) if hook_data else HookPreferences()

        meta_data = _d("metadata")
        metadata = BrainMetadata(
            version=meta_data.get("version", "0.1.0"),
            created_at=datetime.fromisoformat(meta_data["created_at"]) if meta_data.get("created_at") else now,
            updated_at=datetime.fromisoformat(meta_data["updated_at"]) if meta_data.get("updated_at") else now,
        )

        return AgentBrain(
            workspace_id=workspace_id,
            identity=identity,
            icp=icp,
            pillars=pillars,
            platforms=platforms,
            competitors=competitors,
            cadence=Cadence(weekly_schedule=WeeklySchedule()),
            monetization=Monetization(primary_funnel="newsletter"),
            learning_weights=weights,
            hook_preferences=hooks,
            metadata=metadata,
        )

    except Exception as e:
        logger.warning("Brain deserialization failed (%s), using default", e)
        return _default_brain(workspace_id)


def load_document_context(supabase: Client, workspace_id: str, max_chars: int = 8000) -> str:
    """Return concatenated text from uploaded brand voice documents."""
    try:
        result = supabase.table("brains").select("data").eq(
            "workspace_id", workspace_id
        ).single().execute()
        data = (result.data or {}).get("data") or {}
        docs = data.get("documents") or []
        if not docs:
            return ""
        parts = []
        total = 0
        for doc in docs:
            text = doc.get("text") or ""
            remaining = max_chars - total
            if remaining <= 0:
                break
            chunk = text[:remaining]
            parts.append(f"--- {doc.get('name', 'Document')} ---\n{chunk}")
            total += len(chunk)
        return "\n\n".join(parts)
    except Exception as e:
        logger.warning("Failed to load document context: %s", e)
        return ""


def load_brain(supabase: Client, workspace_id: str, redis=None) -> AgentBrain:
    """Load brain from Redis cache, falling back to Supabase."""
    cache_key = f"brain:{workspace_id}"

    # Try Redis cache first
    if redis is not None:
        try:
            cached = redis.get(cache_key)
            if cached:
                data = json.loads(cached)
                return AgentBrain.model_validate(data)
        except Exception as e:
            logger.debug("Redis brain cache miss: %s", e)

    # Load from Supabase
    try:
        result = supabase.table("brains").select("*").eq(
            "workspace_id", workspace_id
        ).limit(1).execute()

        if result.data:
            brain = _row_to_brain(result.data[0], workspace_id)
        else:
            logger.info("No brain found for workspace %s, using default", workspace_id)
            brain = _default_brain(workspace_id)

        # Cache in Redis
        if redis is not None:
            try:
                redis.set(cache_key, brain.model_dump_json(), ex=BRAIN_CACHE_TTL)
            except Exception:
                pass

        return brain

    except Exception as e:
        logger.error("Failed to load brain from Supabase: %s", e)
        return _default_brain(workspace_id)


def save_brain(supabase: Client, workspace_id: str, brain: AgentBrain, redis=None) -> None:
    """Persist brain updates back to Supabase and invalidate Redis cache."""
    now = datetime.now(timezone.utc)
    brain_data = {
        "workspace_id": workspace_id,
        "identity": brain.identity.model_dump(),
        "icp": brain.icp.model_dump(),
        "pillars": [p.model_dump() for p in brain.pillars],
        "platforms": brain.platforms.model_dump(),
        "competitors": [c.model_dump() for c in brain.competitors],
        "learning_weights": brain.learning_weights.model_dump(),
        "hook_preferences": brain.hook_preferences.model_dump(),
        "metadata": {
            **brain.metadata.model_dump(mode="json"),
            "updated_at": now.isoformat(),
        },
    }

    try:
        supabase.table("brains").upsert(
            brain_data, on_conflict="workspace_id"
        ).execute()
    except Exception as e:
        logger.error("Failed to save brain: %s", e)

    # Invalidate cache
    if redis is not None:
        try:
            redis.delete(f"brain:{workspace_id}")
        except Exception:
            pass
