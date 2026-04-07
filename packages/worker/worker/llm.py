"""LLM utility for the worker - mirrors packages/api/app/utils/llm.py."""
from __future__ import annotations

import json
import logging
import os
import re

import httpx

logger = logging.getLogger(__name__)

_http_client: httpx.Client | None = None


def _get_client() -> httpx.Client:
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=120.0)
    return _http_client


def chat(messages: list[dict], temperature: float = 0.7) -> str:
    """Call Azure OpenAI and return the reply text."""
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "Kimi-K2.5")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-05-01-preview")

    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

    response = _get_client().post(
        url,
        headers={"api-key": api_key, "Content-Type": "application/json"},
        json={
            "messages": messages,
            "max_completion_tokens": 4096,
            "temperature": temperature,
        },
    )
    response.raise_for_status()
    data = response.json()
    msg = data["choices"][0]["message"]
    return msg.get("content") or msg.get("reasoning_content") or ""


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if not cleaned.startswith("```"):
        return cleaned

    lines = cleaned.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    if lines and lines[0].strip().lower() in {"json", "jsonc"}:
        lines = lines[1:]
    return "\n".join(lines).strip()


def _find_balanced_json_end(text: str, start: int) -> int:
    stack: list[str] = []
    in_string = False
    escaped = False

    for idx in range(start, len(text)):
        ch = text[idx]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch in "[{":
            stack.append(ch)
            continue

        if ch in "]}":
            if not stack:
                continue
            open_ch = stack[-1]
            if (open_ch == "[" and ch == "]") or (open_ch == "{" and ch == "}"):
                stack.pop()
                if not stack:
                    return idx + 1

    return -1


def _extract_json_payload(text: str) -> str:
    starts = [idx for idx in (text.find("["), text.find("{")) if idx != -1]
    if not starts:
        return text

    start = min(starts)
    end = _find_balanced_json_end(text, start)
    if end == -1:
        return text[start:]
    return text[start:end]


def _parse_json_with_fallbacks(raw: str) -> list | dict:
    text = _strip_code_fences(raw)
    normalized = (
        text.replace("\ufeff", "")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2019", "'")
    )

    candidates = [normalized, _extract_json_payload(normalized)]
    for candidate in candidates:
        payload = candidate.strip()
        if not payload:
            continue

        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            fixed = re.sub(r",(\s*[}\]])", r"\1", payload)
            if fixed == payload:
                continue
            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                continue

    raise ValueError("LLM response could not be parsed as JSON")


def _repair_json_with_model(raw: str) -> str:
    repair_messages = [
        {
            "role": "system",
            "content": (
                "You repair malformed JSON. Return valid JSON only. "
                "Do not add markdown or commentary."
            ),
        },
        {
            "role": "user",
            "content": (
                "Repair the following into valid JSON while preserving structure and values:\n\n"
                f"{raw[:12000]}"
            ),
        },
    ]
    return chat(repair_messages, temperature=0.0)


def chat_json(messages: list[dict], temperature: float = 0.3, retries: int = 2) -> list | dict:
    """Call LLM and parse response as JSON with repair/retry fallbacks."""
    attempts = max(1, retries + 1)
    last_error: Exception | None = None
    last_raw = ""

    for attempt in range(attempts):
        raw = chat(messages, temperature=temperature)
        last_raw = raw
        try:
            return _parse_json_with_fallbacks(raw)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "chat_json parse failed (attempt %d/%d): %s",
                attempt + 1,
                attempts,
                exc,
            )

    if last_raw:
        try:
            repaired = _repair_json_with_model(last_raw)
            return _parse_json_with_fallbacks(repaired)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("chat_json repair attempt failed: %s", exc)

    raise ValueError(f"LLM returned invalid JSON after retries: {last_error}") from last_error
