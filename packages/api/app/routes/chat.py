"""Chat / Tactical Assistant routes — powered by Azure OpenAI."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["chat"])


class ChatRequest(BaseModel):
    content: str


class StrategyRequest(BaseModel):
    context: str = ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/chat/message")
async def send_message(
    workspace_id: str,
    req: ChatRequest,
    user: dict = Depends(get_current_user),
):
    try:
        reply = llm_chat([
            {
                "role": "system",
                "content": (
                    "You are a tactical content strategy assistant for Influence Pirates, "
                    "an AI-powered content coaching platform. Help creators build high-retention "
                    "content with strong hooks, compelling angles, and data-driven scripts. "
                    "Be concise, direct, and actionable."
                ),
            },
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
):
    context_part = f"\n\nContext: {req.context}" if req.context else ""
    try:
        reply = llm_chat([
            {
                "role": "system",
                "content": (
                    "You are a senior content strategist for Influence Pirates. "
                    "Give sharp, specific tactical advice to help creators dominate their niche. "
                    "Focus on hook patterns, angle frameworks, and pipeline efficiency."
                ),
            },
            {
                "role": "user",
                "content": f"Give me a specific content strategy recommendation for my next piece of content.{context_part}",
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
