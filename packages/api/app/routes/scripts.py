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


class SectionUpdateRequest(BaseModel):
    content: str


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


def _build_sections(data: dict) -> list[dict]:
    """Transform raw script_structure / shortform_structure JSONB into ScriptSection list."""
    accent_colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
    sections: list[dict] = []

    structure = data.get("script_structure") or {}
    shortform = data.get("shortform_structure") or {}

    if shortform and shortform.get("beats"):
        # Shortform: each beat becomes a section
        beats = shortform.get("beats", [])
        total_words = sum(len((b.get("action") or "").split()) for b in beats)
        for i, beat in enumerate(beats):
            text = beat.get("action") or beat.get("say") or ""
            wc = len(text.split())
            sections.append({
                "id": f"beat-{i}",
                "label": beat.get("timestamp", f"Beat {i + 1}"),
                "title": f"Beat {beat.get('beat_number', i + 1)}",
                "description": beat.get("visual", ""),
                "content": text,
                "word_count": wc,
                "total_words": total_words,
                "accent_color": accent_colors[i % len(accent_colors)],
            })
        # Add caption as a section
        if shortform.get("caption"):
            sections.append({
                "id": "caption",
                "label": "CAPTION",
                "title": "Caption & CTA",
                "description": f"CTA: {shortform.get('cta', '')}",
                "content": shortform.get("caption", ""),
                "word_count": len(shortform.get("caption", "").split()),
                "total_words": total_words,
                "accent_color": "#10b981",
            })
        return sections

    # Longform structure
    if structure.get("opening_hook"):
        hook = structure["opening_hook"]
        sections.append({
            "id": "opening-hook",
            "label": "HOOK",
            "title": "Opening Hook",
            "description": "Grab attention in the first 30 seconds",
            "content": hook if isinstance(hook, str) else str(hook),
            "word_count": len(str(hook).split()),
            "total_words": 0,
            "accent_color": "#ef4444",
        })

    if structure.get("intro"):
        intro = structure["intro"]
        sections.append({
            "id": "intro",
            "label": "INTRO",
            "title": "Introduction",
            "description": "Proof / Promise / Plan framework",
            "content": intro if isinstance(intro, str) else str(intro),
            "word_count": len(str(intro).split()),
            "total_words": 0,
            "accent_color": "#f59e0b",
        })

    for i, sec in enumerate(structure.get("sections", [])):
        points = sec.get("talking_points") or []
        content = (sec.get("title") or "") + "\n\n" + "\n".join(f"• {p}" for p in points)
        if sec.get("proof_element"):
            content += f"\n\n{sec['proof_element']}"
        if sec.get("transition"):
            content += f"\n\n→ {sec['transition']}"
        sections.append({
            "id": f"section-{i}",
            "label": f"SECTION {i + 1}",
            "title": sec.get("title", f"Section {i + 1}"),
            "description": ", ".join(points[:2]) if points else "",
            "content": content,
            "word_count": len(content.split()),
            "total_words": 0,
            "accent_color": accent_colors[(i + 2) % len(accent_colors)],
        })

    if structure.get("mid_cta"):
        mid = structure["mid_cta"]
        sections.append({
            "id": "mid-cta",
            "label": "MID-CTA",
            "title": "Mid-Roll CTA",
            "description": "Drive subscribe / like action",
            "content": mid if isinstance(mid, str) else str(mid),
            "word_count": len(str(mid).split()),
            "total_words": 0,
            "accent_color": "#8b5cf6",
        })

    if structure.get("closing_cta"):
        closing = structure["closing_cta"]
        outro = structure.get("outro", "")
        content = (closing if isinstance(closing, str) else str(closing))
        if outro:
            content += f"\n\n{outro}"
        sections.append({
            "id": "closing",
            "label": "OUTRO",
            "title": "Closing CTA & Outro",
            "description": "Final call to action",
            "content": content,
            "word_count": len(content.split()),
            "total_words": 0,
            "accent_color": "#06b6d4",
        })

    # Fill total_words
    total = sum(s["word_count"] for s in sections)
    for s in sections:
        s["total_words"] = total

    return sections


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
    data = result.data
    return {
        "id": data["id"],
        "title": data.get("title", "Untitled"),
        "sections": _build_sections(data),
    }


@router.put("/{script_id}/sections/{section_id}")
async def update_section(
    workspace_id: str,
    script_id: str,
    section_id: str,
    req: SectionUpdateRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Update a single section's content in script_structure / shortform_structure JSONB."""
    result = supabase.table("scripts").select("script_structure, shortform_structure").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")

    structure: dict = result.data.get("script_structure") or {}
    shortform: dict = result.data.get("shortform_structure") or {}
    content = req.content

    if section_id == "opening-hook":
        structure["opening_hook"] = content
    elif section_id == "intro":
        structure["intro"] = content
    elif section_id.startswith("section-"):
        try:
            idx = int(section_id.split("-")[1])
            secs = structure.get("sections", [])
            if 0 <= idx < len(secs):
                # Store edited content as talking_points (split on newlines)
                lines = [l.lstrip("•").strip() for l in content.split("\n") if l.strip()]
                secs[idx]["talking_points"] = lines if lines else [content]
                structure["sections"] = secs
        except (ValueError, IndexError):
            pass
    elif section_id == "mid-cta":
        structure["mid_cta"] = content
    elif section_id == "closing":
        parts = content.split("\n\n", 1)
        structure["closing_cta"] = parts[0]
        structure["outro"] = parts[1] if len(parts) > 1 else ""
    elif section_id.startswith("beat-"):
        try:
            idx = int(section_id.split("-")[1])
            beats = shortform.get("beats", [])
            if 0 <= idx < len(beats):
                beats[idx]["action"] = content
                shortform["beats"] = beats
        except (ValueError, IndexError):
            pass
    elif section_id == "caption":
        shortform["caption"] = content
    else:
        raise HTTPException(status_code=400, detail=f"Unknown section_id: {section_id}")

    update_payload: dict = {}
    if structure:
        update_payload["script_structure"] = structure
    if shortform:
        update_payload["shortform_structure"] = shortform

    if update_payload:
        supabase.table("scripts").update(update_payload).eq("id", script_id).eq(
            "workspace_id", workspace_id
        ).execute()

    return {"section_id": section_id, "content": content}


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
    """Export script as a branded PDF."""
    result = supabase.table("scripts").select("*").eq(
        "id", script_id
    ).eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Script not found")

    data = result.data
    safe_title = (data.get("title") or "script").replace(" ", "-").replace("/", "-")[:40]

    try:
        from mcl_pipeline.pdf.generator import generate_script_pdf
        pdf_bytes = generate_script_pdf(data)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )
    except Exception:
        # Fallback to plain text if PDF generation fails
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
        return StreamingResponse(
            io.BytesIO("\n".join(lines).encode()),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.txt"'},
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
