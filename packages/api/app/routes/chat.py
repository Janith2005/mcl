"""Chat / Tactical Assistant routes — powered by Azure OpenAI."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["chat"])


class ChatRequest(BaseModel):
    content: str


class StrategyRequest(BaseModel):
    context: str = ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_workspace_context(supabase: Client, workspace_id: str) -> str:
    """Load brain + top topics to inject as context into the LLM."""
    parts = []

    # Brain data
    try:
        result = supabase.table("brains").select("data").eq(
            "workspace_id", workspace_id
        ).single().execute()
        brain = (result.data or {}).get("data") or {}
        if brain:
            if brain.get("demographics"):
                parts.append(f"Target audience: {brain['demographics']}")
            if brain.get("pain_points"):
                parts.append(f"Audience pain points: {brain['pain_points']}")
            if brain.get("desires"):
                parts.append(f"Audience desires: {brain['desires']}")
            guardrails = brain.get("guardrails") or []
            if guardrails:
                gl = ", ".join(g.get("title", "") for g in guardrails[:5])
                parts.append(f"Content guardrails (avoid): {gl}")
    except Exception:
        pass

    # Top topics
    try:
        result = supabase.table("topics").select("title, category, score, status").eq(
            "workspace_id", workspace_id
        ).order("score", desc=True).limit(8).execute()
        topics = result.data or []
        if topics:
            topic_lines = [f"  - {t['title']} (score: {t.get('score', 0)}, status: {t.get('status', '?')})" for t in topics]
            parts.append("Top topics in pipeline:\n" + "\n".join(topic_lines))
    except Exception:
        pass

    # Recent angles
    try:
        result = supabase.table("angles").select("title, strength_label").eq(
            "workspace_id", workspace_id
        ).limit(5).execute()
        angles = result.data or []
        if angles:
            angle_lines = [f"  - {a['title']} ({a.get('strength_label', '')})" for a in angles]
            parts.append("Recent angles:\n" + "\n".join(angle_lines))
    except Exception:
        pass

    return "\n\n".join(parts)


@router.post("/chat/message")
async def send_message(
    workspace_id: str,
    req: ChatRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    ctx = _build_workspace_context(supabase, workspace_id)
    system = (
        "You are a tactical content strategy assistant for Influence Pirates, "
        "an AI-powered content coaching platform. Help creators build high-retention "
        "content with strong hooks, compelling angles, and data-driven scripts. "
        "Be concise, direct, and actionable."
    )
    if ctx:
        system += f"\n\n## Workspace Context\n{ctx}"

    try:
        reply = llm_chat([
            {"role": "system", "content": system},
            {"role": "user", "content": req.content},
        ])
    except Exception:
        reply = "I'm having trouble connecting right now. Check your Azure OpenAI configuration in Settings."

    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": reply,
        "created_at": _now(),
    }


@router.post("/chat/strategy")
async def ask_strategy(
    workspace_id: str,
    req: StrategyRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    ctx = _build_workspace_context(supabase, workspace_id)
    system = (
        "You are a senior content strategist for Influence Pirates. "
        "Give sharp, specific tactical advice to help creators dominate their niche. "
        "Focus on hook patterns, angle frameworks, and pipeline efficiency. "
        "Reference the creator's actual topics and audience data when giving advice."
    )
    if ctx:
        system += f"\n\n## Workspace Context\n{ctx}"

    context_part = f"\n\nAdditional context: {req.context}" if req.context else ""
    try:
        reply = llm_chat([
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Give me a specific content strategy recommendation for my next piece of content based on my pipeline data.{context_part}",
            },
        ])
    except Exception:
        reply = "Strategy mode: analyse your top-performing topics, pick the highest-scoring angle, and build a hook that leads with the Negative Stake pattern. That's historically the strongest format."

    return {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": reply,
        "created_at": _now(),
    }
