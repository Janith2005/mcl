"""Angle routes."""
import json
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/angles", tags=["angles"])

_BADGE_DEFAULTS = [
    ("#10b981", "CONTRARIAN TAKE", "rgba(16,185,129,0.12)"),
    ("#6366f1", "MYTH BUSTER", "rgba(99,102,241,0.12)"),
    ("#f59e0b", "INSIDER ANGLE", "rgba(245,158,11,0.12)"),
    ("#ef4444", "POLARIZING VIEW", "rgba(239,68,68,0.12)"),
]


def _enrich_angle(a: dict, idx: int = 0) -> dict:
    contrast = a.get("contrast") or {}
    default_color, default_badge, default_bg = _BADGE_DEFAULTS[idx % len(_BADGE_DEFAULTS)]
    return {
        **a,
        "badge": contrast.get("badge", default_badge),
        "badge_color": contrast.get("badge_color", default_color),
        "badge_bg": contrast.get("badge_bg", default_bg),
        "strength_level": contrast.get("strength_level", "medium"),
        "strength_percent": contrast.get("strength_percent", 70),
        "strength_label": contrast.get("strength_label", "SOLID ANGLE"),
        "description": a.get("title", ""),
    }


class CreateAngleRequest(BaseModel):
    external_id: str = ""
    topic_id: str | None = None
    format: str
    title: str = ""
    contrast: dict = {}
    target_audience: str = ""
    pain_addressed: str = ""
    proof_method: str = ""
    content_job: str = ""
    status: str = "draft"


class UpdateAngleRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    title: str | None = None


class GenerateAnglesRequest(BaseModel):
    common_belief: str
    surprising_truth: str
    topic: str = ""
    format: str = "longform"


@router.get("")
async def list_angles(
    workspace_id: str,
    status: str | None = Query(None),
    topic_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("angles").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    if topic_id:
        query = query.eq("topic_id", topic_id)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return [_enrich_angle(a, i) for i, a in enumerate(result.data or [])]


@router.post("", status_code=201)
async def create_angle(
    workspace_id: str,
    req: CreateAngleRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("angles").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/{angle_id}")
async def get_angle(
    workspace_id: str,
    angle_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("angles").select("*").eq("id", angle_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Angle not found")
    return result.data


@router.put("/{angle_id}")
async def update_angle(
    workspace_id: str,
    angle_id: str,
    req: UpdateAngleRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("angles").update(update_data).eq("id", angle_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return result.data[0] if result.data else {"status": "updated"}


@router.post("/generate")
async def generate_angles(
    workspace_id: str,
    req: GenerateAnglesRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Generate 4 angles using the Contrast Formula via Azure OpenAI."""
    prompt = f"""You are an expert content angle strategist.

Using the Contrast Formula, generate 4 distinct content angles for a {req.format} video.

Common belief (what most people think): {req.common_belief}
Surprising truth (the contrarian insight): {req.surprising_truth}
{f'Topic context: {req.topic}' if req.topic else ''}

Return a JSON array of exactly 4 angles. Each angle must have:
- title: string (compelling title for the angle)
- description: string (2-3 sentence description of the angle approach)
- badge: string (2-3 word label like "CONTRARIAN TAKE" or "MYTH BUSTER")
- badge_color: string (one of: "#10b981", "#f59e0b", "#6366f1", "#ef4444")
- badge_bg: string (rgba version with 0.12 alpha matching badge_color)
- strength_level: string (one of: "high", "medium", "low")
- strength_percent: number (60-95)
- strength_label: string (e.g. "STRONG ANGLE", "VIRAL POTENTIAL")

Return ONLY the JSON array, no other text."""

    try:
        raw = llm_chat([{"role": "user", "content": prompt}], temperature=0.8)
        # Strip markdown code fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        angles_data = json.loads(raw.strip())
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {e}")

    # Save generated angles to DB — badge data stored inside contrast JSONB
    saved = []
    for i, a in enumerate(angles_data):
        contrast = {
            "common_belief": req.common_belief,
            "surprising_truth": req.surprising_truth,
            "badge": a.get("badge", ""),
            "badge_color": a.get("badge_color", "#6366f1"),
            "badge_bg": a.get("badge_bg", "rgba(99,102,241,0.12)"),
            "strength_level": a.get("strength_level", "medium"),
            "strength_percent": a.get("strength_percent", 70),
            "strength_label": a.get("strength_label", "SOLID ANGLE"),
        }
        try:
            res = supabase.table("angles").insert({
                "workspace_id": workspace_id,
                "external_id": f"gen-{uuid_lib.uuid4()}",
                "format": req.format,
                "title": a.get("title", ""),
                "contrast": contrast,
                "status": "draft",
            }).execute()
            if res.data:
                saved.append(_enrich_angle(res.data[0], i))
        except Exception:
            saved.append({"id": str(uuid_lib.uuid4()), **a, **contrast})

    return saved
