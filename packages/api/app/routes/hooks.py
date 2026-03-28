"""Hook routes (generated hooks + swipe hooks)."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}", tags=["hooks"])

_PATTERN_BADGE: dict[str, tuple[str, str]] = {
    "The Question":      ("#6366f1", "QUESTION HOOK"),
    "The Stat":          ("#10b981", "STAT HOOK"),
    "The Negative Stake":("#ef4444", "NEGATIVE STAKE"),
    "The Contrarian":    ("#f59e0b", "CONTRARIAN"),
    "The Visual Bridge": ("#8b5cf6", "VISUAL BRIDGE"),
    "The Direct Payoff": ("#3b82f6", "DIRECT PAYOFF"),
}


def _enrich_hook(h: dict) -> dict:
    score = h.get("score") or {}
    eng = score.get("engagement", 75) if isinstance(score, dict) else 75
    rr_val = score.get("retention_risk", 50) if isinstance(score, dict) else 50
    retention_risk = "Low" if rr_val < 40 else "High" if rr_val > 70 else "Medium"
    badge_color, badge = _PATTERN_BADGE.get(h.get("pattern", ""), ("#6366f1", "ORIGINAL HOOK"))
    return {
        **h,
        "text": h.get("hook_text", ""),
        "engagement_potential": eng,
        "retention_risk": retention_risk,
        "badge": badge,
        "badge_color": badge_color,
    }


def _enrich_swipe_hook(h: dict) -> dict:
    eng = h.get("engagement") or {}
    success_rate = eng.get("success_rate", 80) if isinstance(eng, dict) else 80
    return {
        **h,
        "text": h.get("hook_text", ""),
        "success_rate": success_rate,
    }


class CreateHookRequest(BaseModel):
    external_id: str = ""
    angle_id: str | None = None
    platform: str
    pattern: str
    hook_text: str
    visual_cue: str = ""
    score: dict = {}
    status: str = "draft"


@router.get("/hooks")
async def list_hooks(
    workspace_id: str,
    angle_id: str | None = Query(None),
    pattern: str | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("hooks").select("*").eq("workspace_id", workspace_id)
    if angle_id:
        query = query.eq("angle_id", angle_id)
    if pattern:
        query = query.eq("pattern", pattern)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return [_enrich_hook(h) for h in (result.data or [])]


@router.post("/hooks", status_code=201)
async def create_hook(
    workspace_id: str,
    req: CreateHookRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("hooks").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return _enrich_hook(result.data[0])


@router.post("/hooks/{hook_id}/refine")
async def refine_hook(
    workspace_id: str,
    hook_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("hooks").select("*").eq("id", hook_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    hook = result.data or {}
    original = hook.get("hook_text", "")
    pattern = hook.get("pattern", "")

    try:
        refined_text = llm_chat([
            {
                "role": "system",
                "content": (
                    "You are an expert at writing high-retention video hooks. "
                    "Rewrite the given hook to be more compelling, specific, and attention-grabbing. "
                    "Use the same pattern type. Return ONLY the rewritten hook text, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"Pattern: {pattern}\nOriginal hook: {original}\n\nRewrite this hook to be more powerful:",
            },
        ])
    except Exception:
        refined_text = f"[Refined] {original}"

    supabase.table("hooks").update({"hook_text": refined_text}).eq("id", hook_id).execute()
    return {"status": "refined", "hook_id": hook_id, "hook_text": refined_text}


@router.get("/swipe-hooks")
async def list_swipe_hooks(
    workspace_id: str,
    pattern: str | None = Query(None),
    limit: int = Query(50, le=200),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("swipe_hooks").select("*").eq("workspace_id", workspace_id)
    if pattern:
        query = query.eq("pattern", pattern)
    result = query.order("saved_at", desc=True).limit(limit).execute()
    return [_enrich_swipe_hook(h) for h in (result.data or [])]
