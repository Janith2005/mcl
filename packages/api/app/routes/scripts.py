"""Script routes."""
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user
from app.utils.llm import chat as llm_chat

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/scripts", tags=["scripts"])


class CreateScriptRequest(BaseModel):
    external_id: str = ""
    angle_id: str | None = None
    platform: str
    title: str
    script_structure: dict | None = None
    filming_cards: list[dict] = []
    shortform_structure: dict | None = None
    estimated_duration: str = ""
    status: str = "draft"


class UpdateScriptRequest(BaseModel):
    title: str | None = None
    status: str | None = None
    script_structure: dict | None = None
    filming_cards: list[dict] | None = None
    shortform_structure: dict | None = None
    notes: str | None = None


class RewriteRequest(BaseModel):
    section_id: str = ""


class AddHookRequest(BaseModel):
    hook_id: str


@router.get("")
async def list_scripts(
    workspace_id: str,
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("scripts").select("*").eq("workspace_id", workspace_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data


@router.post("", status_code=201)
async def create_script(
    workspace_id: str,
    req: CreateScriptRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("scripts").insert({
        "workspace_id": workspace_id,
        **req.model_dump(),
    }).execute()
    return result.data[0]


@router.get("/{script_id}")
async def get_script(
    workspace_id: str,
    script_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("scripts").select("*").eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")
    return result.data


@router.put("/{script_id}")
async def update_script(
    workspace_id: str,
    script_id: str,
    req: UpdateScriptRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    update_data = req.model_dump(exclude_none=True)
    result = supabase.table("scripts").update(update_data).eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return result.data[0] if result.data else {"status": "updated"}


@router.patch("/{script_id}/publish")
async def publish_script(
    workspace_id: str,
    script_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("scripts").update({"status": "published"}).eq("id", script_id).eq(
        "workspace_id", workspace_id
    ).execute()
    return {"status": "published", "script_id": script_id}


@router.post("/{script_id}/rewrite")
async def rewrite_script(
    workspace_id: str,
    script_id: str,
    req: RewriteRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """AI rewrite of a script section using Azure OpenAI."""
    result = supabase.table("scripts").select("title, script_structure, filming_cards").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")

    title = result.data.get("title", "Untitled")
    structure = result.data.get("script_structure") or {}
    section_content = ""
    if req.section_id and isinstance(structure, dict):
        section_content = str(structure.get(req.section_id, structure))
    else:
        section_content = str(structure)

    try:
        content = llm_chat([
            {
                "role": "system",
                "content": (
                    "You are an expert video script writer specializing in high-retention content. "
                    "Rewrite the given script section to be more engaging, with stronger hooks, "
                    "clearer storytelling, and better pacing. Keep the same core message."
                ),
            },
            {
                "role": "user",
                "content": f"Script title: {title}\n\nSection to rewrite:\n{section_content}\n\nRewrite this to maximize viewer retention:",
            },
        ])
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {e}")

    return {"content": content}


@router.post("/{script_id}/tone-check")
async def tone_check(
    workspace_id: str,
    script_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Tone analysis for a script using Azure OpenAI."""
    result = supabase.table("scripts").select("title, script_structure").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")

    title = result.data.get("title", "Untitled")
    structure = str(result.data.get("script_structure") or "")

    try:
        analysis = llm_chat([
            {
                "role": "system",
                "content": (
                    "You are a content tone analyst. Analyze the given script and provide: "
                    "1) Tone breakdown (percentages of authoritative, conversational, educational, etc.), "
                    "2) Hook strength rating, "
                    "3) One specific improvement recommendation. "
                    "Be concise — 3-4 sentences max."
                ),
            },
            {
                "role": "user",
                "content": f"Script: {title}\n\n{structure}",
            },
        ])
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {e}")

    return {"result": analysis}


@router.get("/{script_id}/export")
async def export_script(
    workspace_id: str,
    script_id: str,
    format: str = "pdf",
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Export script as plain text (PDF generation requires a PDF library in production)."""
    result = supabase.table("scripts").select("*").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")
    data = result.data
    lines = [
        f"SCRIPT: {data.get('title', 'Untitled')}",
        f"Platform: {data.get('platform', '')}",
        f"Status: {data.get('status', '')}",
        "",
        "--- SCRIPT STRUCTURE ---",
        str(data.get("script_structure") or ""),
        "",
        "--- FILMING CARDS ---",
    ]
    for card in data.get("filming_cards") or []:
        lines.append(str(card))
    content = "\n".join(lines)
    filename = f"script-{script_id}.txt"
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{script_id}/hooks")
async def add_hook_to_script(
    workspace_id: str,
    script_id: str,
    req: AddHookRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Associate a hook with a script by storing it in script notes/metadata."""
    result = supabase.table("scripts").select("notes").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")
    existing_notes = result.data.get("notes") or ""
    new_notes = f"{existing_notes}\nhook:{req.hook_id}".strip()
    supabase.table("scripts").update({"notes": new_notes}).eq("id", script_id).execute()
    return {"status": "added", "script_id": script_id, "hook_id": req.hook_id}
