"""Document upload route — stores brand voice docs in brain context."""
import io
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/documents", tags=["documents"])

_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _extract_text(filename: str, content: bytes) -> str:
    """Best-effort text extraction from uploaded file."""
    name = filename.lower()
    if name.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return content.decode("utf-8", errors="ignore")
    # .txt / .md / .doc fallback — treat as UTF-8 text
    return content.decode("utf-8", errors="ignore")


@router.get("")
async def list_documents(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    data = (result.data or {}).get("data") or {}
    docs = data.get("documents") or []
    # Return without full text content for listing
    return [{"id": d["id"], "name": d["name"], "size": d.get("size", 0), "created_at": d.get("created_at")} for d in docs]


@router.post("")
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    text = _extract_text(file.filename or "upload.txt", content)

    doc_entry = {
        "id": str(uuid_lib.uuid4()),
        "name": file.filename,
        "size": len(content),
        "text": text[:20000],  # Store up to 20k chars for context
        "created_at": "now()",
    }

    # Load current brain data
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    brain_data: dict = dict((result.data or {}).get("data") or {})
    docs: list = list(brain_data.get("documents") or [])
    docs.append(doc_entry)
    brain_data["documents"] = docs

    supabase.table("brains").update({"data": brain_data}).eq("workspace_id", workspace_id).execute()

    return {"id": doc_entry["id"], "name": doc_entry["name"], "size": doc_entry["size"]}


@router.delete("/{doc_id}")
async def delete_document(
    workspace_id: str,
    doc_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    brain_data: dict = dict((result.data or {}).get("data") or {})
    docs = [d for d in (brain_data.get("documents") or []) if d["id"] != doc_id]
    brain_data["documents"] = docs
    supabase.table("brains").update({"data": brain_data}).eq("workspace_id", workspace_id).execute()
    return {"status": "deleted", "id": doc_id}
