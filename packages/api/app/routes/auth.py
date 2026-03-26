"""Authentication routes."""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import Client
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateApiKeyRequest(BaseModel):
    workspace_id: str
    name: str = "Default"


@router.post("/signup")
async def signup(req: SignupRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"full_name": req.full_name}},
        })
        return {"user_id": result.user.id, "email": result.user.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest, supabase: Client = Depends(get_supabase)):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user_id": result.user.id,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/api-key")
async def create_api_key(
    req: CreateApiKeyRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    import bcrypt
    raw_key = f"mcl_{secrets.token_urlsafe(32)}"
    key_hash = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()
    key_prefix = raw_key[:12]

    supabase.table("api_keys").insert({
        "workspace_id": req.workspace_id,
        "user_id": user["user_id"],
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "name": req.name,
    }).execute()

    return {"api_key": raw_key, "prefix": key_prefix, "name": req.name}


@router.delete("/api-key/{key_id}")
async def revoke_api_key(
    key_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    supabase.table("api_keys").delete().eq("id", key_id).eq("user_id", user["user_id"]).execute()
    return {"status": "revoked"}
