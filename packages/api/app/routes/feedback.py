"""User feedback collection routes."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["feedback"])


class FeedbackRequest(BaseModel):
    type: str = Field(..., pattern=r"^(bug|feature|general)$")
    message: str = Field(..., min_length=1, max_length=5000)
    page: str = Field(default="", max_length=200)
    rating: int | None = Field(default=None, ge=1, le=5)
    workspace_id: str | None = None


@router.post("/feedback", status_code=201)
async def submit_feedback(
    req: FeedbackRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Submit user feedback (bug report, feature request, or general)."""
    row = {
        "user_id": user["user_id"],
        "type": req.type,
        "message": req.message,
        "page": req.page,
    }
    if req.rating is not None:
        row["rating"] = req.rating
    if req.workspace_id:
        row["workspace_id"] = req.workspace_id

    result = supabase.table("feedback").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    return {"status": "submitted", "id": result.data[0]["id"]}
