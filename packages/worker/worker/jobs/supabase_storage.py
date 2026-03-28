"""Supabase storage backend — saves pipeline output to DB tables."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client

logger = logging.getLogger(__name__)


class SupabaseStorage:
    def __init__(self, supabase: Client, workspace_id: str):
        self._sb = supabase
        self._ws = workspace_id

    # ------------------------------------------------------------------ topics
    def save_topics(self, topics: list[dict]) -> int:
        """Upsert topics. Returns number of rows saved."""
        if not topics:
            return 0
        rows = []
        for t in topics:
            row = {
                "workspace_id": self._ws,
                "title": t.get("title", ""),
                "description": t.get("description", ""),
                "status": t.get("status", "discovered"),
                "source": t.get("source", {}),
                "scoring": t.get("scoring", {}),
                "pillars": t.get("pillars", []),
                "notes": t.get("notes", ""),
            }
            # Use external_id to deduplicate (e.g. YouTube video ID)
            ext_id = t.get("id") or t.get("external_id")
            if ext_id:
                row["external_id"] = ext_id
            rows.append(row)

        try:
            result = self._sb.table("topics").upsert(
                rows,
                on_conflict="workspace_id,external_id",
                ignore_duplicates=True,
            ).execute()
            return len(result.data or [])
        except Exception as e:
            logger.error("save_topics error: %s", e)
            # Fallback: insert without upsert
            try:
                result = self._sb.table("topics").insert(rows).execute()
                return len(result.data or [])
            except Exception as e2:
                logger.error("save_topics insert fallback error: %s", e2)
                return 0

    def load_topics(self, status: str | None = None, limit: int = 100) -> list[dict]:
        q = self._sb.table("topics").select("*").eq("workspace_id", self._ws)
        if status:
            q = q.eq("status", status)
        result = q.limit(limit).execute()
        return result.data or []

    # ------------------------------------------------------------------ angles
    def save_angles(self, angles: list[dict]) -> int:
        if not angles:
            return 0
        rows = [{"workspace_id": self._ws, **a} for a in angles]
        try:
            result = self._sb.table("angles").insert(rows).execute()
            return len(result.data or [])
        except Exception as e:
            logger.error("save_angles error: %s", e)
            return 0

    # ------------------------------------------------------------------ hooks
    def save_hooks(self, hooks: list[dict]) -> int:
        if not hooks:
            return 0
        rows = [{"workspace_id": self._ws, **h} for h in hooks]
        try:
            result = self._sb.table("hooks").insert(rows).execute()
            return len(result.data or [])
        except Exception as e:
            logger.error("save_hooks error: %s", e)
            return 0

    # ------------------------------------------------------------------ scripts
    def save_script(self, script: dict) -> dict | None:
        row = {"workspace_id": self._ws, **script}
        try:
            result = self._sb.table("scripts").insert(row).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("save_script error: %s", e)
            return None

    # ------------------------------------------------------------------ analytics
    def save_analytics(self, entries: list[dict]) -> int:
        if not entries:
            return 0
        rows = [{"workspace_id": self._ws, **e} for e in entries]
        try:
            result = self._sb.table("analytics_entries").upsert(
                rows, on_conflict="workspace_id,content_id"
            ).execute()
            return len(result.data or [])
        except Exception as e:
            logger.error("save_analytics error: %s", e)
            return 0

    def load_analytics(self, limit: int = 100) -> list[dict]:
        result = self._sb.table("analytics_entries").select("*").eq(
            "workspace_id", self._ws
        ).limit(limit).execute()
        return result.data or []
