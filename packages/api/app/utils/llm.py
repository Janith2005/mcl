"""Azure OpenAI client utility."""
import os
from openai import AzureOpenAI

_client: AzureOpenAI | None = None


def get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
            api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-05-01-preview"),
        )
    return _client


def chat(messages: list[dict], temperature: float = 0.7) -> str:
    """Send messages to Azure OpenAI and return the reply text."""
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "Kimi-K2.5")
    try:
        response = get_client().chat.completions.create(
            model=deployment,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        raise RuntimeError(f"Azure OpenAI error: {e}") from e
