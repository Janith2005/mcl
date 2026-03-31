"""Topic routes."""
import json
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/topics", tags=["topics"])


def _enrich(topic: dict) -> dict:
    """Add computed fields: category (from source) and score (from scoring)."""
    source = topic.get("source") or {}
    scoring = topic.get("scoring") or {}
    topic["category"] = source.get("category", "GENERAL") if isinstance(source, dict) else "GENERAL"
    topic["score"] = scoring.get("total", 50) if isinstance(scoring, dict) else 50
    return topic


class CreateTopicRequest(BaseModel):
    external_id: str = ""
    title: str
    category: str = "GENERAL"
    description: str = ""
    scoring: dict = {}
    pillars: list[str] = []
    status: str = "new"


class UpdateTopicRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    scoring: dict | None = None
    category: str | None = None
    title: str | None = None


@router.get("")
async def list_topics(
    workspace_id: str,
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("topics").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    result = query.order("discovered_at", desc=True).range(offset, offset + limit - 1).execute()
    return [_enrich(t) for t in (result.data or [])]


@router.post("", status_code=201)
async def create_topic(
    workspace_id: str,
    req: CreateTopicRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Store category inside `source` JSONB (no separate DB column for category)
    insert_data = {
        "workspace_id": workspace_id,
        "external_id": req.external_id or f"manual-{workspace_id[:8]}-{__import__('time').time_ns()}",
        "title": req.title,
        "description": req.description,
        "source": {"category": req.category},
        "scoring": req.scoring,
        "pillars": req.pillars,
        "status": req.status,
    }
    result = supabase.table("topics").insert(insert_data).execute()
    return _enrich(result.data[0])


class GenerateTopicsRequest(BaseModel):
    niche: str = ""
    platform: str = "youtube"
    keywords: list[str] = []
    count: int = 6


@router.post("/generate")
async def generate_topics(
    workspace_id: str,
    req: GenerateTopicsRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Generate topic ideas using AI and save them to the workspace."""
    niche_ctx = f"Creator niche: {req.niche}" if req.niche else "Creator niche: general content creation"
    keywords_ctx = f"Focus keywords: {', '.join(req.keywords)}" if req.keywords else ""
    platform_ctx = f"Target platform: {req.platform}"

    prompt = f"""You are an expert content strategist for social media creators.

{niche_ctx}
{platform_ctx}
{keywords_ctx}

Generate {req.count} trending, high-potential content topic ideas.

Return a JSON array of exactly {req.count} topics. Each must have:
- title: string (compelling, specific video title — not generic)
- description: string (2-3 sentences explaining the angle and why it will perform)
- category: string (one of: TECH, BUSINESS, LIFESTYLE, HEALTH, FINANCE, FITNESS, GENERAL)
- scoring: object with total (60-95), virality (0-100), relevance (0-100), competition (0-100, lower = less saturated)
- pillars: array of 2-3 short keyword tags
- engagement: string (e.g. "High virality — taps into fear of missing out")

Return ONLY the JSON array, no other text."""

    try:
        raw = llm_chat([{"role": "user", "content": prompt}])
        raw = raw.strip()
        # Strip markdown code fences
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        raw = raw.strip()
        # If JSON is truncated, try to salvage complete objects
        if not raw.endswith("]"):
            last_brace = raw.rfind("},")
            if last_brace != -1:
                raw = raw[:last_brace + 1] + "]"
            else:
                raw = raw + "]" if raw.endswith("}") else "[]"
        topics_data = json.loads(raw)
        if not isinstance(topics_data, list):
            topics_data = []
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {e}")

    saved = []
    for t in topics_data:
        scoring = t.get("scoring") or {}
        source = {"category": t.get("category", "GENERAL"), "platform": req.platform}
        if req.niche:
            source["niche"] = req.niche
        try:
            res = supabase.table("topics").insert({
                "workspace_id": workspace_id,
                "external_id": f"ai-{uuid_lib.uuid4()}",
                "title": t.get("title", ""),
                "description": t.get("description", ""),
                "source": source,
                "scoring": {
                    "total": scoring.get("total", 70),
                    "virality": scoring.get("virality", 70),
                    "relevance": scoring.get("relevance", 70),
                    "competition": scoring.get("competition", 50),
                },
                "pillars": t.get("pillars", []),
                "status": "new",
            }).execute()
            if res.data:
                enriched = _enrich(res.data[0])
                enriched["engagement"] = t.get("engagement", "")
                saved.append(enriched)
        except Exception:
            saved.append({
                "id": str(uuid_lib.uuid4()),
                **_enrich({
                    "title": t.get("title", ""),
                    "description": t.get("description", ""),
                    "source": source,
                    "scoring": scoring,
                    "pillars": t.get("pillars", []),
                    "status": "new",
                    "created_at": "",
                }),
                "engagement": t.get("engagement", ""),
            })

    return saved


@router.get("/{topic_id}")
async def get_topic(
    workspace_id: str,
    topic_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("topics").select("*").eq("id", topic_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Topic not found")
    return _enrich(result.data)


@router.put("/{topic_id}")
async def update_topic(
    workspace_id: str,
    topic_id: str,
    req: UpdateTopicRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    # If category is being updated, store it in source JSONB
    if "category" in update_data:
        cat = update_data.pop("category")
        # Merge with existing source
        existing = supabase.table("topics").select("source").eq("id", topic_id).single().execute()
        src = (existing.data or {}).get("source") or {}
        src["category"] = cat
        update_data["source"] = src
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("topics").update(update_data).eq("id", topic_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return _enrich(result.data[0]) if result.data else {"status": "updated"}


@router.delete("/{topic_id}")
async def delete_topic(
    workspace_id: str,
    topic_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("topics").delete().eq("id", topic_id).eq("workspace_id", workspace_id).execute()
    return {"status": "deleted"}
