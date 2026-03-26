"""PipelineConfig — dependency injection root for all pipeline modules.

Replaces hardcoded DATA_DIR, BRAIN_FILE, STATE_FILE, CACHE_DIR, etc.
across 14 GVB files (~30 path constants total).
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


class BrainLoader(Protocol):
    def load(self) -> "AgentBrain": ...
    def save(self, brain: "AgentBrain") -> None: ...


class CacheBackend(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str, ttl: int | None = None) -> None: ...
    def exists(self, key: str) -> bool: ...


class StorageBackend(Protocol):
    def save_topics(self, topics: list) -> None: ...
    def load_topics(self, **filters) -> list: ...
    # ... analogous methods for angles, hooks, scripts, analytics, insights


@dataclass
class PipelineConfig:
    data_dir: Path
    brain_loader: BrainLoader
    cache_backend: CacheBackend
    storage: StorageBackend
    llm_api_keys: dict[str, str] = field(default_factory=dict)
    platform_credentials: dict[str, dict] = field(default_factory=dict)
