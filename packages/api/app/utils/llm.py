"""Azure OpenAI client utility — calls REST API directly via httpx."""
import os
import httpx

_http_client: httpx.Client | None = None


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=60.0)
    return _http_client


def chat(messages: list[dict], temperature: float = 0.7) -> str:
    """Send messages to Azure OpenAI REST API and return the reply text."""
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "Kimi-K2.5")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-05-01-preview")

    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

    try:
        response = _get_http_client().post(
            url,
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json={"messages": messages, "temperature": temperature, "max_completion_tokens": 8192},
        )
        response.raise_for_status()
        data = response.json()
        msg = data["choices"][0]["message"]
        return msg.get("content") or msg.get("reasoning_content") or ""
    except Exception as e:
        raise RuntimeError(f"Azure OpenAI error: {e}") from e
