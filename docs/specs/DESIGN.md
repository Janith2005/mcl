# Microcelebrity Labs (MCL) -- Design Specification

**Version:** 0.1.0-draft
**Date:** 2026-03-24
**Status:** Pre-implementation
**Origin:** Spin-off from Go Viral Bitch (GVB) at `/content-scale/goviralbitch/`

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Layer 1: Pipeline Package](#3-layer-1-pipeline-package)
4. [Layer 2: API](#4-layer-2-api)
5. [Layer 3a: Web Dashboard](#5-layer-3a-web-dashboard)
6. [Layer 3b: CLI](#6-layer-3b-cli)
7. [Layer 3c: MCP Server](#7-layer-3c-mcp-server)
8. [Channel Plugin Architecture](#8-channel-plugin-architecture)
9. [Data Model](#9-data-model)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Background Job System](#11-background-job-system)
12. [AI Integration](#12-ai-integration)
13. [Real-time Updates](#13-real-time-updates)
14. [File Storage](#14-file-storage)
15. [OpenAPI Contract](#15-openapi-contract)
16. [Error Handling & Logging](#16-error-handling--logging)
17. [Caching Strategy](#17-caching-strategy)
18. [Security](#18-security)
19. [Deployment Architecture](#19-deployment-architecture)
20. [GVB Code Reuse Map](#20-gvb-code-reuse-map)

---

## 1. System Architecture Overview

MCL is a three-layer SaaS system. Layer 1 (Pipeline Core) is the algorithmic moat -- pure Python, no web framework, no auth. Layer 2 (FastAPI) adds HTTP, auth, multi-tenancy, and job dispatch. Layer 3 (Clients) consumes the API via generated TypeScript (web), direct import (CLI), or MCP protocol (AI agents).

```
+------------------------------------------------------------------+
|                        LAYER 3: CLIENTS                          |
|                                                                  |
|  +------------------+  +-------------+  +--------------------+   |
|  | Web Dashboard    |  | CLI         |  | MCP Server         |   |
|  | Vite+React+TS    |  | pip install |  | (future)           |   |
|  | shadcn/ui        |  | mcl         |  | Claude/GPT wrapper |   |
|  | TanStack Query   |  |             |  |                    |   |
|  +--------+---------+  +------+------+  +---------+----------+   |
|           |                   |                    |              |
|           | OpenAPI-gen TS    | direct import OR   | JSON-RPC     |
|           | client            | HTTP calls         |              |
+-----------|-------------------|--------------------|--------------+
            |                   |                    |
+-----------v-------------------v--------------------v--------------+
|                        LAYER 2: API (FastAPI)                     |
|                                                                   |
|  +------------------+  +----------------+  +------------------+   |
|  | Auth Middleware   |  | Rate Limiter   |  | WebSocket Hub    |   |
|  | Supabase JWT     |  | sliding window |  | /ws/pipeline     |   |
|  | API key verify   |  | per-workspace  |  | /ws/chat         |   |
|  +------------------+  +----------------+  +------------------+   |
|                                                                   |
|  +------------------+  +----------------+  +------------------+   |
|  | REST Routes      |  | Job Dispatcher |  | OpenAPI Spec     |   |
|  | /api/v1/*        |  | ARQ + Redis    |  | auto-generated   |   |
|  | workspace_id     |  | async dispatch |  | feeds TS client  |   |
|  +--------+---------+  +-------+--------+  +------------------+   |
|           |                    |                                   |
+-----------|--------------------|-----------+----------------------+
            |                    |           |
+-----------v--------------------v-----------v----------------------+
|                   LAYER 1: PIPELINE CORE                          |
|                   Python package: mcl-pipeline                    |
|                                                                   |
|  +----------------+  +----------------+  +-------------------+    |
|  | Recon Module   |  | Scoring Engine |  | Prompt Templates  |    |
|  | scrapers       |  | ICP scoring    |  | versioned prompts |    |
|  | skeleton ripper|  | weighted total |  | from GVB commands |    |
|  | bridge         |  | rescore        |  |                   |    |
|  +----------------+  +----------------+  +-------------------+    |
|                                                                   |
|  +----------------+  +----------------+  +-------------------+    |
|  | Channel Plugins|  | Brain Engine   |  | Content Generator |    |
|  | YouTube        |  | load/save/     |  | angles, hooks,    |    |
|  | Instagram      |  | evolve brain   |  | scripts, PDFs     |    |
|  | Reddit, TikTok |  |                |  |                   |    |
|  +----------------+  +----------------+  +-------------------+    |
|                                                                   |
+-------------------------------------------------------------------+
            |                    |
+-----------v--------------------v----------------------------------+
|                     INFRASTRUCTURE                                |
|                                                                   |
|  +-----------------+  +---------------+  +-------------------+    |
|  | Supabase        |  | Redis         |  | External APIs     |    |
|  | Postgres + RLS  |  | job queue     |  | YouTube Data v3   |    |
|  | Auth            |  | cache         |  | OpenAI / Anthropic|    |
|  | Realtime        |  | rate limits   |  | yt-dlp            |    |
|  | Storage         |  |               |  | instaloader       |    |
|  +-----------------+  +---------------+  +-------------------+    |
|                                                                   |
|  +-----------------+  +---------------+  +-------------------+    |
|  | Sentry          |  | PostHog       |  | Resend            |    |
|  | error tracking  |  | product       |  | transactional     |    |
|  |                 |  | analytics     |  | email             |    |
|  +-----------------+  +---------------+  +-------------------+    |
+-------------------------------------------------------------------+
```

### Request Flow (example: user triggers competitor recon)

```
Browser -> POST /api/v1/recon/run
  -> Auth middleware validates Supabase JWT
  -> Rate limiter checks workspace quota
  -> Handler creates job record in Postgres
  -> ARQ enqueues `recon.run_pipeline` job
  -> Returns job_id + 202 Accepted

ARQ Worker picks up job:
  -> Loads workspace config from Postgres
  -> Calls mcl_pipeline.recon.run(config) -- Layer 1, no auth awareness
  -> Streams progress via Supabase Realtime (INSERT into job_events)
  -> Writes results to Postgres + Supabase Storage
  -> Updates job status to "complete"

Browser (subscribed to Supabase Realtime):
  -> Receives job_events in real-time
  -> Updates UI progress bar
  -> On complete, fetches results via GET /api/v1/recon/jobs/{job_id}
```

---

## 2. Monorepo Structure

```
mcl/
+-- packages/
|   +-- pipeline/                       # Layer 1: mcl-pipeline Python package
|   |   +-- pyproject.toml              # Package metadata, dependencies
|   |   +-- src/
|   |   |   +-- mcl_pipeline/
|   |   |   |   +-- __init__.py         # Package exports
|   |   |   |   +-- recon/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- scrapers/
|   |   |   |   |   |   +-- __init__.py
|   |   |   |   |   |   +-- youtube.py       # <- GVB recon/scraper/youtube.py
|   |   |   |   |   |   +-- instagram.py     # <- GVB recon/scraper/instagram.py
|   |   |   |   |   |   +-- downloader.py    # <- GVB recon/scraper/downloader.py
|   |   |   |   |   +-- skeleton_ripper/
|   |   |   |   |   |   +-- __init__.py
|   |   |   |   |   |   +-- pipeline.py      # <- GVB recon/skeleton_ripper/pipeline.py
|   |   |   |   |   |   +-- extractor.py     # <- GVB recon/skeleton_ripper/extractor.py
|   |   |   |   |   |   +-- synthesizer.py   # <- GVB recon/skeleton_ripper/synthesizer.py
|   |   |   |   |   |   +-- aggregator.py    # <- GVB recon/skeleton_ripper/aggregator.py
|   |   |   |   |   |   +-- llm_client.py    # <- GVB recon/skeleton_ripper/llm_client.py
|   |   |   |   |   |   +-- prompts.py       # <- GVB recon/skeleton_ripper/prompts.py
|   |   |   |   |   |   +-- cache.py         # <- GVB recon/skeleton_ripper/cache.py
|   |   |   |   |   +-- bridge.py            # <- GVB recon/bridge.py
|   |   |   |   |   +-- config.py            # <- GVB recon/config.py (refactored)
|   |   |   |   |   +-- tracker.py           # <- GVB recon/tracker.py
|   |   |   |   |   +-- storage/
|   |   |   |   |   |   +-- __init__.py
|   |   |   |   |   |   +-- models.py        # <- GVB recon/storage/models.py
|   |   |   |   |   |   +-- database.py      # <- GVB recon/storage/database.py (for local mode)
|   |   |   |   |   +-- utils/
|   |   |   |   |       +-- __init__.py
|   |   |   |   |       +-- logger.py        # <- GVB recon/utils/logger.py (refactored)
|   |   |   |   |       +-- retry.py         # <- GVB recon/utils/retry.py
|   |   |   |   +-- scoring/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- engine.py            # <- GVB scoring/engine.py
|   |   |   |   |   +-- rescore.py           # <- GVB scoring/rescore.py
|   |   |   |   +-- brain/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- engine.py            # Brain load/save/evolve logic
|   |   |   |   |   +-- evolution.py         # <- extracted from GVB viral-update-brain.md
|   |   |   |   +-- content/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- discover.py          # <- extracted from GVB viral-discover.md
|   |   |   |   |   +-- angles.py            # <- extracted from GVB viral-angle.md
|   |   |   |   |   +-- hooks.py             # <- extracted from GVB viral-script.md (HookGenie)
|   |   |   |   |   +-- scripts.py           # <- extracted from GVB viral-script.md
|   |   |   |   |   +-- pdf.py               # <- GVB scripts/generate-pdf.py
|   |   |   |   +-- analytics/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- collector.py         # <- extracted from GVB viral-analyze.md
|   |   |   |   |   +-- winner_extractor.py  # <- extracted from GVB viral-analyze.md Phase G
|   |   |   |   +-- channels/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- base.py              # Abstract base classes
|   |   |   |   |   +-- registry.py          # Channel registry
|   |   |   |   |   +-- youtube.py           # YouTube channel plugin
|   |   |   |   |   +-- instagram.py         # Instagram channel plugin
|   |   |   |   |   +-- reddit.py            # Reddit channel plugin (new)
|   |   |   |   |   +-- tiktok.py            # TikTok channel plugin (new)
|   |   |   |   |   +-- hackernews.py        # HN channel plugin (new)
|   |   |   |   |   +-- linkedin.py          # LinkedIn channel plugin (new)
|   |   |   |   |   +-- x.py                 # X/Twitter channel plugin (new)
|   |   |   |   +-- skills/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- last30days/          # <- GVB skills/last30days/ (entire directory)
|   |   |   |   |   |   +-- briefing.py     # FROM GVB: skills/last30days/scripts/briefing.py
|   |   |   |   +-- prompts/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- registry.py          # Versioned prompt template system
|   |   |   |   |   +-- templates/
|   |   |   |   |   |   +-- setup_v1.yaml
|   |   |   |   |   |   +-- onboard_v1.yaml
|   |   |   |   |   |   +-- discover_v1.yaml
|   |   |   |   |   |   +-- angle_v1.yaml
|   |   |   |   |   |   +-- script_v1.yaml
|   |   |   |   |   |   +-- analyze_v1.yaml
|   |   |   |   |   |   +-- update_brain_v1.yaml
|   |   |   |   +-- models/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- brain.py             # Pydantic models <- agent-brain.schema.json
|   |   |   |   |   +-- topic.py             # Pydantic models <- topic.schema.json
|   |   |   |   |   +-- angle.py             # Pydantic models <- angle.schema.json
|   |   |   |   |   +-- hook.py              # Pydantic models <- hook.schema.json
|   |   |   |   |   +-- script.py            # Pydantic models <- script.schema.json
|   |   |   |   |   +-- analytics.py         # Pydantic models <- analytics-entry.schema.json
|   |   |   |   |   +-- insight.py           # Pydantic models <- insight.schema.json
|   |   |   |   |   +-- swipe_hook.py        # Pydantic models <- swipe-hook.schema.json
|   |   |   |   |   +-- competitor_reel.py   # Pydantic models <- competitor-reel.schema.json
|   |   |   |   |   +-- workspace.py         # Workspace/tenant config model
|   |   |   +-- tests/
|   |   |       +-- conftest.py
|   |   |       +-- test_scoring.py
|   |   |       +-- test_recon.py
|   |   |       +-- test_brain.py
|   |   |       +-- test_models.py
|   |   |       +-- test_channels.py
|   |
|   +-- api/                                # Layer 2: FastAPI application
|   |   +-- pyproject.toml
|   |   +-- src/
|   |   |   +-- mcl_api/
|   |   |   |   +-- __init__.py
|   |   |   |   +-- main.py                 # FastAPI app factory
|   |   |   |   +-- config.py               # Settings via pydantic-settings
|   |   |   |   +-- dependencies.py         # Dependency injection
|   |   |   |   +-- middleware/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- auth.py             # Supabase JWT verification
|   |   |   |   |   +-- rate_limit.py       # Sliding window rate limiter
|   |   |   |   |   +-- tenant.py           # workspace_id extraction + RLS
|   |   |   |   |   +-- logging.py          # Request/response logging
|   |   |   |   +-- routes/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- auth.py             # /api/v1/auth/*
|   |   |   |   |   +-- workspaces.py       # /api/v1/workspaces/*
|   |   |   |   |   +-- brain.py            # /api/v1/workspaces/{id}/brain/*
|   |   |   |   |   +-- topics.py           # /api/v1/workspaces/{id}/topics/*
|   |   |   |   |   +-- angles.py           # /api/v1/workspaces/{id}/angles/*
|   |   |   |   |   +-- hooks.py            # /api/v1/workspaces/{id}/hooks/*
|   |   |   |   |   +-- scripts.py          # /api/v1/workspaces/{id}/scripts/*
|   |   |   |   |   +-- analytics.py        # /api/v1/workspaces/{id}/analytics/*
|   |   |   |   |   +-- recon.py            # /api/v1/workspaces/{id}/recon/*
|   |   |   |   |   +-- discover.py         # /api/v1/workspaces/{id}/discover/*
|   |   |   |   |   +-- jobs.py             # /api/v1/workspaces/{id}/jobs/*
|   |   |   |   |   +-- exports.py          # /api/v1/workspaces/{id}/exports/*
|   |   |   |   |   +-- channels.py         # /api/v1/workspaces/{id}/channels/*
|   |   |   |   |   +-- prompts.py          # /api/v1/prompts/*
|   |   |   |   +-- websocket/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- hub.py              # WebSocket connection manager
|   |   |   |   |   +-- pipeline.py         # /ws/pipeline/{job_id}
|   |   |   |   |   +-- chat.py             # /ws/chat (AI streaming)
|   |   |   |   +-- workers/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- settings.py         # ARQ worker settings
|   |   |   |   |   +-- recon.py            # Recon pipeline jobs
|   |   |   |   |   +-- discover.py         # Discovery pipeline jobs
|   |   |   |   |   +-- content.py          # Angle/hook/script generation jobs
|   |   |   |   |   +-- analytics.py        # Analytics collection jobs
|   |   |   |   |   +-- brain.py            # Brain update jobs
|   |   |   |   |   +-- exports.py          # PDF/export generation jobs
|   |   |   |   +-- services/
|   |   |   |   |   +-- __init__.py
|   |   |   |   |   +-- supabase.py         # Supabase client wrapper
|   |   |   |   |   +-- storage.py          # File storage service
|   |   |   |   |   +-- email.py            # Resend email service
|   |   |   +-- tests/
|   |   |       +-- conftest.py
|   |   |       +-- test_routes.py
|   |   |       +-- test_auth.py
|   |   |       +-- test_workers.py
|   |   +-- alembic/                        # DB migrations (if not using Supabase migrations)
|   |
|   +-- web/                                # Layer 3a: Vite + React + TypeScript
|   |   +-- package.json
|   |   +-- tsconfig.json
|   |   +-- vite.config.ts
|   |   +-- tailwind.config.ts
|   |   +-- src/
|   |   |   +-- main.tsx
|   |   |   +-- App.tsx
|   |   |   +-- api/
|   |   |   |   +-- client.ts              # Generated from OpenAPI spec
|   |   |   |   +-- hooks.ts               # TanStack Query wrappers
|   |   |   +-- pages/
|   |   |   |   +-- Dashboard.tsx
|   |   |   |   +-- Login.tsx
|   |   |   |   +-- Onboard.tsx
|   |   |   |   +-- Discover.tsx          # Two tabs: "Discover Topics" + "Competitor Intel"
|   |   |   |   +-- Topics.tsx
|   |   |   |   +-- Angles.tsx
|   |   |   |   +-- Hooks.tsx
|   |   |   |   +-- Scripts.tsx
|   |   |   |   +-- Analytics.tsx
|   |   |   |   +-- Brain.tsx
|   |   |   |   +-- Settings.tsx
|   |   |   +-- components/
|   |   |   |   +-- layout/
|   |   |   |   |   +-- Sidebar.tsx
|   |   |   |   |   +-- Header.tsx
|   |   |   |   |   +-- PageShell.tsx
|   |   |   |   +-- pipeline/
|   |   |   |   |   +-- TopicCard.tsx
|   |   |   |   |   +-- AngleCard.tsx
|   |   |   |   |   +-- HookCard.tsx
|   |   |   |   |   +-- ScriptViewer.tsx
|   |   |   |   |   +-- PipelineFlow.tsx    # Visual pipeline status
|   |   |   |   +-- recon/
|   |   |   |   |   +-- CompetitorList.tsx
|   |   |   |   |   +-- ReconJobStatus.tsx
|   |   |   |   |   +-- SkeletonViewer.tsx
|   |   |   |   +-- analytics/
|   |   |   |   |   +-- PerformanceChart.tsx
|   |   |   |   |   +-- WinnerBadge.tsx
|   |   |   |   |   +-- InsightPanel.tsx
|   |   |   |   +-- brain/
|   |   |   |   |   +-- BrainViewer.tsx
|   |   |   |   |   +-- WeightSliders.tsx      # Advanced settings (not main dashboard), manual override with "Reset to AI-recommended"
|   |   |   |   |   +-- EvolutionLog.tsx
|   |   |   |   +-- chat/
|   |   |   |   |   +-- ChatPanel.tsx       # AI coaching chat
|   |   |   |   |   +-- MessageBubble.tsx
|   |   |   |   +-- ui/                     # shadcn/ui components
|   |   |   +-- hooks/
|   |   |   |   +-- useAuth.ts
|   |   |   |   +-- useWorkspace.ts
|   |   |   |   +-- useRealtime.ts
|   |   |   |   +-- usePipeline.ts
|   |   |   +-- lib/
|   |   |   |   +-- supabase.ts             # Supabase client
|   |   |   |   +-- utils.ts
|   |   |   +-- stores/
|   |   |       +-- auth.ts                 # Zustand auth store
|   |   |       +-- workspace.ts
|   |
|   +-- cli/                                # Layer 3b: CLI package
|   |   +-- pyproject.toml
|   |   +-- src/
|   |   |   +-- mcl_cli/
|   |   |   |   +-- __init__.py
|   |   |   |   +-- main.py                 # Typer entry point
|   |   |   |   +-- auth.py                 # API key management
|   |   |   |   +-- config.py               # ~/.mcl/config.toml
|   |   |   |   +-- commands/
|   |   |   |   |   +-- discover.py
|   |   |   |   |   +-- angle.py
|   |   |   |   |   +-- script.py
|   |   |   |   |   +-- analyze.py
|   |   |   |   |   +-- recon.py
|   |   |   |   |   +-- brain.py
|   |   |   |   +-- output.py               # Rich console output formatting
|   |
|   +-- mcp/                                # Layer 3c: MCP Server (future)
|       +-- pyproject.toml
|       +-- src/
|           +-- mcl_mcp/
|               +-- __init__.py
|               +-- server.py               # MCP server entry point
|               +-- tools.py                # MCP tool definitions
|
+-- supabase/                               # Supabase project config
|   +-- config.toml
|   +-- migrations/
|   |   +-- 00001_initial_schema.sql
|   |   +-- 00002_rls_policies.sql
|   |   +-- 00003_seed_data.sql
|   +-- seed.sql
|
+-- docker/
|   +-- Dockerfile.api
|   +-- Dockerfile.worker
|   +-- docker-compose.yml
|   +-- docker-compose.dev.yml
|
+-- docs/
|   +-- specs/
|   |   +-- DESIGN.md                       # This document
|   +-- api/
|       +-- openapi.yaml                    # Generated OpenAPI spec
|
+-- scripts/
|   +-- generate-client.sh                  # OpenAPI -> TypeScript client
|   +-- dev.sh                              # Start all services
|   +-- migrate.sh                          # Run Supabase migrations
|
+-- .github/
|   +-- workflows/
|       +-- ci.yml
|       +-- deploy.yml
|
+-- pyproject.toml                           # Workspace-level (monorepo tooling)
+-- README.md
+-- .env.example
+-- .gitignore
```

---

## 3. Layer 1: Pipeline Package

### 3.1 Package Definition

**Package name:** `mcl-pipeline`
**Install:** `pip install mcl-pipeline` (or editable: `pip install -e packages/pipeline`)
**Minimum Python:** 3.11

```toml
# packages/pipeline/pyproject.toml
[project]
name = "mcl-pipeline"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.5",
    "openai>=1.12",
    "anthropic>=0.18",
    "google-generativeai>=0.4",
    "yt-dlp>=2024.01",
    "instaloader>=4.10",
    "reportlab>=4.0",
    "requests>=2.31",
]

[project.optional-dependencies]
whisper = ["openai-whisper>=20231117"]
dev = ["pytest>=8.0", "pytest-cov", "ruff"]
```

### 3.2 Core Design Principles

1. **No web framework imports.** Pipeline code never imports FastAPI, Flask, or any HTTP library for serving.
2. **No auth awareness.** Functions receive config objects; they never check tokens or workspace IDs.
3. **No direct database access.** In SaaS mode, all persistence goes through a `StorageBackend` protocol. In local/CLI mode, the `LocalStorageBackend` writes to JSON/JSONL files (preserving GVB behavior).
4. **Structured input/output.** All public functions accept Pydantic models or typed dicts and return Pydantic models.
5. **Progress callbacks.** Long-running operations accept `Optional[Callable[[ProgressEvent], None]]` for real-time status updates.
6. **Dependency injection via `PipelineConfig`.** All GVB hardcoded paths (~30 path constants across 14 files) are replaced by a single config object injected at construction time. No module reads `DATA_DIR`, `BRAIN_FILE`, `STATE_FILE`, or any filesystem path from globals.

#### PipelineConfig (Dependency Injection Root)

```python
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


class BrainLoader(Protocol):
    """Loads the agent brain. Implemented by LocalBrainLoader (JSON file)
    or SupabaseBrainLoader (Postgres)."""
    def load(self) -> "AgentBrain": ...
    def save(self, brain: "AgentBrain") -> None: ...


class CacheBackend(Protocol):
    """Transcript/LLM response cache. Implemented by FileCacheBackend
    (GVB compat) or RedisCacheBackend (SaaS)."""
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str, ttl: int | None = None) -> None: ...
    def exists(self, key: str) -> bool: ...


class StorageBackend(Protocol):
    """Data persistence. Implemented by LocalStorageBackend (JSON/JSONL)
    or SupabaseStorageBackend (Postgres)."""
    def save_topics(self, topics: list) -> None: ...
    def load_topics(self, **filters) -> list: ...
    # ... analogous methods for angles, hooks, scripts, analytics, insights


@dataclass
class PipelineConfig:
    """Central configuration injected into all pipeline modules.

    Replaces ~30 hardcoded path constants across 14 GVB files.
    """
    data_dir: Path
    brain_loader: BrainLoader
    cache_backend: CacheBackend
    storage: StorageBackend
    llm_api_keys: dict[str, str] = field(default_factory=dict)
    platform_credentials: dict[str, dict] = field(default_factory=dict)
```

**GVB files requiring PipelineConfig refactor (14 files, ~30 path constants):**

| GVB File | Path Constants to Remove | Injection Target |
|----------|------------------------|-----------------|
| `recon/config.py` | `PIPELINE_DIR`, `DATA_DIR`, `BRAIN_FILE`, `CONFIG_FILE` | `PipelineConfig.data_dir`, `PipelineConfig.brain_loader` |
| `recon/bridge.py` | `TOPICS_JSONL`, `BRAIN_FILE` | `PipelineConfig.storage`, `PipelineConfig.brain_loader` |
| `recon/tracker.py` | `STATE_FILE`, `BRAIN_FILE` | `PipelineConfig.data_dir`, `PipelineConfig.brain_loader` |
| `recon/scraper/youtube.py` | `DATA_DIR`, `CHANNEL_DATA_DIR` | `PipelineConfig.data_dir` |
| `recon/scraper/instagram.py` | `DATA_DIR`, `IG_DATA_DIR` | `PipelineConfig.data_dir` |
| `recon/scraper/downloader.py` | `DATA_DIR`, `TEMP_DIR`, `TRANSCRIPTS_DIR` | `PipelineConfig.data_dir` |
| `recon/skeleton_ripper/pipeline.py` | `BASE_DIR`, `OUTPUT_DIR`, `CACHE_DIR` | `PipelineConfig.data_dir`, `PipelineConfig.cache_backend` |
| `recon/skeleton_ripper/cache.py` | `CACHE_DIR`, `CACHE_FILE` | `PipelineConfig.cache_backend` |
| `recon/storage/models.py` | `DB_PATH` | `PipelineConfig.storage` |
| `recon/storage/database.py` | `DB_PATH`, `SCHEMA_SQL` | `PipelineConfig.storage` |
| `recon/utils/state_manager.py` | `STATE_DIR`, `STATE_FILE` | `PipelineConfig.data_dir` |
| `recon/utils/logger.py` | `LOG_DIR`, `LOG_FILE` | `PipelineConfig.data_dir` |
| `scoring/engine.py` | `BRAIN_FILE` | `PipelineConfig.brain_loader` |
| `scoring/rescore.py` | `TOPICS_FILE`, `BRAIN_FILE` | `PipelineConfig.storage`, `PipelineConfig.brain_loader` |

### 3.3 Models (`mcl_pipeline.models`)

All 9 GVB JSON Schemas become Pydantic v2 models. Each schema file maps 1:1 to a Python module.

#### 3.3.1 Brain Model (`models/brain.py`)

**Source:** `goviralbitch/schemas/agent-brain.schema.json` (13,449 bytes)

```python
"""Pydantic models for agent-brain.schema.json."""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Identity(BaseModel):
    name: str
    brand: str
    niche: str
    tone: list[str]
    differentiator: Optional[str] = None
    social_handles: Optional[dict[str, str]] = None


class ICP(BaseModel):
    """Ideal Customer Profile."""
    segments: list[str]
    pain_points: list[str]
    goals: list[str]
    platforms_they_use: Optional[list[str]] = None
    budget_range: Optional[str] = None


class ContentPillar(BaseModel):
    name: str
    description: str
    keywords: Optional[list[str]] = None


class Competitor(BaseModel):
    name: str
    platform: str
    handle: str
    why_watch: Optional[str] = None


class WeeklySchedule(BaseModel):
    """Typed weekly schedule — preserves GVB schema fields."""
    shorts_per_day: int = 0
    shorts_days: list[str] = Field(default_factory=list)
    longform_per_week: int = 0
    longform_days: list[str] = Field(default_factory=list)


class Cadence(BaseModel):
    weekly_schedule: Optional[WeeklySchedule] = None
    optimal_times: Optional[dict[str, str]] = None


class CTAStrategy(BaseModel):
    """Structured CTA config — preserves GVB schema fields."""
    default_cta: Optional[str] = None
    lead_magnet_url: Optional[str] = None
    community_url: Optional[str] = None
    newsletter_url: Optional[str] = None
    website_url: Optional[str] = None


class Monetization(BaseModel):
    primary_funnel: Optional[str] = None
    channels: Optional[list[str]] = None
    cta_strategy: Optional[CTAStrategy] = None
    client_capture: Optional[str] = None
    secondary_funnels: Optional[list[str]] = None


class LearningWeights(BaseModel):
    icp_relevance: float = 1.0
    timeliness: float = 1.0
    content_gap: float = 1.0
    proof_potential: float = 1.0


class HookPreferences(BaseModel):
    """Hook pattern preferences — preserves all 6 GVB float fields + MCL extensions."""
    # GVB schema fields (float weights for each hook pattern)
    contradiction: float = 0.0
    specificity: float = 0.0
    timeframe_tension: float = 0.0
    pov_as_advice: float = 0.0
    vulnerable_confession: float = 0.0
    pattern_interrupt: float = 0.0
    # MCL extensions
    preferred_patterns: Optional[list[str]] = None
    avoid_patterns: Optional[list[str]] = None
    best_performing: Optional[str] = None


class PerformancePatterns(BaseModel):
    """Performance analytics — preserves GVB fields + adds missing ones."""
    total_content_analyzed: int = 0
    avg_retention_30s: Optional[float] = None
    best_posting_times: Optional[dict[str, str]] = None
    top_performing_topics: Optional[list[str]] = None
    # Fields from GVB schema that were missing
    top_performing_formats: Optional[list[str]] = None
    audience_growth_drivers: Optional[list[str]] = None
    avg_ctr: Optional[float] = None
    view_to_follower_ratio: Optional[float] = None
    avg_saves: Optional[float] = None
    avg_shares: Optional[float] = None


class PacingPerformance(BaseModel):
    """Pacing performance stats."""
    fast_paced: Optional[float] = None
    moderate: Optional[float] = None
    slow: Optional[float] = None


class VisualPatterns(BaseModel):
    """Visual patterns — preserves full GVB nested structure."""
    thumbnail_style: Optional[str] = None
    text_overlay_style: Optional[str] = None
    # Full GVB schema fields
    top_visual_types: Optional[list[str]] = None
    top_pattern_interrupts: Optional[list[str]] = None
    text_overlay_colors: Optional[list[str]] = None
    pacing_performance: Optional[PacingPerformance] = None


class BrainMetadata(BaseModel):
    created_at: Optional[str] = None
    last_updated: Optional[str] = None
    last_analysis: Optional[str] = None
    version: str = "1.0"


class PlatformConfig(BaseModel):
    research: list[str]
    posting: list[str]
    api_keys_configured: Optional[list[str]] = None


class AudienceBlocker(BaseModel):
    """A lie the audience believes that prevents action."""
    lie: str
    destruction: str
    pillar: str


class ContentJobs(BaseModel):
    """Content jobs mapped to funnel stages."""
    build_trust: list[str] = []
    demonstrate_capability: list[str] = []
    drive_action: list[str] = []


class AgentBrain(BaseModel):
    """Central brain for the content pipeline system.

    Maps to: goviralbitch/schemas/agent-brain.schema.json
    Required fields: identity, icp, pillars, platforms, competitors,
    cadence, monetization, learning_weights, hook_preferences,
    performance_patterns, metadata

    Note: PlatformConfig is defined above this class to avoid forward references.
    Alternatively, add `from __future__ import annotations` at module top.
    """
    identity: Identity
    icp: ICP
    pillars: list[ContentPillar]
    platforms: PlatformConfig
    competitors: list[Competitor]
    cadence: Cadence
    monetization: Monetization
    audience_blockers: Optional[list[AudienceBlocker]] = None
    content_jobs: Optional[ContentJobs] = None
    learning_weights: LearningWeights = LearningWeights()
    hook_preferences: HookPreferences = HookPreferences()
    performance_patterns: PerformancePatterns = PerformancePatterns()
    visual_patterns: Optional[VisualPatterns] = None
    metadata: BrainMetadata = BrainMetadata()
```

#### 3.3.2 Topic Model (`models/topic.py`)

**Source:** `goviralbitch/schemas/topic.schema.json` (4,108 bytes)

```python
"""Pydantic models for topic.schema.json."""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class TopicSource(BaseModel):
    platform: Literal[
        "youtube", "instagram", "tiktok", "linkedin",
        "facebook", "reddit", "x", "hackernews", "github", "web"
    ]
    url: str
    author: Optional[str] = None
    engagement_signals: Optional[dict[str, int]] = None


class CCNFit(BaseModel):
    """Core/Casual/New audience fit -- must hit 2 of 3 to be saved."""
    core: bool = False       # Solves a $5K+ problem?
    casual: bool = False     # Interesting to 2+ segments?
    new_audience: bool = False  # Could bring new followers?


class TopicScoring(BaseModel):
    icp_relevance: int = Field(ge=1, le=10)
    timeliness: int = Field(ge=1, le=10)
    content_gap: int = Field(ge=1, le=10)
    proof_potential: int = Field(ge=1, le=10)
    total: int = Field(ge=4, le=40)
    weighted_total: float
    ccn_fit: Optional[CCNFit] = None


class CompetitorCoverage(BaseModel):
    competitor: str
    url: Optional[str] = None
    performance: Optional[str] = None


class Topic(BaseModel):
    """A discovered topic scored against the creator's ICP.

    Maps to: goviralbitch/schemas/topic.schema.json
    """
    id: str
    title: str
    description: Optional[str] = None
    source: TopicSource
    discovered_at: str
    scoring: TopicScoring
    pillars: Optional[list[str]] = None
    competitor_coverage: Optional[list[CompetitorCoverage]] = None
    status: TopicStatus = TopicStatus.NEW
    notes: Optional[str] = None
```

> **Status Enums (Single Source of Truth):** All status values are defined as Python `Enum` classes in `mcl_pipeline/models/enums.py`. DB `CHECK` constraints are **generated** from these enums (see Section 9.5). Pydantic models reference the enum types. This eliminates divergence between code and schema.

```python
# models/enums.py -- Single source of truth for all pipeline status values
from enum import Enum

class TopicStatus(str, Enum):
    NEW = "new"
    DEVELOPING = "developing"
    SCRIPTED = "scripted"
    PUBLISHED = "published"
    ANALYZED = "analyzed"
    PASSED = "passed"

class ScriptStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    FILMING = "filming"
    PUBLISHED = "published"
    ANALYZED = "analyzed"
    ARCHIVED = "archived"
```

#### 3.3.3 Angle Model (`models/angle.py`)

**Source:** `goviralbitch/schemas/angle.schema.json` (3,533 bytes)

```python
"""Pydantic models for angle.schema.json."""
from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel


class Contrast(BaseModel):
    """The Contrast Formula: common belief (A) -> surprising truth (B)."""
    common_belief: str
    surprising_truth: str
    contrast_strength: Literal["mild", "moderate", "strong", "extreme"]


class FunnelDirection(BaseModel):
    cta_type: Optional[Literal[
        "community", "lead_magnet", "newsletter",
        "website", "dm", "booking", "product"
    ]] = None
    cta_copy: Optional[str] = None
    monetization_tie: Optional[str] = None


class CompetitorAngle(BaseModel):
    competitor: str
    their_angle: Optional[str] = None
    differentiation: Optional[str] = None


class Angle(BaseModel):
    """Content angle developed via Contrast Formula.

    Maps to: goviralbitch/schemas/angle.schema.json
    """
    id: str
    topic_id: str
    format: Literal["longform", "shortform", "linkedin"]
    title: Optional[str] = None
    contrast: Contrast
    target_audience: Optional[str] = None
    pain_addressed: Optional[str] = None
    proof_method: Optional[str] = None
    funnel_direction: Optional[FunnelDirection] = None
    competitor_angles: Optional[list[CompetitorAngle]] = None
    content_job: Optional[Literal[
        "build_trust", "demonstrate_capability", "drive_action"
    ]] = None
    blocker_destroyed: Optional[str] = None
    created_at: str
    status: Literal["draft", "approved", "scripted", "archived"] = "draft"
```

#### 3.3.4 Hook Model (`models/hook.py`)

**Source:** `goviralbitch/schemas/hook.schema.json` (3,596 bytes)

```python
"""Pydantic models for hook.schema.json."""
from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field


HOOK_PATTERNS = Literal[
    "contradiction", "specificity", "timeframe_tension",
    "pov_as_advice", "vulnerable_confession", "pattern_interrupt"
]

PLATFORMS = Literal[
    "youtube_longform", "youtube_shorts", "instagram_reels",
    "tiktok", "linkedin"
]


class HookScore(BaseModel):
    contrast_fit: float = Field(ge=0, le=10)       # 40% weight
    pattern_strength: float = Field(ge=0, le=10)    # 35% weight
    platform_fit: float = Field(ge=0, le=10)        # 25% weight
    composite: float = Field(ge=0, le=10)


class HookPerformance(BaseModel):
    views: Optional[int] = None
    retention_30s: Optional[float] = None
    ctr: Optional[float] = None
    measured_at: Optional[str] = None


class Hook(BaseModel):
    """A hook generated by HookGenie using one of 6 proven patterns.

    Composite score = contrast_fit * 0.4 + pattern_strength * 0.35 + platform_fit * 0.25

    Maps to: goviralbitch/schemas/hook.schema.json
    """
    id: str
    angle_id: str
    platform: PLATFORMS
    pattern: HOOK_PATTERNS
    hook_text: str
    visual_cue: Optional[str] = None
    score: HookScore
    cta_pairing: Optional[str] = None
    status: Literal["draft", "approved", "used", "winner", "dud"] = "draft"
    performance: Optional[HookPerformance] = None
    created_at: str
    notes: Optional[str] = None
    source: Literal["original", "swipe"] = "original"
```

#### 3.3.5 Script Model (`models/script.py`)

**Source:** `goviralbitch/schemas/script.schema.json` (9,229 bytes)

```python
"""Pydantic models for script.schema.json."""
from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel


class OpeningHook(BaseModel):
    hook_text: str
    pattern: str
    visual_direction: str


class IntroFramework(BaseModel):
    """3 P's: Proof / Promise / Plan -- for longform content."""
    proof: Optional[str] = None
    promise: Optional[str] = None
    plan: Optional[str] = None


class RetentionHook(BaseModel):
    text: str
    timestamp_target: str   # e.g., "30s", "45s"
    technique: str          # e.g., "preview payoff", "open loop"


class ScriptSection(BaseModel):
    title: str
    talking_points: list[str]
    proof_element: str
    transition: str
    duration_estimate: str


class CTA(BaseModel):
    text: str
    type: Optional[str] = None
    visual_direction: Optional[str] = None


class Outro(BaseModel):
    text: str
    next_video_tease: Optional[str] = None


class ScriptStructure(BaseModel):
    opening_hook: OpeningHook
    intro_framework: Optional[IntroFramework] = None
    retention_hook: RetentionHook
    sections: list[ScriptSection]
    mid_cta: CTA
    closing_cta: CTA
    outro: Outro


class FilmingCard(BaseModel):
    card_number: int
    section: str
    key_line: str
    visual_direction: str
    duration: str
    notes: Optional[str] = None


class Script(BaseModel):
    """Full content script with filming cards.

    Maps to: goviralbitch/schemas/script.schema.json
    """
    id: str
    angle_id: str
    hook_ids: list[str]
    platform: Literal[
        "youtube_longform", "youtube_shorts",
        "instagram_reels", "tiktok", "linkedin"
    ]
    title: str
    script_structure: Optional[ScriptStructure] = None
    filming_cards: Optional[list[FilmingCard]] = None
    estimated_duration: str
    status: ScriptStatus = ScriptStatus.DRAFT  # See enums.py for canonical values
    created_at: str
    notes: Optional[str] = None
```

#### 3.3.6 Analytics Entry Model (`models/analytics.py`)

**Source:** `goviralbitch/schemas/analytics-entry.schema.json` (4,579 bytes)

```python
"""Pydantic models for analytics-entry.schema.json."""
from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Metrics(BaseModel):
    views: Optional[int] = Field(None, ge=0)
    impressions: Optional[int] = Field(None, ge=0)
    ctr: Optional[float] = Field(None, ge=0, le=100)
    retention_30s: Optional[float] = Field(None, ge=0, le=100)
    avg_view_duration: Optional[float] = None
    avg_view_percentage: Optional[float] = Field(None, ge=0, le=100)
    completion_rate: Optional[float] = Field(None, ge=0, le=100)
    likes: Optional[int] = Field(None, ge=0)
    comments: Optional[int] = Field(None, ge=0)
    shares: Optional[int] = Field(None, ge=0)
    saves: Optional[int] = Field(None, ge=0)
    new_subscribers: Optional[int] = None
    reach: Optional[int] = None
    engagement_rate: Optional[float] = None


class ThumbnailAnalysis(BaseModel):
    has_face: Optional[bool] = None
    has_text: Optional[bool] = None
    text_content: Optional[str] = None
    emotion: Optional[Literal[
        "excited", "surprised", "frustrated",
        "serious", "smiling", "other"
    ]] = None
    style: Optional[Literal[
        "clean-minimal", "bold-text", "before-after",
        "screenshot", "face-closeup", "listicle",
        "dramatic", "other"
    ]] = None
    ctr_performance: Optional[Literal[
        "below_average", "average",
        "above_average", "top_performer"
    ]] = None


class AnalyticsEntry(BaseModel):
    """Per-content performance data collected by the analytics pipeline.

    Maps to: goviralbitch/schemas/analytics-entry.schema.json
    """
    id: str
    content_id: str
    platform: Literal[
        "youtube_longform", "youtube_shorts", "instagram_reels",
        "instagram_posts", "tiktok", "linkedin", "facebook"
    ]
    published_at: Optional[str] = None
    analyzed_at: str
    days_since_publish: Optional[int] = Field(None, ge=0)
    metrics: Metrics
    thumbnail: Optional[ThumbnailAnalysis] = None
    hook_pattern_used: Optional[str] = None
    topic_id: Optional[str] = None
    angle_id: Optional[str] = None
    pillar: Optional[str] = None
    is_winner: bool = False
    winner_reason: Optional[str] = None
```

#### 3.3.7 Remaining Models

**Insight** (`models/insight.py`): Maps `insight.schema.json` -- `top_topics[]`, `hook_performance{}` (per-pattern stats), `thumbnail_patterns[]`, `content_format_performance[]`, `best_posting_times[]`, `competitor_insights[]`.

**SwipeHook** (`models/swipe_hook.py`): Maps `swipe-hook.schema.json` -- `id`, `hook_text`, `pattern` (6 HookGenie patterns), `why_it_works`, `competitor`, `platform`, `url`, `engagement{}` (views/likes/comments/engagement_rate), `visual_hook{}`, `topic_keywords[]`, `used_count`, `is_system` (true for curated seed hooks, false for user/recon-generated hooks).

**CompetitorReel** (`models/competitor_reel.py`): Maps `competitor-reel.schema.json` -- `shortcode`, `url`, `video_url`, `views`, `likes`, `comments`, `caption`, `timestamp`, `profile{}`.

### 3.4 Recon Module (`mcl_pipeline.recon`)

This is the largest module, ported directly from GVB's `recon/` directory. The internal structure is preserved to minimize bugs during migration.

#### 3.4.1 Scrapers (`recon/scrapers/`)

**YouTube Scraper** -- `recon/scrapers/youtube.py`
From: `goviralbitch/recon/scraper/youtube.py`

```python
"""YouTube competitor scraper using yt-dlp.

Changes from GVB:
- DATA_DIR removed; all paths passed as arguments
- Functions accept output_dir: Path instead of using global DATA_DIR
- save_channel_data returns the dict instead of writing to disk
"""

from pathlib import Path
from typing import Optional, Callable

def get_channel_videos(
    handle: str,
    max_videos: int = 20,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> list[dict]:
    """Fetch recent video metadata from a YouTube channel via yt-dlp.

    Returns list of dicts: {video_id, url, title, views, likes, duration,
    upload_date, description, channel}. Sorted by views descending.

    GVB origin: recon/scraper/youtube.py::get_channel_videos()
    Changes: identical logic, no global state
    """
    ...

def download_video(
    video_url: str,
    output_path: Path,
    max_retries: int = 3,
) -> bool:
    """Download video audio via yt-dlp for transcription.

    GVB origin: recon/scraper/youtube.py::download_video()
    Changes: output_path is explicit, no global DATA_DIR
    """
    ...

def prepare_channel_data(handle: str, videos: list[dict]) -> dict:
    """Package scraped data into structured dict.

    GVB origin: recon/scraper/youtube.py::save_channel_data()
    Changes: returns dict instead of writing to disk
    """
    ...
```

**Instagram Scraper** -- `recon/scrapers/instagram.py`
From: `goviralbitch/recon/scraper/instagram.py`

```python
"""Instagram scraper via instaloader.

Changes from GVB:
- Session directory passed via constructor, not global DATA_DIR
- InstaClient.__init__ accepts session_dir: Path
"""

from pathlib import Path
from typing import Optional, Callable

class InstaClient:
    """Instaloader-based Instagram client with session persistence.

    GVB origin: recon/scraper/instagram.py::InstaClient
    """

    def __init__(self, session_dir: Path):
        """
        Args:
            session_dir: Directory for session files (.session_{username})
        """
        ...

    def login(self, username: str, password: str) -> bool:
        """Login with session reuse. GVB origin: InstaClient.login()"""
        ...

    def get_competitor_reels(
        self,
        handle: str,
        max_reels: int = 50,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> list[dict]:
        """Fetch reel metadata sorted by views descending.

        Returns: [{shortcode, url, video_url, views, likes, comments,
                   caption, timestamp, profile{full_name, followers, username}}]

        GVB origin: InstaClient.get_competitor_reels()
        """
        ...

    def download_reel(
        self,
        reel: dict,
        output_dir: Path,
    ) -> Optional[Path]:
        """Download a reel's video file.

        GVB origin: InstaClient.download_reel()
        """
        ...
```

**Downloader/Transcriber** -- `recon/scrapers/downloader.py`
From: `goviralbitch/recon/scraper/downloader.py`

```python
"""Video download + transcription. Supports OpenAI Whisper API and local Whisper.

Changes from GVB:
- No global DATA_DIR
- All file paths explicit in function signatures
- WHISPER_AVAILABLE stays as runtime check
"""

from pathlib import Path
from typing import Optional, Callable

WHISPER_AVAILABLE: bool  # Set at import time based on whisper package

def transcribe_video_openai(
    video_path: str,
    api_key: str,
    output_path: Optional[str] = None,
    max_retries: int = 3,
) -> Optional[str]:
    """Transcribe via OpenAI Whisper API.

    GVB origin: recon/scraper/downloader.py::transcribe_video_openai()
    Changes: none to logic, same retry with backoff
    """
    ...

def transcribe_video_local(
    video_path: str,
    model,  # whisper model instance
    output_path: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
    video_index: Optional[int] = None,
    total_videos: Optional[int] = None,
) -> Optional[str]:
    """Transcribe via local Whisper model with heartbeat.

    GVB origin: recon/scraper/downloader.py::transcribe_video_local()
    """
    ...

def load_whisper_model(model_name: str = "small.en"):
    """Load local Whisper model. GVB origin: same function."""
    ...

def download_direct(url: str, output_path: Path) -> bool:
    """Direct HTTP download for video URLs. GVB origin: same function."""
    ...
```

#### 3.4.2 Skeleton Ripper (`recon/skeleton_ripper/`)

**Pipeline** -- `recon/skeleton_ripper/pipeline.py`
From: `goviralbitch/recon/skeleton_ripper/pipeline.py`

```python
"""Main orchestration for Content Skeleton Ripper.

Changes from GVB:
- Output directory injected, not derived from RECON_DATA_DIR
- Config passed explicitly, not loaded from globals
- on_progress callback is the only notification mechanism (no Supabase here)
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Callable
from pathlib import Path


class JobStatus(Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    TRANSCRIBING = "transcribing"
    EXTRACTING = "extracting"
    AGGREGATING = "aggregating"
    SYNTHESIZING = "synthesizing"
    COMPLETE = "complete"
    FAILED = "failed"


@dataclass
class JobProgress:
    status: JobStatus = JobStatus.PENDING
    phase: str = ""
    message: str = ""
    videos_scraped: int = 0
    videos_downloaded: int = 0
    videos_transcribed: int = 0
    transcripts_from_cache: int = 0
    valid_transcripts: int = 0
    skeletons_extracted: int = 0
    total_target: int = 0
    current_creator: str = ""
    current_creator_index: int = 0
    total_creators: int = 0
    reels_fetched: int = 0
    current_video_index: int = 0
    extraction_batch: int = 0
    extraction_total_batches: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    errors: list[str] = field(default_factory=list)


@dataclass
class JobConfig:
    usernames: list[str]
    videos_per_creator: int = 3
    platform: str = "instagram"
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    min_valid_ratio: float = 0.6
    transcribe_provider: str = "openai"
    whisper_model: str = "small.en"
    openai_api_key: Optional[str] = None


@dataclass
class JobResult:
    job_id: str
    success: bool
    config: JobConfig
    progress: JobProgress
    skeletons: list[dict] = field(default_factory=list)
    aggregated: Optional["AggregatedData"] = None
    synthesis: Optional["SynthesisResult"] = None
    report_path: Optional[str] = None
    skeletons_path: Optional[str] = None
    synthesis_path: Optional[str] = None


class SkeletonRipperPipeline:
    """Main pipeline orchestrator.

    GVB origin: recon/skeleton_ripper/pipeline.py::SkeletonRipperPipeline
    Changes: base_dir injected, no global RECON_DATA_DIR, output_dir injected
    """

    def __init__(self, base_dir: Path, output_dir: Optional[Path] = None):
        ...

    def run(
        self,
        config: JobConfig,
        on_progress: Optional[Callable[[JobProgress], None]] = None,
    ) -> JobResult:
        """Execute full pipeline: scrape -> transcribe -> extract -> aggregate -> synthesize.

        Pipeline phases (matching GVB JobStatus enum):
        1. SCRAPING: Fetch videos/reels via platform scraper
        2. TRANSCRIBING: Download + transcribe via Whisper
        3. EXTRACTING: LLM extracts skeletons from transcripts
        4. AGGREGATING: Pure data aggregation (no LLM)
        5. SYNTHESIZING: LLM synthesizes patterns
        """
        ...
```

**Extractor** -- `recon/skeleton_ripper/extractor.py`
From: `goviralbitch/recon/skeleton_ripper/extractor.py`

```python
"""Batched skeleton extraction from transcripts via LLM.

GVB origin: recon/skeleton_ripper/extractor.py
Changes: none to logic (this module is already clean)
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ExtractionResult:
    video_id: str
    success: bool
    skeleton: Optional[dict] = None
    error: Optional[str] = None


@dataclass
class BatchExtractionResult:
    successful: list[dict] = field(default_factory=list)
    failed_video_ids: list[str] = field(default_factory=list)
    total_attempts: int = 0


class BatchedExtractor:
    """Extract content skeletons from transcripts in batches.

    DEFAULT_BATCH_SIZE = 4 (max 5, min 1)
    MAX_RETRIES = 2
    Retry strategy: on parse failure, split batch in half and retry each half.
    """

    def __init__(self, llm_client: "LLMClient", batch_size: int = 4, max_retries: int = 2):
        ...

    def extract_all(
        self,
        transcripts: list[dict],
        on_progress: Optional[callable] = None,
    ) -> BatchExtractionResult:
        """Extract skeletons from all transcripts.

        on_progress(successful_count, total, batch_idx, total_batches)
        """
        ...
```

**Synthesizer** -- `recon/skeleton_ripper/synthesizer.py`
From: `goviralbitch/recon/skeleton_ripper/synthesizer.py`

```python
"""Pattern synthesis from extracted skeletons.

GVB origin: recon/skeleton_ripper/synthesizer.py
Changes: none to logic
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SynthesisResult:
    success: bool
    analysis: str = ""
    templates: list[dict] = field(default_factory=list)
    quick_wins: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    error: Optional[str] = None
    model_used: str = ""
    tokens_used: int = 0
    synthesized_at: str = ""


class PatternSynthesizer:
    """Synthesize content patterns from aggregated skeleton data.

    GVB origin: recon/skeleton_ripper/synthesizer.py::PatternSynthesizer
    """

    def __init__(self, llm_client: "LLMClient", timeout: int = 180):
        ...

    def synthesize(
        self,
        data: "AggregatedData",
        retry_on_failure: bool = True,
    ) -> SynthesisResult:
        """Run LLM synthesis on aggregated data.

        Retry strategy: on failure, retry once with same prompts.
        Parses response into templates, quick_wins, and warnings.
        """
        ...
```

**Aggregator** -- `recon/skeleton_ripper/aggregator.py`
From: `goviralbitch/recon/skeleton_ripper/aggregator.py`

```python
"""Pure data aggregation -- no LLM calls.

GVB origin: recon/skeleton_ripper/aggregator.py
Changes: none (already clean)
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CreatorStats:
    username: str
    platform: str
    video_count: int
    total_views: int
    total_likes: int
    avg_views: float
    avg_likes: float
    avg_hook_word_count: float
    avg_total_word_count: float
    avg_duration_seconds: float
    hook_techniques: dict[str, int] = field(default_factory=dict)
    value_structures: dict[str, int] = field(default_factory=dict)
    cta_types: dict[str, int] = field(default_factory=dict)


@dataclass
class AggregatedData:
    skeletons: list[dict]
    creator_stats: list[CreatorStats]
    total_videos: int
    total_views: int
    valid_skeletons: int
    overall_hook_techniques: dict[str, int] = field(default_factory=dict)
    overall_value_structures: dict[str, int] = field(default_factory=dict)
    overall_cta_types: dict[str, int] = field(default_factory=dict)
    avg_hook_word_count: float = 0.0
    avg_total_word_count: float = 0.0
    avg_duration_seconds: float = 0.0


class SkeletonAggregator:
    def aggregate(self, skeletons: list[dict]) -> AggregatedData:
        """Aggregate skeleton list into stats per creator + overall.

        GVB origin: recon/skeleton_ripper/aggregator.py::SkeletonAggregator.aggregate()
        """
        ...
```

**LLM Client** -- `recon/skeleton_ripper/llm_client.py`
From: `goviralbitch/recon/skeleton_ripper/llm_client.py`

```python
"""Multi-provider LLM client. Supports: openai, anthropic, google, local (ollama).

GVB origin: recon/skeleton_ripper/llm_client.py
Changes:
- API keys passed via constructor, not read from env
- ProviderConfig unchanged
"""

from dataclasses import dataclass


@dataclass
class ModelInfo:
    id: str
    name: str
    cost_tier: str


@dataclass
class ProviderConfig:
    id: str
    name: str
    api_key_env: str   # Kept for backward compat, but not used for resolution
    base_url: str
    models: list[ModelInfo]


PROVIDERS: dict[str, ProviderConfig] = {
    "openai": ProviderConfig(
        id="openai", name="OpenAI", api_key_env="OPENAI_API_KEY",
        base_url="https://api.openai.com/v1",
        models=[
            ModelInfo("gpt-4o-mini", "GPT-4o Mini", "low"),
            ModelInfo("gpt-4o", "GPT-4o", "medium"),
        ],
    ),
    "anthropic": ProviderConfig(
        id="anthropic", name="Anthropic", api_key_env="ANTHROPIC_API_KEY",
        base_url="https://api.anthropic.com/v1",
        models=[
            # Model IDs are configurable defaults, not hardcoded.
            # Update via plans.features.default_model, workspace.ai_config.model,
            # or MCL_DEFAULT_ANTHROPIC_MODEL env var.
            ModelInfo("claude-haiku-4-5", "Claude Haiku 4.5", "low"),
            ModelInfo("claude-sonnet-4-6", "Claude Sonnet 4.6", "medium"),
        ],
    ),
    "google": ProviderConfig(
        id="google", name="Google", api_key_env="GOOGLE_API_KEY",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        models=[
            ModelInfo("gemini-2.0-flash", "Gemini 2.0 Flash", "low"),
            ModelInfo("gemini-2.5-pro", "Gemini 2.5 Pro", "medium"),
        ],
    ),
    "local": ProviderConfig(
        id="local", name="Local (Ollama)", api_key_env="",
        base_url="http://localhost:11434/api",
        models=[
            ModelInfo("qwen3", "Qwen 3", "free"),
            ModelInfo("llama3", "Llama 3", "free"),
            ModelInfo("mistral", "Mistral", "free"),
        ],
    ),
}


class LLMClient:
    """Multi-provider LLM client.

    GVB origin: recon/skeleton_ripper/llm_client.py::LLMClient
    Changes: api_key passed to constructor instead of reading env
    """
    DEFAULT_MAX_RETRIES = 3
    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

    def __init__(
        self,
        provider: str,
        model: str,
        api_key: Optional[str] = None,
        timeout: int = 120,
        max_retries: int = 3,
    ):
        ...

    def chat(
        self,
        system_prompt: Optional[str],
        user_prompt: str,
        temperature: float = 0.7,
    ) -> str:
        """Send chat completion. Routes to correct provider API.

        Retry logic: exponential backoff on 429/5xx, up to max_retries.
        """
        ...

    def complete(self, prompt: str, temperature: float = 0.7) -> str:
        """Simple completion (wraps chat). GVB origin: LLMClient.complete()"""
        ...
```

**Prompts** -- `recon/skeleton_ripper/prompts.py`
From: `goviralbitch/recon/skeleton_ripper/prompts.py`

```python
"""Prompt templates for skeleton extraction and synthesis.

GVB origin: recon/skeleton_ripper/prompts.py
Changes: none (prompts are string constants)

Key constants:
- SKELETON_EXTRACT_BATCH_PROMPT: Main extraction prompt
- SKELETON_SYNTHESIS_SYSTEM_PROMPT: System prompt for synthesis
- SKELETON_SYNTHESIS_USER_PROMPT: User prompt template for synthesis

Key functions:
- get_extraction_prompt(transcripts: list[dict]) -> str
- validate_skeleton(skeleton: dict) -> bool
- get_synthesis_prompts(skeletons: list[dict]) -> tuple[str, str]
- format_batch_transcripts(transcripts: list[dict]) -> str
"""
```

**Cache** -- `recon/skeleton_ripper/cache.py`
From: `goviralbitch/recon/skeleton_ripper/cache.py`

```python
"""Transcript caching to avoid redundant transcription.

GVB origin: recon/skeleton_ripper/cache.py
Changes: cache_dir injected via constructor instead of RECON_DATA_DIR
"""

from pathlib import Path
from typing import Optional


class TranscriptCache:
    """File-based transcript cache.

    Cache key: video_id
    Cache file: {cache_dir}/transcripts/{video_id}.txt

    GVB origin: recon/skeleton_ripper/cache.py::TranscriptCache
    """

    def __init__(self, cache_dir: Path):
        ...

    def get(self, video_id: str) -> Optional[str]:
        ...

    def put(self, video_id: str, transcript: str) -> None:
        ...

    def has(self, video_id: str) -> bool:
        ...


def is_valid_transcript(text: str, min_length: int = 50) -> bool:
    """Check if transcript meets minimum quality threshold."""
    ...
```

**Bridge** -- `recon/bridge.py`
From: `goviralbitch/recon/bridge.py`

```python
"""Convert skeleton ripper output to scored topics.

GVB origin: recon/bridge.py
Changes:
- Brain data passed as argument instead of loaded from BRAIN_FILE
- Returns Topic pydantic models instead of raw dicts
- No file I/O (caller handles persistence)
"""

from mcl_pipeline.models.topic import Topic, TopicScoring, TopicSource
from mcl_pipeline.models.brain import AgentBrain


def generate_topics_from_skeletons(
    skeletons: list[dict],
    brain: AgentBrain,
    start_index: int = 1,
) -> list[Topic]:
    """Convert skeletons into scored Topics.

    GVB origin: recon/bridge.py::generate_topics_from_skeletons()
    Changes: brain passed in, returns Pydantic Topic list
    """
    ...


def skeleton_to_topic(
    skeleton: dict,
    topic_index: int,
    date_str: str,
    pillars: list[str],
    weights: dict[str, float],
) -> Topic:
    """Convert single skeleton to scored Topic.

    Scoring logic from GVB:
    - High proof potential for views >10K
    - ICP relevance via keyword matching against brain
    - Content gap base score 6, +2 for pillar keyword match
    - Competitor bonuses: >100K views -> content_gap +2, proof_potential +1

    GVB origin: recon/bridge.py::skeleton_to_topic()
    """
    ...
```

**Config** -- `recon/config.py`
From: `goviralbitch/recon/config.py`

```python
"""Recon configuration -- refactored for dependency injection.

GVB origin: recon/config.py
Changes:
- No global PIPELINE_DIR, DATA_DIR, BRAIN_FILE constants
- Competitor dataclass preserved
- ReconConfig dataclass preserved
- load_config() replaced by from_brain() classmethod on ReconConfig
- load_competitors() replaced by Competitor.from_brain_data()
- Credentials loaded from workspace config, not .env files
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Competitor:
    name: str
    platform: str
    handle: str
    why_watch: str

    @classmethod
    def from_brain_data(cls, brain_competitors: list[dict]) -> list["Competitor"]:
        """Convert brain competitor dicts to Competitor dataclasses."""
        ...


@dataclass
class ReconConfig:
    competitors: list[Competitor]
    ig_username: Optional[str] = None
    ig_password: Optional[str] = None
    openai_api_key: Optional[str] = None
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    transcribe_provider: str = "openai"
    whisper_model: str = "small.en"

    @classmethod
    def from_workspace(cls, workspace_config: dict) -> "ReconConfig":
        """Build ReconConfig from workspace configuration.

        In SaaS mode, workspace_config comes from Postgres.
        In CLI mode, workspace_config comes from local config file.
        """
        ...
```

### 3.5 Scoring Engine (`mcl_pipeline.scoring`)

From: `goviralbitch/scoring/engine.py` and `goviralbitch/scoring/rescore.py`

```python
# scoring/engine.py
"""Topic/content scoring against brain ICP.

GVB origin: goviralbitch/scoring/engine.py
Changes:
- load_brain_context() removed -- brain data passed as argument
- All functions accept brain_context dict or AgentBrain model
- No file I/O
"""

from mcl_pipeline.models.brain import AgentBrain


def score_topic(
    title: str,
    description: str,
    brain: AgentBrain,
    views: int = 0,
    timeliness: int = 6,
    is_competitor: bool = False,
) -> dict:
    """Orchestrator: score a topic against the brain's ICP.

    Returns: {icp_relevance, timeliness, content_gap, proof_potential,
              total, weighted_total}

    GVB origin: scoring/engine.py::score_topic()
    Changes: brain passed in, not loaded from file
    """
    ...


def score_icp_relevance(text: str, brain: AgentBrain) -> int:
    """Score ICP relevance (1-10).

    Keyword matching: segments, pain_points, goals -> ICP keywords
    0 matches: 4, 1-2: 6, 3-5: 7, 6-9: 8, 10+: 9
    Bonus +1 for 2+ pain point matches (capped at 10)

    GVB origin: scoring/engine.py::score_icp_relevance()
    """
    ...


def score_content_gap(text: str, brain: AgentBrain) -> int:
    """Score content gap (1-10). Base 6, +2 for pillar keyword match.

    GVB origin: scoring/engine.py::score_content_gap()
    """
    ...


def score_proof_potential(text: str) -> int:
    """Score proof potential (1-10).

    Action keywords (demo, tutorial, build) -> higher scores
    Opinion keywords (think, believe, feel) -> lower scores

    GVB origin: scoring/engine.py::score_proof_potential()
    """
    ...


def apply_competitor_bonuses(scores: dict, views: int) -> dict:
    """Apply competitor validation bonuses.

    >100K views: content_gap +2, proof_potential +1
    >50K views: content_gap +1
    All capped at 10.

    GVB origin: scoring/engine.py::apply_competitor_bonuses()
    """
    ...


def calculate_weighted_total(scores: dict, weights: dict) -> float:
    """Weighted sum: sum(scores[k] * weights[k]) for each criterion.

    GVB origin: scoring/engine.py::calculate_weighted_total()
    """
    ...
```

```python
# scoring/rescore.py
"""Re-score existing topics with updated brain weights.

GVB origin: goviralbitch/scoring/rescore.py
Changes: topics and brain passed in, not loaded from files
"""

from mcl_pipeline.models.brain import AgentBrain
from mcl_pipeline.models.topic import Topic


def rescore_topics(topics: list[Topic], brain: AgentBrain) -> list[Topic]:
    """Re-score all topics with current brain weights.

    Returns: list of Topics with updated scoring.weighted_total
    """
    ...
```

### 3.6 Brain Engine (`mcl_pipeline.brain`)

New module extracted from GVB command logic.

```python
# brain/engine.py
"""Brain load/save/evolve operations.

Extracted from: goviralbitch/.claude/commands/viral-onboard.md (270 lines)
                goviralbitch/.claude/commands/viral-update-brain.md (462 lines)
"""

from mcl_pipeline.models.brain import AgentBrain


def create_default_brain(name: str, niche: str, platforms: list[str]) -> AgentBrain:
    """Create a minimum viable brain from quick form data.

    Required fields (from onboarding Phase 1 quick form):
    - name, niche, platforms (posting_platforms)

    All other sections populated with sensible defaults:
    - tone: ["professional", "conversational"]
    - icp: generic segment derived from niche
    - pillars: 3 auto-generated from niche keywords
    - cadence: 3 shorts/week, 1 longform/week
    - monetization: {"primary_funnel": "audience_building"}
    - learning_weights: all 1.0
    - hook_preferences: all 0.0

    Users with only Phase 1 onboarding get a fully functional brain.
    Phase 2 (AI coaching chat) enhances specific sections.
    """
    ...


def validate_brain(brain: AgentBrain) -> list[str]:
    """Validate brain completeness. Returns list of missing/incomplete sections."""
    ...


def merge_brain_sections(
    existing: AgentBrain,
    updates: dict,
    allowed_sections: list[str],
) -> AgentBrain:
    """Merge updates into brain, respecting section ownership.

    System-managed (updatable by analyze/update-brain):
    - learning_weights, hook_preferences, performance_patterns, visual_patterns, metadata

    User-managed (only updatable by onboard):
    - identity, icp, pillars, platforms, competitors, cadence, monetization
    """
    ...
```

```python
# brain/evolution.py
"""Brain evolution protocol -- learning from performance data.

Extracted from: goviralbitch/.claude/commands/viral-update-brain.md
Phase B: Analyze and Propose Updates
"""

from mcl_pipeline.models.brain import AgentBrain, LearningWeights
from mcl_pipeline.models.analytics import AnalyticsEntry
from mcl_pipeline.models.insight import Insight


class BrainEvolution:
    """Compute brain weight updates from performance data.

    Learning weight adjustment rules (from viral-update-brain.md):
    - Increase weights for criteria correlating with high performance (+0.1 to +0.3)
    - Decrease weights for criteria correlating with underperformance (-0.1 to -0.2)
    - Minimum weight: 0.5, Maximum weight: 2.0
    """

    def compute_weight_updates(
        self,
        brain: AgentBrain,
        analytics: list[AnalyticsEntry],
    ) -> LearningWeights:
        """Analyze performance data and propose new learning weights."""
        ...

    def compute_hook_preferences(
        self,
        brain: AgentBrain,
        analytics: list[AnalyticsEntry],
    ) -> dict:
        """Analyze hook pattern performance and update preferences."""
        ...

    def compute_performance_patterns(
        self,
        analytics: list[AnalyticsEntry],
    ) -> dict:
        """Extract posting time patterns, topic performance trends."""
        ...
```

### 3.7 Content Generator (`mcl_pipeline.content`)

New module extracted from GVB command prompts.

```python
# content/discover.py
"""Topic discovery pipeline.

Extracted from: goviralbitch/.claude/commands/viral-discover.md (959 lines)
This module handles the NON-AI parts of discovery:
- Competitor data loading
- Keyword-based search orchestration
- Topic dedup and ranking
The AI parts (trend analysis, gap identification) stay in prompt templates.
"""

from mcl_pipeline.models.brain import AgentBrain
from mcl_pipeline.models.topic import Topic


def deduplicate_topics(topics: list[Topic], threshold: float = 0.8) -> list[Topic]:
    """Remove near-duplicate topics based on title similarity."""
    ...


def rank_topics(topics: list[Topic], limit: int = 15) -> list[Topic]:
    """Rank by weighted_total, enforce CCN fit (2 of 3 must be true)."""
    ...


def merge_discovery_sources(
    competitor_topics: list[Topic],
    keyword_topics: list[Topic],
    brain: AgentBrain,
) -> list[Topic]:
    """Merge topics from competitor recon and keyword search.

    Dedup across sources, re-rank combined list.
    """
    ...
```

```python
# content/hooks.py
"""HookGenie -- 6-pattern hook generator.

Extracted from: goviralbitch/.claude/commands/viral-script.md (1247 lines)
The 6 patterns:
1. contradiction    -- "Everyone says X. Here's why that's wrong."
2. specificity      -- "I made $47,382 in 30 days doing X."
3. timeframe_tension -- "I rebuilt my entire X in 48 hours."
4. pov_as_advice    -- "Stop doing X. Do Y instead."
5. vulnerable_confession -- "I lost everything because I X."
6. pattern_interrupt -- "This is the X nobody talks about."

This module provides the scoring logic. Actual hook text generation
is done by AI using prompt templates.
"""

from mcl_pipeline.models.hook import Hook, HookScore
from mcl_pipeline.models.angle import Angle


def score_hook(
    hook_text: str,
    angle: Angle,
    pattern: str,
    platform: str,
) -> HookScore:
    """Score a hook using composite formula.

    composite = contrast_fit * 0.4 + pattern_strength * 0.35 + platform_fit * 0.25

    GVB origin: viral-script.md HookGenie scoring rules
    """
    ...


def rank_hooks(hooks: list[Hook], top_n: int = 3) -> list[Hook]:
    """Rank hooks by composite score, return top N."""
    ...
```

```python
# content/pdf.py
"""PDF generation from scripts using reportlab.

GVB origin: goviralbitch/scripts/generate-pdf.py
Changes:
- build_pdf accepts Script and AgentBrain pydantic models
- Returns bytes instead of writing to disk
"""

from mcl_pipeline.models.script import Script
from mcl_pipeline.models.brain import AgentBrain


def generate_pdf(script: Script, brain: AgentBrain) -> bytes:
    """Generate PDF lead magnet from a script.

    GVB origin: scripts/generate-pdf.py::build_pdf()
    Changes: returns bytes, caller handles storage
    """
    ...
```

### 3.8 Analytics Module (`mcl_pipeline.analytics`)

```python
# analytics/collector.py
"""Analytics data collection orchestrator.

Extracted from: goviralbitch/.claude/commands/viral-analyze.md (1613 lines)
Handles Phases A-F of the analyze command.
"""

from mcl_pipeline.models.brain import AgentBrain
from mcl_pipeline.models.analytics import AnalyticsEntry


class AnalyticsCollector:
    """Collect analytics from connected platforms.

    Supports: YouTube Analytics API, Instagram Graph API, instaloader fallback

    Enterprise-grade resilience:
    - Credentials loaded from Supabase Vault via service role (in-memory only, never written to disk)
    - Auto token refresh with 3 retries; on exhaustion, marks connection as expired and notifies user
    - Per-video resilience: one video failure does not abort the batch (errors collected, rest continues)
    - Platform rate limit respect: honors Retry-After headers, exponential backoff (1s, 2s, 4s)
    - Staleness detection: if last analytics fetch >7 days old, auto-triggers a refresh
    """

    def __init__(self, supabase_client, workspace_id: str):
        self.supabase = supabase_client
        self.workspace_id = workspace_id

    def _load_credentials(self, channel: str) -> dict:
        """Load credentials from Supabase Vault.

        Credentials exist in-memory only for the duration of the collection.
        Never written to disk, logs, or error reports.
        """
        row = self.supabase.table("channel_credentials").select(
            "credentials"
        ).eq("workspace_id", self.workspace_id).eq("channel", channel).single().execute()
        return row.data["credentials"]  # Decrypted by Vault at query time

    async def _refresh_token(self, channel: str, credentials: dict, max_retries: int = 3) -> dict:
        """Auto-refresh expired OAuth tokens.

        Retries up to 3 times with exponential backoff.
        On failure, marks the connection as expired and enqueues a user notification.
        """
        for attempt in range(max_retries):
            try:
                new_creds = await self._do_token_refresh(channel, credentials)
                # Update stored credentials
                await self.supabase.table("channel_credentials").update({
                    "credentials": new_creds,
                }).eq("workspace_id", self.workspace_id).eq("channel", channel).execute()
                return new_creds
            except TokenRefreshError:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (2 ** attempt))
        # All retries exhausted -- mark connection expired
        await self.supabase.table("channel_credentials").update({
            "is_connected": False,
        }).eq("workspace_id", self.workspace_id).eq("channel", channel).execute()
        await self._notify_user_connection_expired(channel)
        raise ConnectionExpiredError(f"{channel} token refresh failed after {max_retries} retries")

    def collect(
        self,
        brain: AgentBrain,
        platform_credentials: dict,
        content_ids: Optional[list[str]] = None,
    ) -> list[AnalyticsEntry]:
        """Collect analytics for published content.

        GVB origin: viral-analyze.md Phases C-F

        Per-video resilience: each video is collected independently.
        A failure on one video logs the error and continues with the next.
        Platform rate limits are respected via Retry-After headers and backoff.
        """
        entries = []
        errors = []
        for content_id in content_ids or []:
            try:
                entry = self._collect_single(content_id, platform_credentials)
                entries.append(entry)
            except PlatformRateLimitError as e:
                # Respect Retry-After, then resume
                await asyncio.sleep(e.retry_after or (1 * (2 ** len(errors))))
                errors.append({"content_id": content_id, "error": str(e)})
            except Exception as e:
                errors.append({"content_id": content_id, "error": str(e)})
        return entries  # Caller receives partial results + can inspect errors

    def check_staleness(self, last_fetched_at: Optional[str]) -> bool:
        """Returns True if analytics are stale (>7 days since last fetch).

        Used by the dashboard and background scheduler to auto-trigger refreshes.
        """
        if not last_fetched_at:
            return True
        age = datetime.utcnow() - datetime.fromisoformat(last_fetched_at)
        return age.days > 7
```

```python
# analytics/winner_extractor.py
"""Winner extraction from analytics data.

Extracted from: goviralbitch/.claude/commands/viral-analyze.md Phase G
"""

from mcl_pipeline.models.analytics import AnalyticsEntry


class WinnerExtractor:
    """Identify winning content from analytics.

    Winner criteria (from viral-analyze.md):
    - Views > 2x median for platform
    - Retention > platform average
    - Engagement rate > 2x median
    """

    def extract_winners(
        self,
        entries: list[AnalyticsEntry],
    ) -> list[AnalyticsEntry]:
        """Flag entries as winners based on performance thresholds."""
        ...
```

### 3.9 Prompts Module (`mcl_pipeline.prompts`)

GVB's 7 command markdown files (5,799 total lines) become versioned YAML prompt templates.

```python
# prompts/registry.py
"""Versioned prompt template system.

GVB command files -> versioned YAML templates.
Each template is stored as YAML with:
- version string
- system_prompt
- user_prompt_template (with {variable} placeholders)
- required_context (list of model fields needed)
"""

from pathlib import Path
from typing import Optional


class PromptTemplate:
    """A versioned prompt template."""
    name: str
    version: str
    system_prompt: str
    user_prompt_template: str
    required_context: list[str]

    def render(self, context: dict) -> tuple[str, str]:
        """Render system + user prompts with context variables.

        Returns: (system_prompt, user_prompt)
        """
        ...


class PromptRegistry:
    """Registry of all prompt templates with version management.

    Templates directory: mcl_pipeline/prompts/templates/
    """

    def __init__(self, templates_dir: Optional[Path] = None):
        ...

    def get(self, name: str, version: Optional[str] = None) -> PromptTemplate:
        """Get template by name. Latest version if not specified."""
        ...

    def list_versions(self, name: str) -> list[str]:
        """List available versions for a template."""
        ...
```

**GVB Command to Template Mapping:**

| GVB Command File | Lines | Template Name | Notes |
|---|---|---|---|
| `viral-setup.md` | 732 | `setup_v1.yaml` | Platform connection wizard prompts |
| `viral-onboard.md` | 270 | `onboard_v1.yaml` | 7-section brain setup prompts |
| `viral-discover.md` | 959 | `discover_v1.yaml` | Discovery mode selection + scoring prompts |
| `viral-angle.md` | 516 | `angle_v1.yaml` | Contrast Formula development prompts |
| `viral-script.md` | 1,247 | `script_v1.yaml` | HookGenie 6-pattern + script structure prompts |
| `viral-analyze.md` | 1,613 | `analyze_v1.yaml` | Analytics collection + winner extraction prompts |
| `viral-update-brain.md` | 462 | `update_brain_v1.yaml` | Brain evolution protocol prompts |

### 3.10 Skills Module (`mcl_pipeline.skills`)

From: `goviralbitch/skills/last30days/` (entire directory, ~9,050 lines)

This is copied wholesale. The directory structure:

```
skills/
+-- last30days/
    +-- scripts/
    |   +-- last30days.py         # Main entry: research topic across Reddit/X/YouTube/web
    |   +-- briefing.py           # Output formatting for research briefings
    |   +-- store.py              # SQLite persistence
    |   +-- watchlist.py          # Watchlist management
    |   +-- lib/
    |       +-- models.py         # Model auto-selection (OpenAI, xAI)
    |       +-- parallel_search.py # Concurrent source fetching
    |       +-- render.py         # Output formatting
    |       +-- ui.py             # Terminal UI helpers
    |       +-- dedupe.py         # Deduplication
    |       +-- normalize.py      # Text normalization
    |       +-- bird_x.py         # X/Twitter search via xAI
    |       +-- brave_search.py   # Web search via Brave
    |       +-- openai_reddit.py  # Reddit search via OpenAI
    |       +-- cache.py          # Result caching
    |       +-- entity_extract.py # Entity extraction
    |       +-- websearch.py      # Web search abstraction
    +-- tests/                    # Existing test suite
    +-- agents/
        +-- openai.yaml           # OpenAI agent configuration
```

**Change for MCL:** Wrap as importable module with `__init__.py` that exposes:
```python
def research_topic(
    topic: str,
    sources: str = "auto",  # auto|reddit|x|both
    depth: str = "normal",  # quick|normal|deep
    openai_api_key: Optional[str] = None,
    xai_api_key: Optional[str] = None,
) -> dict:
    """Run last30days research pipeline. Returns structured findings."""
    ...
```

### 3.11 Storage Backend Protocol

```python
# mcl_pipeline/storage.py
"""Storage backend protocol -- decouples pipeline from persistence layer."""

from typing import Protocol, Optional
from mcl_pipeline.models.brain import AgentBrain
from mcl_pipeline.models.topic import Topic


class StorageBackend(Protocol):
    """Protocol for pipeline data persistence.

    Implementations:
    - LocalStorageBackend: JSON/JSONL files (for CLI mode, preserves GVB behavior)
    - SupabaseStorageBackend: Postgres via Supabase client (for SaaS mode)
    """

    def load_brain(self, workspace_id: str) -> Optional[AgentBrain]:
        ...

    def save_brain(self, workspace_id: str, brain: AgentBrain) -> None:
        ...

    def save_topics(self, workspace_id: str, topics: list[Topic]) -> None:
        ...

    def load_topics(
        self, workspace_id: str,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> list[Topic]:
        ...

    def save_file(self, workspace_id: str, path: str, content: bytes) -> str:
        """Save file and return URL/path."""
        ...

    # ... similar methods for angles, hooks, scripts, analytics, insights
```

---

## 4. Layer 2: API

### 4.1 Application Factory

```python
# packages/api/src/mcl_api/main.py
"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mcl_api.config import Settings
from mcl_api.middleware.auth import AuthMiddleware
from mcl_api.middleware.rate_limit import RateLimitMiddleware
from mcl_api.middleware.tenant import TenantMiddleware
from mcl_api.middleware.logging import LoggingMiddleware
from mcl_api.routes import (
    auth, workspaces, brain, topics, angles, hooks,
    scripts, analytics, recon, discover, jobs, exports,
    channels, prompts, admin,
)
from mcl_api.websocket import hub


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    app = FastAPI(
        title="Microcelebrity Labs API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # Middleware (order matters -- outermost first)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, redis_url=settings.redis_url)
    app.add_middleware(TenantMiddleware)
    app.add_middleware(AuthMiddleware, supabase_url=settings.supabase_url,
                       supabase_key=settings.supabase_anon_key)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
    )

    # REST routes
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(workspaces.router, prefix="/api/v1/workspaces", tags=["workspaces"])
    # Workspace-scoped routes (all nested under /api/v1/workspaces/{workspace_id}/...)
    ws_prefix = "/api/v1/workspaces/{workspace_id}"
    app.include_router(brain.router, prefix=f"{ws_prefix}/brain", tags=["brain"])
    app.include_router(topics.router, prefix=f"{ws_prefix}/topics", tags=["topics"])
    app.include_router(angles.router, prefix=f"{ws_prefix}/angles", tags=["angles"])
    app.include_router(hooks.router, prefix=f"{ws_prefix}/hooks", tags=["hooks"])
    app.include_router(scripts.router, prefix=f"{ws_prefix}/scripts", tags=["scripts"])
    app.include_router(analytics.router, prefix=f"{ws_prefix}/analytics", tags=["analytics"])
    app.include_router(recon.router, prefix=f"{ws_prefix}/recon", tags=["recon"])
    app.include_router(discover.router, prefix=f"{ws_prefix}/discover", tags=["discover"])
    app.include_router(jobs.router, prefix=f"{ws_prefix}/jobs", tags=["jobs"])
    app.include_router(exports.router, prefix=f"{ws_prefix}/exports", tags=["exports"])
    app.include_router(channels.router, prefix=f"{ws_prefix}/channels", tags=["channels"])
    app.include_router(prompts.router, prefix="/api/v1/prompts", tags=["prompts"])
    app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

    # WebSocket
    app.include_router(hub.router)

    return app
```

### 4.2 Settings

```python
# packages/api/src/mcl_api/config.py
"""API configuration via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # CORS (see Section 18.7 for full CORS policy)
    cors_origins: list[str] = ["https://app.microcelebritylabs.com", "http://localhost:5173"]

    # Rate limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000

    # External APIs (workspace-level overrides take precedence)
    default_openai_api_key: str = ""
    default_anthropic_api_key: str = ""

    # Sentry
    sentry_dsn: str = ""

    # PostHog
    posthog_api_key: str = ""
    posthog_host: str = "https://app.posthog.com"

    # Resend
    resend_api_key: str = ""

    model_config = {"env_prefix": "MCL_", "env_file": ".env"}
```

### 4.3 REST API Endpoints

#### 4.3.1 Auth Routes (`routes/auth.py`)

```
POST   /api/v1/auth/signup          # Supabase signup (email + password)
POST   /api/v1/auth/login           # Supabase login -> JWT
POST   /api/v1/auth/logout          # Invalidate session
POST   /api/v1/auth/refresh         # Refresh JWT
POST   /api/v1/auth/api-key         # Generate API key for CLI
DELETE /api/v1/auth/api-key/{id}    # Revoke API key
GET    /api/v1/auth/me              # Current user profile
```

#### 4.3.2 Workspace Routes (`routes/workspaces.py`)

```
POST   /api/v1/workspaces                    # Create workspace (see note below)
GET    /api/v1/workspaces                    # List user's workspaces
GET    /api/v1/workspaces/{id}               # Get workspace details
PATCH  /api/v1/workspaces/{id}               # Update workspace settings
DELETE /api/v1/workspaces/{id}               # Soft delete workspace (owner only, 30-day grace period)
GET    /api/v1/workspaces/{id}/export        # GDPR data export (returns ZIP with all workspace data)
POST   /api/v1/workspaces/{id}/members       # Invite member (B2B)
GET    /api/v1/workspaces/{id}/members       # List members
PATCH  /api/v1/workspaces/{id}/members/{uid} # Update member role
DELETE /api/v1/workspaces/{id}/members/{uid} # Remove member
```

**Workspace creation -- owner auto-added to workspace_members:**

After `INSERT INTO workspaces`, the handler must immediately `INSERT INTO workspace_members` with `user_id=owner_id, role='owner', accepted_at=now()`. This is required because RLS policies check `workspace_members` for access. Without this row, the owner cannot read their own workspace.

```python
# In POST /api/v1/workspaces handler:
workspace = supabase.table("workspaces").insert({...}).execute()
supabase.table("workspace_members").insert({
    "workspace_id": workspace.data[0]["id"],
    "user_id": owner_id,
    "role": "owner",
    "accepted_at": "now()",
}).execute()
```

#### 4.3.2a Account Routes (`routes/account.py`)

```
POST   /api/v1/account/delete               # Delete user account + all owned workspaces
```

#### 4.3.2b GDPR: Workspace Data Export

`GET /api/v1/workspaces/{id}/export` returns a ZIP archive containing the complete workspace data:
- `brain.json` -- Full agent brain JSON
- `topics.json` -- All topics
- `angles.json` -- All angles
- `hooks.json` -- All hooks (generated + swipe)
- `scripts.json` -- All scripts
- `analytics.json` -- All analytics entries
- `insights.json` -- Aggregated insights
- `pdfs/` -- All generated PDFs from Supabase Storage
- `metadata.json` -- Export timestamp, workspace info, schema version

#### 4.3.2c GDPR: Workspace Deletion

`DELETE /api/v1/workspaces/{id}` performs a soft delete with a 30-day grace period:
1. Sets `deleted_at` timestamp on the workspace record
2. Workspace becomes inaccessible via API/UI immediately
3. Owner receives email confirmation with a "cancel deletion" link (valid for 30 days)

After 30 days, a nightly purge job performs a hard delete cascade in FK-safe order:
```
analytics_entries → scripts → hooks → angles → topics → insights → swipe_hooks
→ competitor_reels → brain_audit_log → brains → jobs → job_events → dead_letter_jobs
→ channel_credentials → api_quota_usage → api_keys → workspace_members → workspace
+ Supabase Storage cleanup (pdfs, exports, videos buckets for this workspace)
```

`POST /api/v1/account/delete` deletes the user account and all owned workspaces:
1. Soft-deletes all workspaces owned by the user (triggers the same 30-day cascade)
2. Removes the user from all workspaces where they are a member (not owner)
3. Deletes the `auth.users` record after the grace period

A nightly ARQ cron job `purge_deleted_workspaces` handles the hard purge:
```python
async def purge_deleted_workspaces(ctx: dict):
    """Cron job: hard delete workspaces past the 30-day grace period."""
    supabase = ctx["supabase"]
    expired = supabase.table("workspaces") \
        .select("id") \
        .not_.is_("deleted_at", "null") \
        .lt("deleted_at", "now() - interval '30 days'") \
        .execute()
    for ws in expired.data or []:
        # CASCADE handles FK cleanup; then clean Supabase Storage
        supabase.table("workspaces").delete().eq("id", ws["id"]).execute()
        for bucket in ["pdfs", "exports", "videos"]:
            supabase.storage.from_(bucket).remove_folder(ws["id"])
```

#### 4.3.3 Brain Routes (`routes/brain.py`)

```python
router = APIRouter()

@router.get("/")
async def get_brain(workspace: Workspace = Depends(get_workspace)) -> AgentBrain:
    """Get current agent brain for workspace."""
    ...

@router.put("/")
async def update_brain(
    brain: AgentBrain,
    workspace: Workspace = Depends(get_workspace),
) -> AgentBrain:
    """Full brain replacement (onboard)."""
    ...

@router.patch("/sections/{section}")
async def update_brain_section(
    section: str,  # identity | icp | pillars | platforms | competitors | cadence | monetization | audience_blockers | content_jobs
    data: dict,
    workspace: Workspace = Depends(get_workspace),
) -> AgentBrain:
    """Update a specific brain section.

    Allowed section names: identity, icp, pillars, platforms, competitors,
    cadence, monetization, audience_blockers, content_jobs.
    audience_blockers and content_jobs are user-managed sections used
    by angle generation.
    """
    ...

@router.post("/evolve")
async def evolve_brain(
    request: EvolveRequest,
    workspace: Workspace = Depends(get_workspace),
) -> dict:
    """Trigger brain evolution (update-brain command). Returns job_id.

    Dispatches ARQ job: workers.brain.evolve_brain_task
    """
    ...

@router.get("/evolve/preview")
async def preview_brain_evolution(
    workspace: Workspace = Depends(get_workspace),
) -> dict:
    """Dry-run brain evolution. Returns proposed changes as a diff.

    Requires at least 3 analytics entries to produce meaningful evolution.

    Returns:
        {
            "sections": [
                {
                    "name": "hook_preferences",
                    "before": {...},
                    "after": {...},
                    "reason": "Performance data shows contradiction hooks outperform..."
                }
            ],
            "analytics_count": 5,
            "confidence": "high"
        }
    """
    ...

@router.post("/evolve/apply")
async def apply_brain_evolution(
    request: ApplyEvolutionRequest,
    workspace: Workspace = Depends(get_workspace),
) -> dict:
    """Apply brain evolution with section-level approve/reject.

    Requires at least 3 analytics entries to produce meaningful evolution.
    """
    ...
```

**`POST /api/v1/workspaces/{workspace_id}/brain/evolve` -- EvolveRequest:**
```python
class EvolveRequest(BaseModel):
    """Brain evolution request schema."""
    mode: Literal["preview", "apply"] = "preview"
    # preview: compute proposed changes and return diff without applying
    # apply: compute and apply changes immediately (skips approval step)
    sections_to_evolve: list[str] = []
    # Specific brain sections to evolve. Empty = all eligible sections.
    # Eligible: learning_weights, hook_preferences, performance_patterns,
    #           visual_patterns, cadence.optimal_times
    # Protected (never evolved): identity, icp, pillars, platforms,
    #           competitors, cadence (except optimal_times), monetization,
    #           audience_blockers, content_jobs

class ApplyEvolutionRequest(BaseModel):
    """Section-level approve/reject for brain evolution."""
    approved_sections: list[str]    # e.g., ["hook_preferences", "learning_weights"]
    rejected_sections: list[str] = []  # e.g., ["performance_patterns"]

class EvolveResponse(BaseModel):
    job_id: str
    status: str = "pending"
    mode: str                  # "preview" or "apply"
```

#### 4.3.4 Topics Routes (`routes/topics.py`)

```
GET    /api/v1/topics                # List topics (paginated, filterable by status/pillar/score)
GET    /api/v1/topics/{id}           # Get single topic
PATCH  /api/v1/topics/{id}           # Update topic (status, notes)
DELETE /api/v1/topics/{id}           # Delete topic
POST   /api/v1/topics/{id}/develop   # Generate angle from topic -> returns job_id
```

#### 4.3.5 Angles Routes (`routes/angles.py`)

```
GET    /api/v1/angles                # List angles
GET    /api/v1/angles/{id}           # Get single angle
PATCH  /api/v1/angles/{id}           # Update angle (status, contrast edits)
DELETE /api/v1/angles/{id}           # Delete angle
POST   /api/v1/angles/{id}/hooks     # Generate hooks from angle -> returns job_id
```

#### 4.3.6 Hooks Routes (`routes/hooks.py`)

```
GET    /api/v1/hooks                 # List hooks (filterable by pattern, status, score)
GET    /api/v1/hooks/{id}            # Get single hook
PATCH  /api/v1/hooks/{id}            # Update hook (status, performance data)
DELETE /api/v1/hooks/{id}            # Delete hook
POST   /api/v1/hooks/{id}/script     # Generate script from hook -> returns job_id
GET    /api/v1/hooks/swipe-file      # Get swipe file (saved competitor hooks)
POST   /api/v1/hooks/swipe-file      # Add to swipe file
```

#### 4.3.7 Scripts Routes (`routes/scripts.py`)

```
GET    /api/v1/scripts               # List scripts
GET    /api/v1/scripts/{id}          # Get single script
PATCH  /api/v1/scripts/{id}          # Update script (status, edits)
DELETE /api/v1/scripts/{id}          # Delete script
POST   /api/v1/scripts/{id}/pdf      # Generate PDF -> returns job_id
GET    /api/v1/scripts/{id}/pdf      # Download generated PDF
PATCH  /api/v1/scripts/{id}/publish  # Mark as published + schedule analytics
```

**`PATCH /api/v1/scripts/{id}/publish` -- PublishRequest:**
```python
class PublishRequest(BaseModel):
    """Mark a script as published and schedule analytics collection."""
    platform_url: str                    # e.g., "https://youtube.com/watch?v=abc123"
    platform_content_id: Optional[str] = None  # Platform-specific ID (auto-extracted from URL if omitted)
    published_at: Optional[datetime] = None    # Defaults to now()
```

On publish:
1. Script `status` transitions to `published`, `published_url` and `published_at` are set
2. First analytics pull is scheduled at +48 hours (allows metrics to stabilize)
3. Recurring weekly analytics collection is set up for 90 days (13 total pulls)
4. WebSocket notification sent to workspace subscribers

**Dashboard UX:** Script detail page shows an "I Published This" button. Clicking opens a modal where the user pastes the platform URL. On submit, the `PATCH /publish` endpoint is called.

#### 4.3.8 Analytics Routes (`routes/analytics.py`)

```
GET    /api/v1/analytics                   # List analytics entries
GET    /api/v1/analytics/{id}              # Get single entry
POST   /api/v1/analytics/collect           # Trigger analytics collection -> job_id
POST   /api/v1/analytics/collect/manual    # Submit manual analytics data
GET    /api/v1/analytics/insights          # Get aggregated insights
GET    /api/v1/analytics/winners           # Get winner content
POST   /api/v1/analytics/deep-analysis     # Trigger deep analysis -> job_id
```

**`POST /api/v1/analytics/collect` -- AnalyzeRequest:**
```python
class AnalyzeRequest(BaseModel):
    """Analytics collection request schema."""
    content_ids: list[str] = []              # Specific script/content IDs to analyze. Empty = all published.
    platforms: list[str] = []                # Filter by platform. Empty = all connected platforms.
    mode: Literal["auto", "manual"] = "auto"
    # auto: fetch metrics from platform APIs
    # manual: expect manual metric submission via /collect/manual
    date_range: Optional[DateRange] = None   # Analyze content published within this range

class DateRange(BaseModel):
    start: datetime
    end: Optional[datetime] = None           # Defaults to now

class AnalyzeResponse(BaseModel):
    job_id: str
    status: str = "pending"
    content_count: int                       # Number of content items to be analyzed
```

#### 4.3.9 Recon Routes (`routes/recon.py`)

```python
@router.post("/run")
async def run_recon(
    request: ReconRunRequest,
    workspace: Workspace = Depends(get_workspace),
) -> dict:
    """Start a recon pipeline job.

    Request body:
    {
        "usernames": ["@creator1", "@creator2"],
        "platform": "instagram" | "youtube",
        "videos_per_creator": 3,
        "llm_provider": "openai",
        "llm_model": "gpt-4o-mini"
    }

    Returns: {"job_id": "sr_abc123", "status": "pending"}

    Dispatches ARQ job: workers.recon.run_recon_pipeline
    """
    ...

@router.get("/jobs")
async def list_recon_jobs(workspace: Workspace = Depends(get_workspace)) -> list[dict]:
    """List recon jobs for workspace."""
    ...

@router.get("/jobs/{job_id}")
async def get_recon_job(job_id: str, workspace: Workspace = Depends(get_workspace)) -> dict:
    """Get recon job status + results."""
    ...

@router.get("/competitors")
async def list_competitors(workspace: Workspace = Depends(get_workspace)) -> list[dict]:
    """List competitors from brain."""
    ...

@router.get("/competitors/{handle}/videos")
async def get_competitor_videos(handle: str, workspace: Workspace = Depends(get_workspace)) -> list[dict]:
    """Get scraped video data for a competitor."""
    ...

@router.get("/skeletons")
async def list_skeletons(workspace: Workspace = Depends(get_workspace)) -> list[dict]:
    """Get extracted content skeletons."""
    ...
```

#### 4.3.10 Discover Routes (`routes/discover.py`)

```
POST   /api/v1/discover               # Unified discovery endpoint -> job_id
POST   /api/v1/discover/competitor     # Run competitor-based discovery -> job_id (legacy)
POST   /api/v1/discover/keyword        # Run keyword-based discovery -> job_id (legacy)
POST   /api/v1/discover/research       # Run last30days research -> job_id
GET    /api/v1/discover/sessions       # List discovery sessions
GET    /api/v1/discover/sessions/{id}  # Get session results
```

**`POST /api/v1/discover` -- DiscoverRequest:**
```python
class DiscoverRequest(BaseModel):
    """Unified discovery request schema."""
    mode: Literal["competitors", "keywords", "both"] = "both"

    # Competitor discovery
    competitor_handles: list[str] = []       # e.g., ["@creator1", "@creator2"]
    platforms: list[str] = ["youtube"]       # Platforms to scrape
    videos_per_competitor: int = Field(default=3, ge=1, le=10)

    # Keyword discovery
    keywords: list[str] = []                 # Override pillar keywords for this run
    keyword_sources: list[str] = ["youtube"] # youtube, reddit, google_trends

    # Depth control
    depth: Literal["quick", "standard", "deep"] = "standard"
    # quick: top 5 results per source, no scoring breakdown
    # standard: top 20 results, full scoring
    # deep: top 50 results, competitor cross-reference, CCN analysis

    # Scheduling
    schedule: Literal["now", "cron"] = "now"
    cron_expression: Optional[str] = None    # e.g., "0 6 * * MON" for weekly Monday 6am

class DiscoverResponse(BaseModel):
    job_id: str
    status: str = "pending"
    estimated_duration_seconds: Optional[int] = None
```

#### 4.3.11 Jobs Routes (`routes/jobs.py`)

```
GET    /api/v1/jobs                   # List all jobs for workspace
GET    /api/v1/jobs/{id}              # Get job status + progress
POST   /api/v1/jobs/{id}/cancel       # Cancel running job
DELETE /api/v1/jobs/{id}              # Delete job record
```

#### 4.3.12 Exports Routes (`routes/exports.py`)

```
POST   /api/v1/exports/pdf           # Generate PDF from script_id
GET    /api/v1/exports/{id}          # Download export file
GET    /api/v1/exports               # List exports for workspace
```

#### 4.3.13 Channels Routes (`routes/channels.py`)

```
GET    /api/v1/channels              # List available channel plugins
GET    /api/v1/channels/{name}       # Get channel config + status
POST   /api/v1/channels/{name}/connect    # Connect platform credentials
DELETE /api/v1/channels/{name}/connect    # Disconnect platform
POST   /api/v1/channels/{name}/test       # Test connection
```

#### 4.3.14 Prompts Routes (`routes/prompts.py`)

```
GET    /api/v1/prompts                    # List prompt templates
GET    /api/v1/prompts/{name}             # Get template (latest version)
GET    /api/v1/prompts/{name}/versions    # List versions
GET    /api/v1/prompts/{name}/{version}   # Get specific version
```

#### 4.3.15 Health Check Route (`routes/health.py`)

```
GET    /health                         # Service health check (no auth required)
```

**Response Schema:**
```python
class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    checks: dict  # {"postgres": bool, "redis": bool}
    version: str  # API version (e.g., "0.1.0")
    timestamp: str  # ISO 8601

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint. Returns 200 if healthy, 503 if degraded."""
    pg_ok = await check_postgres()
    redis_ok = await check_redis()
    all_healthy = pg_ok and redis_ok

    response = HealthResponse(
        status="healthy" if all_healthy else "degraded",
        checks={"postgres": pg_ok, "redis": redis_ok},
        version=settings.app_version,
        timestamp=datetime.utcnow().isoformat(),
    )

    if not all_healthy:
        return JSONResponse(status_code=503, content=response.model_dump())
    return response
```

**Docker HEALTHCHECK directives:**
```dockerfile
# Dockerfile.api
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Dockerfile.worker
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD arq mcl_api.workers.settings.WorkerSettings --check || exit 1
```

### 4.4 Middleware

#### Logging Middleware (`middleware/logging.py`)

```python
"""Request ID propagation and structured logging for every API request."""

import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class LoggingMiddleware(BaseHTTPMiddleware):
    """Outermost middleware. Runs first on every request.

    Responsibilities:
    1. Generate a UUID request_id for every API request
    2. Attach to request.state.request_id (available to all downstream code)
    3. Return as X-Request-Id response header
    4. Include in all structured log entries:
       {"request_id": "...", "workspace_id": "...", "user_id": "...",
        "method": "GET", "path": "/api/v1/topics", "status": 200, "duration_ms": 42}
    5. Pass request_id to ARQ job dispatch as a parameter (for worker log correlation)
    6. Sentry events are tagged with request_id for cross-referencing
    7. API error responses include request_id so users can share in support tickets:
       {"error": "discovery_failed", "message": "...", "request_id": "abc-123-def"}
    8. Frontend displays request_id in error toasts:
       "Something went wrong. Reference: abc-123-def"
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Structured log entry (emitted at request completion)
        import structlog
        logger = structlog.get_logger()

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id

        logger.info(
            "http_request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            workspace_id=getattr(request.state, "workspace_id", None),
            user_id=getattr(request.state, "user_id", None),
        )
        return response
```

Workers log the originating request_id passed via job parameters:

```python
# In any ARQ worker
async def run_recon_pipeline(ctx, job_id, workspace_id, config, request_id=None):
    logger = structlog.get_logger().bind(
        request_id=request_id, job_id=job_id, workspace_id=workspace_id
    )
    logger.info("job_started", job_type="recon")
    ...
```

#### Supabase Client Split: Anon Key vs. Service Role Key

MCL uses two separate Supabase keys for different contexts. This split ensures RLS enforcement for user-facing operations while allowing background workers to perform cross-workspace system operations.

| Context | Supabase Key | RLS Enforced | Use Case |
|---------|-------------|-------------|----------|
| API middleware (user-facing) | `SUPABASE_ANON_KEY` + user's JWT from `Authorization` header | Yes | All REST endpoints. The anon key opens a Supabase client, and the user's JWT is passed to enforce RLS policies. Each request operates within the user's workspace permissions. |
| Background workers (ARQ jobs) | `SUPABASE_SERVICE_ROLE_KEY` | No (bypasses RLS) | System operations that span workspaces: scheduled analytics collection, brain evolution, nightly purge jobs, seed data operations. |

**Rules:**
- The service role key is **never** exposed to client-facing code (API routes, WebSocket handlers).
- API middleware creates the Supabase client with the anon key and attaches the user's JWT from the `Authorization` header.
- Workers create the Supabase client with the service role key (loaded from `settings.supabase_service_role_key`).
- Both keys are configured as separate environment variables: `MCL_SUPABASE_ANON_KEY` and `MCL_SUPABASE_SERVICE_ROLE_KEY`.

```python
# API middleware: anon key + user JWT (RLS enforced)
from supabase import create_client

def get_user_supabase(request: Request) -> Client:
    """Create a Supabase client scoped to the authenticated user."""
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    client.auth.set_session(token)  # RLS policies apply
    return client

# Worker: service role key (bypasses RLS)
def get_worker_supabase() -> Client:
    """Create a Supabase client with service role for background operations."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
```

#### Auth Middleware (`middleware/auth.py`)

```python
"""Supabase JWT verification middleware."""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    """Verify Supabase JWT on every request except public routes.

    Public routes (no auth):
    - /api/docs, /api/openapi.json
    - /api/v1/auth/signup, /api/v1/auth/login
    - /health

    Auth methods:
    1. Bearer token (JWT from Supabase Auth) -- web dashboard
    2. X-API-Key header -- CLI and programmatic access

    Creates Supabase client using anon key + user's JWT (RLS enforced).
    Never uses service role key -- that is reserved for workers only.

    Extracts user_id and attaches to request.state.user_id
    """

    SKIP_PATHS = {"/api/docs", "/api/openapi.json", "/health",
                  "/api/v1/auth/signup", "/api/v1/auth/login"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Try Bearer token first
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            user = await self._verify_jwt(token)
            request.state.user_id = user["sub"]
            return await call_next(request)

        # Try API key
        api_key = request.headers.get("X-API-Key")
        if api_key:
            user_id = await self._verify_api_key(api_key)
            request.state.user_id = user_id
            return await call_next(request)

        raise HTTPException(status_code=401, detail="Missing authentication")
```

#### Tenant Middleware (`middleware/tenant.py`)

```python
"""Workspace extraction and RLS enforcement."""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class TenantMiddleware(BaseHTTPMiddleware):
    """Extract workspace_id from request and attach to request.state.

    Resolution order:
    1. X-Workspace-Id header (explicit, used by CLI)
    2. Query param ?workspace_id=xxx
    3. User's default workspace (from user profile)

    Sets request.state.workspace_id for all downstream handlers.
    All database queries include WHERE workspace_id = ? via RLS.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip for auth routes
        if request.url.path.startswith("/api/v1/auth"):
            return await call_next(request)

        workspace_id = (
            request.headers.get("X-Workspace-Id")
            or request.query_params.get("workspace_id")
            or await self._get_default_workspace(request.state.user_id)
        )

        if not workspace_id:
            raise HTTPException(status_code=400, detail="No workspace selected")

        # Verify user has access to workspace
        if not await self._user_has_access(request.state.user_id, workspace_id):
            raise HTTPException(status_code=403, detail="No access to workspace")

        request.state.workspace_id = workspace_id
        return await call_next(request)
```

#### Rate Limit Middleware (`middleware/rate_limit.py`)

```python
"""Sliding window rate limiter backed by Redis."""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-workspace sliding window rate limiting.

    Limits:
    - Free tier: 60 req/min, 1000 req/hour
    - Pro tier: 300 req/min, 10000 req/hour
    - Enterprise: custom

    Headers returned:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset

    Implementation: Redis sorted sets with workspace_id as key
    """

    async def dispatch(self, request: Request, call_next):
        ...
```

#### Plan Enforcement Middleware (`middleware/plan_limits.py`)

```python
"""Database-driven plan limit enforcement.

Reads limits from the `plans` table and usage from `workspace_usage`.
Admin changes to plans take effect immediately -- no code deploy needed.
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class PlanLimitMiddleware(BaseHTTPMiddleware):
    """Enforce AI and pipeline limits from the plans table.

    Two enforcement functions, called by route handlers (not middleware):
    - check_ai_limit(workspace_id) -- before any AI call
    - check_pipeline_limit(workspace_id, limit_name) -- before discovery, etc.

    Both read the workspace's plan from DB, compare against workspace_usage,
    and raise HTTP 429 if exceeded.

    429 response format:
    {
        "error": "plan_limit_exceeded",
        "message": "AI call limit reached (20/20 today)",
        "limit_type": "ai_calls_per_day",
        "limit": 20,
        "used": 20,
        "resets_at": "2026-03-25T00:00:00Z",
        "upgrade_url": "/settings/billing",
        "request_id": "abc-123-def"
    }
    """
    ...


async def check_ai_limit(workspace_id: str, db) -> None:
    """Check AI call/token limits. Raises HTTPException(429) if exceeded."""
    plan = await db.table("plans").select("*").eq(
        "name", (await db.table("workspaces").select("plan").eq("id", workspace_id).single()).data["plan"]
    ).single()

    usage = await get_or_create_usage(workspace_id, db)

    if usage["ai_calls_today"] >= plan.data["ai_calls_per_day"]:
        raise HTTPException(status_code=429, detail={
            "error": "plan_limit_exceeded",
            "limit_type": "ai_calls_per_day",
            "limit": plan.data["ai_calls_per_day"],
            "used": usage["ai_calls_today"],
            "resets_at": usage["ai_calls_today_reset_at"],
            "upgrade_url": "/settings/billing",
        })


async def check_pipeline_limit(workspace_id: str, limit_name: str, db) -> None:
    """Check pipeline limits (discover_runs_per_day, max_competitors, etc.).
    Raises HTTPException(429) if exceeded."""
    ...
```

#### Admin API Routes (`routes/admin.py`)

```python
"""Admin-only endpoints for managing plans.

All endpoints require system admin role (not workspace admin).
Changes take effect immediately -- all limits are database-driven.
"""

from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/plans")
async def list_plans(admin=Depends(require_system_admin)):
    """List all plans with their current limits.
    Returns: list of Plan objects, ordered by sort_order.
    """
    ...


@router.patch("/plans/{plan_id}")
async def update_plan(plan_id: str, updates: PlanUpdate, admin=Depends(require_system_admin)):
    """Update plan limits. Changes take effect immediately for all
    workspaces on this plan. No code deploy needed.

    Updatable fields: ai_calls_per_day, ai_tokens_per_month,
    ai_max_tokens_per_call, discover_runs_per_day, max_competitors,
    max_workspaces, max_team_members, platforms_allowed, features,
    price_monthly_cents, price_yearly_cents, stripe_price_id_monthly,
    stripe_price_id_yearly, is_active, sort_order.
    """
    ...


@router.get("/plans/{plan_id}/impact")
async def preview_plan_impact(plan_id: str, admin=Depends(require_system_admin)):
    """Preview how many workspaces/users would be affected by a plan change.
    Returns: {"workspace_count": 42, "user_count": 67, "over_limit_workspaces": [...]}
    """
    ...
```

### 4.5 WebSocket Authentication (Ticket-Based)

WebSocket connections use **short-lived, single-use tickets** instead of JWT-in-query-param (which leaks tokens in server logs and browser history).

#### Ticket Issuance (`POST /ws/ticket`)

```python
"""Issue a single-use WebSocket connection ticket."""

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
import secrets

router = APIRouter()


@router.post("/ws/ticket")
async def create_ws_ticket(
    workspace_id: str,
    user = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Issue a 30-second, single-use ticket for WebSocket connection.

    Flow:
    1. Client calls POST /ws/ticket with valid JWT in Authorization header
    2. Server generates random ticket, stores in Redis with 30s TTL
    3. Client connects to ws://host/ws/pipeline/{job_id}?ticket=xxx
    4. WebSocket handler validates ticket via GETDEL (single-use)
    5. Ticket is consumed on first use -- replay attacks impossible

    Redis key: ws:ticket:{ticket_id} -> JSON {user_id, workspace_id}
    TTL: 30 seconds
    """
    ticket = secrets.token_urlsafe(32)
    await redis.setex(
        f"ws:ticket:{ticket}",
        30,  # 30-second TTL
        json.dumps({
            "user_id": str(user.id),
            "workspace_id": workspace_id,
        }),
    )
    return {"ticket": ticket, "expires_in": 30}
```

#### WebSocket Connection Validation

```python
async def validate_ws_ticket(
    ticket: str,
    job_id: str,
    redis: Redis,
) -> dict:
    """Validate and consume a WebSocket ticket.

    Uses Redis GETDEL for atomic single-use consumption.
    Also verifies:
    - Ticket exists and is not expired
    - Job belongs to the user's workspace
    - Workspace connection limit not exceeded (max 10 per workspace)
    """
    # Atomic get-and-delete (single-use)
    raw = await redis.getdel(f"ws:ticket:{ticket}")
    if not raw:
        raise WebSocketDisconnect(code=4401, reason="Invalid or expired ticket")

    ticket_data = json.loads(raw)
    workspace_id = ticket_data["workspace_id"]

    # Verify job belongs to workspace
    job = await supabase.table("jobs").select("workspace_id").eq("id", job_id).single().execute()
    if not job.data or job.data["workspace_id"] != workspace_id:
        raise WebSocketDisconnect(code=4403, reason="Job not in workspace")

    # Connection limit: max 10 per workspace
    conn_count = await redis.scard(f"ws:conns:{workspace_id}")
    if conn_count >= 10:
        raise WebSocketDisconnect(code=4429, reason="Connection limit exceeded")

    # Track this connection
    conn_id = secrets.token_hex(8)
    await redis.sadd(f"ws:conns:{workspace_id}", conn_id)
    await redis.expire(f"ws:conns:{workspace_id}", 3600)

    return {**ticket_data, "conn_id": conn_id}
```

#### Connection Limits & Heartbeat

| Parameter | Value | Notes |
|---|---|---|
| Max connections per workspace | 10 | Tracked in Redis set `ws:conns:{workspace_id}` |
| Heartbeat interval | 30 seconds | Server sends ping, client must pong within 10s |
| Ticket TTL | 30 seconds | Single-use, GETDEL consumption |
| Stale connection cleanup | On disconnect + 1h TTL on Redis set | Prevents orphan tracking |

On every message push, the server **revalidates workspace access** to handle permission revocations mid-session.

#### Pipeline Status (`websocket/pipeline.py`)

```python
"""Real-time pipeline job status via WebSocket."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/pipeline/{job_id}")
async def pipeline_status(websocket: WebSocket, job_id: str, ticket: str):
    """Stream pipeline job progress to client.

    Auth: Single-use ticket via ?ticket=xxx (see POST /ws/ticket)
    Heartbeat: Server pings every 30s, client must pong within 10s
    Access revalidation: Workspace membership checked on each message push

    Messages sent:
    {
        "type": "progress",
        "data": {
            "status": "transcribing",
            "phase": "Transcribing videos",
            "message": "Transcribing video 3/5 for @creator",
            "videos_transcribed": 3,
            "total_target": 5,
            ...
        }
    }
    {
        "type": "complete",
        "data": { "job_id": "sr_abc123", "success": true }
    }
    {
        "type": "error",
        "data": { "message": "...", "error_code": "PIPELINE-12345-AB12" }
    }

    Implementation: Subscribe to Supabase Realtime channel for job_events table
    """
    ticket_data = await validate_ws_ticket(ticket, job_id, redis)
    await websocket.accept()

    try:
        while True:
            # Heartbeat ping every 30s
            await websocket.send_json({"type": "ping"})
            pong = await asyncio.wait_for(websocket.receive_json(), timeout=10)
            # Revalidate workspace access before each push
            if not await user_has_workspace_access(ticket_data["workspace_id"], ticket_data["user_id"]):
                await websocket.close(code=4403, reason="Access revoked")
                break
            # ... relay job events
    finally:
        await redis.srem(f"ws:conns:{ticket_data['workspace_id']}", ticket_data["conn_id"])
```

#### AI Chat (`websocket/chat.py`)

```python
"""AI coaching chat with streaming."""

from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/ws/chat")
async def ai_chat(websocket: WebSocket, ticket: str):
    """Streaming AI coaching chat.

    Auth: Single-use ticket via ?ticket=xxx (see POST /ws/ticket)
    Heartbeat: Server pings every 30s

    Client sends:
    {
        "type": "message",
        "content": "Help me develop an angle for this topic...",
        "context": {
            "topic_id": "topic_20260304_001",
            "brain_snapshot": true
        }
    }

    Server streams:
    {
        "type": "chunk",
        "content": "Based on your brain's ICP..."
    }
    {
        "type": "done",
        "content": "full response text",
        "actions": [
            {"type": "create_angle", "data": {...}}
        ]
    }

    AI context: loads brain + relevant topic/angle/hook data for workspace.
    Uses prompt templates from mcl_pipeline.prompts.
    """
    ...
```

### 4.6 Dependencies

```python
# packages/api/src/mcl_api/dependencies.py
"""FastAPI dependency injection."""

from fastapi import Request, Depends
from supabase import create_client

from mcl_api.config import Settings


def get_settings() -> Settings:
    """Cached settings singleton."""
    ...


def get_supabase(settings: Settings = Depends(get_settings)):
    """Supabase client (service role for backend operations)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_workspace(request: Request):
    """Extract workspace from request state (set by TenantMiddleware)."""
    return request.state.workspace_id


def get_pipeline_storage(
    supabase=Depends(get_supabase),
    workspace_id: str = Depends(get_workspace),
):
    """Get SupabaseStorageBackend for pipeline operations."""
    from mcl_pipeline.storage import SupabaseStorageBackend
    return SupabaseStorageBackend(supabase=supabase, workspace_id=workspace_id)
```

---

## 5. Layer 3a: Web Dashboard

### 5.1 Tech Stack

- **Build:** Vite 6+
- **Framework:** React 19+
- **Language:** TypeScript 5.4+
- **Styling:** Tailwind CSS 4+ + shadcn/ui
- **Data fetching:** TanStack Query v5
- **API client:** Auto-generated from OpenAPI spec via `openapi-typescript-codegen`
- **State:** Zustand (auth, workspace selection)
- **Realtime:** Supabase JS client (Realtime subscriptions)
- **Routing:** React Router v7
- **Charts:** Recharts

### 5.2 Pages

| Route | Page | Description |
|---|---|---|
| `/login` | `Login.tsx` | Supabase Auth UI |
| `/onboard` | `Onboard.tsx` | Guided brain setup wizard (maps to viral-onboard.md) |
| `/` | `Dashboard.tsx` | **Home screen** (first screen after login). Pipeline status board with brain health score, pipeline funnel, recent activity feed, quick actions, top performer. See Section 5.3a. |
| `/discover` | `Discover.tsx` | Discovery interface with two tabs: **"Discover Topics"** (keyword search + results) and **"Competitor Intel"** (competitor scraping, skeleton ripper results, swipe hooks). This matches GVB's `/viral:discover` which does both competitor and keyword discovery in one command. |
| `/topics` | `Topics.tsx` | Topic list with score cards, filters, bulk actions |
| `/topics/:id` | `TopicDetail.tsx` | Single topic with scoring breakdown, develop angle button |
| `/angles` | `Angles.tsx` | Angle list with contrast formula preview |
| `/angles/:id` | `AngleDetail.tsx` | Angle editor with contrast A->B, generate hooks button |
| `/hooks` | `Hooks.tsx` | Hook repository with pattern filter, swipe file tab |
| `/hooks/:id` | `HookDetail.tsx` | Hook card with score breakdown, generate script button |
| `/scripts` | `Scripts.tsx` | Script list with filming card view toggle |
| `/scripts/:id` | `ScriptDetail.tsx` | Full script viewer/editor with filming cards, PDF export |
| `/analytics` | `Analytics.tsx` | Performance dashboard: charts, winners, insights |
| `/brain` | `Brain.tsx` | Brain viewer: all sections, weight sliders, evolution log |
| `/settings` | `Settings.tsx` | Workspace settings, channel connections, API keys, team |

### 5.3a Dashboard Home Screen

The dashboard (`/`) is the **first screen after login** and serves as the pipeline status board. Layout:

```
+------------------------------------------------------------------+
|  BRAIN HEALTH: 78%              [Enhance Your Brain] [Settings]   |
+------------------------------------------------------------------+
|                                                                    |
|  PIPELINE FUNNEL                                                   |
|  +--------+  +--------+  +--------+  +--------+  +--------+       |
|  | Topics |  | Angles |  | Scripts|  | Posted |  | Analyzed|      |
|  |   42   |->|   18   |->|   12   |->|    7   |->|    5    |      |
|  +--------+  +--------+  +--------+  +--------+  +--------+       |
|                                                                    |
+------------------+----------------------------------------------+  |
|  QUICK ACTIONS   |  TOP PERFORMER THIS WEEK                     |  |
|  [Discover]      |  "Why Most Founders Fail at Content"         |  |
|  [New Angle]     |  Views: 12.4K | CTR: 8.2% | Saves: 340      |  |
|  [Run Analytics] |  Hook: Contradiction | Platform: YouTube     |  |
+------------------+----------------------------------------------+  |
|                                                                    |
|  RECENT ACTIVITY                                                   |
|  - 3 new topics discovered (2h ago)                                |
|  - Script "AI Automation Myths" moved to filming (5h ago)          |
|  - Brain evolved: hook_preferences updated (1d ago)                |
|  - Analytics collected: 3 videos analyzed (2d ago)                 |
+--------------------------------------------------------------------+
```

**Components:**
- **Brain Health Score** -- Percentage based on brain section completeness. Links to Brain page. Shows "Enhance Your Brain" button if < 100%.
- **Pipeline Funnel** -- Counts of items at each pipeline stage (topics -> angles -> scripts -> posted -> analyzed). Each node is clickable, navigating to the filtered list page.
- **Quick Actions** -- Top 3 most common next actions based on pipeline state (e.g., if no topics exist, "Discover Topics" is primary).
- **Top Performer This Week** -- Highest-scoring published content from the last 7 days. Shows key metrics, hook pattern, and platform.
- **Recent Activity Feed** -- Chronological list of pipeline events (discoveries, status changes, brain evolutions, analytics runs). Max 10 items, "View all" link.

### 5.3 Key Components

**PipelineFlow** -- Visual representation of the content pipeline:
```
DISCOVER -> ANGLE -> SCRIPT -> PUBLISH -> ANALYZE
```
Each node shows count of items in that stage. Clicking navigates to the relevant list page.

**TopicCard** -- Displays topic title, source platform badge, scoring breakdown (4 criteria), CCN fit indicators, pillar tags, competitor coverage count.

**AngleCard** -- Shows contrast formula ("Common belief -> Surprising truth"), strength badge (mild/moderate/strong/extreme), proof method, CTA direction.

**HookCard** -- Shows hook text, pattern badge (one of 6), composite score bar, platform badge, status lifecycle (draft->approved->used->winner/dud).

**ScriptViewer** -- Sectioned view of script structure: opening hook, retention hook, sections with talking points, CTAs, filming cards accordion.

**ScriptWizard** -- 4-step guided wizard for content creation, accessible from topic detail, angle list, or "New Script" quick action:

```
Step 1: Format Selection    Step 2: Angle Selection    Step 3: Hook Generation    Step 4: Script Generation
+---------------------+    +---------------------+    +---------------------+    +---------------------+
| [  Longform  ]      |    | Angle Card 1        |    | Hook Card 1         |    | [Editable Rich Text]|
| [  Shortform ]      |    |  "Most think X..."  |    |  "Contradiction"    |    |                     |
| [  LinkedIn  ]      |    |  Contrast preview   |    |  Score: 8.4  ★      |    | Opening hook...     |
|                     |    |                     |    |  [Recommended]      |    | Intro framework...  |
| Three cards, user   |    | Angle Card 2        |    |                     |    | Section 1...        |
| clicks to select    |    |  "Everyone says..." |    | Hook Card 2         |    | Section 2...        |
|                     |    |                     |    |  "Specificity"      |    |                     |
|                     |    | [Generate new       |    |  Score: 7.9         |    | Sidebar:            |
|                     |    |  angles]            |    |                     |    |  Filming Cards      |
|                     |    |                     |    | ... (10 cards)      |    |  (collapsible)      |
|                     |    |                     |    | [Regenerate]        |    |                     |
|                     |    |                     |    | [Combine two]       |    | [Save Draft]        |
+---------------------+    +---------------------+    +---------------------+    | [Export PDF]        |
                                                                                 | [Generate LinkedIn] |
 ◀ Back              ▶     ◀ Back              ▶     ◀ Back              ▶      +---------------------+
 ═══════════════════════════════════════════════════════════════════════════════
 Step 1          Step 2          Step 3          Step 4        (progress bar)
```

- **Step 1 (Format Selection):** Three cards -- Longform (YouTube video), Shortform (Reel/Short/TikTok), LinkedIn (text post). Each card shows format description and estimated output length. User clicks to select.
- **Step 2 (Angle Selection):** Shows existing angle cards for the topic with contrast formula preview (Common Belief -> Surprising Truth), strength badge, proof method. "Generate new angles" button triggers AI angle generation. User clicks an angle to select.
- **Step 3 (Hook Generation):** AI generates 10 hooks displayed as cards. Each card shows: hook text, pattern type badge (one of 6), composite score bar, "Recommended" badge on top scorer. User clicks to select. "Regenerate" button generates 10 new hooks. "Combine two" mode lets user select two hooks to merge.
- **Step 4 (Script Generation):** Full script displayed in editable rich text view. Sidebar shows filming cards (longform) or beat sequence (shortform) in a collapsible panel. Bottom action bar: "Save Draft", "Export PDF", "Generate LinkedIn Post" (converts to LinkedIn format).
- **Progress bar** at top shows all 4 steps with current position. Forward/back navigation between steps. Completed steps show checkmarks.

**ChatPanel** -- Floating AI coaching panel (bottom-right). Connects via WebSocket. Context-aware: knows which page/item user is viewing. Can trigger pipeline actions (create angle, generate hooks).

**BrainViewer** -- Tabbed view of all brain sections. Evolution history timeline. Read-only for user-managed sections, editable for system-managed sections.

**WeightSliders** -- Advanced settings feature (Brain page > "Advanced" tab), **not on the main dashboard**. Allows users to manually override `learning_weights` (icp_relevance, timeliness, content_gap, proof_potential). Includes:
- Slider controls for each weight (0.1 to 5.0)
- "Reset to AI-recommended" button that restores system-calculated weights from the last brain evolution
- Warning banner when manual overrides are active: "You're using custom weights. The system won't auto-update these until you reset."
- System auto-updates from `viral-analyze`/`viral-update-brain` are the default behavior
- Manual overrides are flagged in `brain_audit_log` with `reason = 'manual_weight_override'`
- When a user resets to AI-recommended, the reset is also logged with `reason = 'reset_to_ai_recommended'`

**AgencyPermissions** -- Creator-facing permissions UI on the Settings page. When a creator's workspace is a child of an agency workspace, the creator sees a "Agency Access" panel showing: which agency has access, toggle switches for each granular permission (can_read_topics, can_read_scripts, can_read_analytics, can_read_brain, can_edit_topics, can_edit_scripts, can_trigger_discover, can_trigger_analyze). Creator can revoke any permission at any time. Changes take effect immediately (RLS policies check `revoked_at IS NULL`).

### 5.4 Data Flow

```
User action (e.g., "Generate hooks")
    |
    v
TanStack Query mutation -> POST /api/v1/angles/{id}/hooks
    |
    v
API returns { job_id: "gen_xxx" }
    |
    v
Component subscribes to Supabase Realtime: job_events WHERE job_id = "gen_xxx"
    |
    v
Progress updates stream in -> update progress bar
    |
    v
On complete: TanStack Query invalidates ["hooks", { angle_id }]
    |
    v
Hook list re-fetches automatically
```

### 5.4a Long-Running Job UX (Web Dashboard)

Long-running operations (discovery, analytics collection, recon, brain evolution) provide a multi-layered notification and progress system so users are never blocked:

**1. Toast notification on job start:**
When a user triggers a long-running job, a toast notification appears: "Discovery started -- we'll notify you when it's done." The toast auto-dismisses after 5 seconds. User can click the toast to open the job detail drawer.

**2. Global job indicator in nav bar:**
A persistent indicator in the top navigation bar shows running jobs: a small spinner icon + "N jobs running" text (similar to GitHub Actions). Clicking opens the job detail drawer. When no jobs are running, the indicator is hidden.

```
+----------------------------------------------------------------------+
|  MCL   Dashboard  Discover  Topics  Scripts  Analytics   [2 jobs running]  |
+----------------------------------------------------------------------+
```

**3. Job detail drawer (slide from right):**
A slide-out drawer showing real-time job progress via WebSocket:

```
+---------------------------+
| Discovery: Competitors    |
| Started: 2 min ago        |
| ========================= | 65%
|                           |
| [done]    YouTube scrape  |
| [done]    Transcripts     |
| [running] Hook analysis   |
| [pending] Scoring         |
| [pending] CCN fit check   |
|                           |
| Elapsed: 00:02:14         |
|                           |
| [Cancel Job]              |
+---------------------------+
```

Each stage shows status (done/running/pending). Progress bar updates in real-time. Elapsed time counter ticks. "Cancel Job" button sends `POST /api/v1/jobs/{id}/cancel`.

**4. Background operation:**
User can close the drawer and continue working on any page. The job runs in the background with the nav bar indicator providing ambient awareness.

**5. Completion notification:**
When a job completes: (a) browser notification via the Notifications API (if user granted permission), (b) toast notification in-app, (c) results appear on the relevant page (e.g., new topics appear on the Topics page, TanStack Query cache is invalidated).

### 5.5 API Client Generation

The OpenAPI spec is committed to source control at `docs/api/openapi.json` so the frontend can generate its TypeScript client without running the backend.

```bash
# scripts/generate-client.sh
#!/usr/bin/env bash
set -euo pipefail
# Generate OpenAPI spec offline (no running server needed)
python -c "
from packages.api.app.main import create_app
import json
app = create_app()
print(json.dumps(app.openapi(), indent=2))
" > docs/api/openapi.json

# Generate TypeScript client from the committed spec file
npx openapi-typescript-codegen \
  --input docs/api/openapi.json \
  --output packages/web/src/api/generated \
  --client fetch \
  --useOptions \
  --useUnionTypes
```

The committed `docs/api/openapi.json` serves as the fallback for CI and frontend builds. Run `scripts/generate-client.sh` to regenerate both the spec and the TypeScript client.

---

## 6. Layer 3b: CLI

### 6.1 Package Definition

```toml
# packages/cli/pyproject.toml
[project]
name = "mcl"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "mcl-pipeline>=0.1.0",
    "typer>=0.12",
    "rich>=13.0",
    "httpx>=0.27",
    "keyring>=25.0",
]

[project.scripts]
mcl = "mcl_cli.main:app"
```

### 6.2 Command Structure

```
mcl
+-- auth
|   +-- login              # Interactive login -> stores API key
|   +-- logout             # Remove stored credentials
|   +-- status             # Show auth status
|
+-- brain
|   +-- show               # Display current brain
|   +-- onboard            # Interactive brain setup
|   +-- evolve             # Trigger brain evolution
|   +-- export             # Export brain as JSON
|
+-- discover
|   +-- run                # Run discovery (interactive mode selection)
|   +-- --competitors      # Competitor-only discovery
|   +-- --keywords         # Keyword-only discovery
|   +-- --research TOPIC   # Run last30days research
|
+-- angle
|   +-- develop TOPIC_ID   # Generate angle from topic
|   +-- list               # List angles
|
+-- hook
|   +-- generate ANGLE_ID  # Generate hooks from angle
|   +-- list               # List hooks
|   +-- swipe              # View swipe file
|
+-- script
|   +-- generate HOOK_ID   # Generate script from hook
|   +-- list               # List scripts
|   +-- export SCRIPT_ID   # Export as PDF
|
+-- publish SCRIPT_ID      # Mark script as published
|   +-- --url URL          # Platform URL (required)
|
+-- analyze
|   +-- run                # Collect analytics
|   +-- --youtube          # YouTube only
|   +-- --instagram        # Instagram only
|   +-- winners            # Show winners
|
+-- recon
|   +-- run                # Start recon pipeline
|   +-- status             # Check job status
|   +-- skeletons          # View extracted skeletons
|
+-- jobs
|   +-- list               # List running/recent jobs with status
|   +-- status JOB_ID      # Detailed progress for one job
|   +-- cancel JOB_ID      # Cancel a running job
|
+-- config
    +-- show               # Show current config
    +-- set KEY VALUE      # Set config value
    +-- workspace          # Switch workspace
```

### 6.2a Script Generation Interactive Flow

The `mcl script` command uses a sequential interactive wizard with `rich` formatting and `questionary` for selection prompts:

```
$ mcl script

? Select content format:
  > Longform (YouTube video)
    Shortform (Reel/Short/TikTok)
    LinkedIn (text post)

? Select an angle:
  > "Most founders think content is marketing -- it's actually product development"
    [Contrast: Moderate | Proof: case study | CTA: lead magnet]
    "Everyone says post daily -- the top 1% post once a week with 10x depth"
    [Contrast: Strong | Proof: data analysis | CTA: free tool]

  Generating 10 hooks...

? Select a hook (showing top 3 -- press 'a' for all 10, 'r' to regenerate, 'c' to combine):
  > "I spent $47,382 on content in 2024. Here's what I'd do differently."
    (Specificity, score: 8.7) * Recommended
    "Everyone says 'just be consistent' -- that advice bankrupted my agency"
    (Contradiction, score: 8.2)
    "If I were starting my content strategy over, I'd skip everything you've been told"
    (POV-as-advice, score: 7.9)

  Generating longform script...

  Script generated: "Why Most Content Strategies Fail"
   Format: Longform | Sections: 5 | Est. duration: 12 min
   Filming cards: 8 scenes

? What next?
  > View script in terminal
    Export as PDF
    Generate LinkedIn post from script
    Mark as published
    Exit
```

**Non-interactive mode** for automation and CI/CD:
```bash
mcl script --format longform --angle <angle_id> --hook auto --output pdf
mcl script --format shortform --angle <angle_id> --hook <hook_id> --output json
mcl script --format linkedin --topic <topic_id> --hook auto --no-prompt
```
All flags skip the interactive prompts. `--hook auto` selects the highest-scoring generated hook. `--no-prompt` suppresses all interactive input.

### 6.2b Long-Running Job UX

**Foreground mode (default):** Live progress with real-time stage updates, progress bar, and elapsed time. User can press `[q]` to background the job.

```
$ mcl discover --competitors

  Discovery: Competitor Scrape                                       [00:42]
  ============================================-------------- 45%
  Scraping @creator3 (3 of 5)...

  [done] YouTube scrape       [done] Transcript extraction
  [running] Hook analysis     [pending] Scoring
  [pending] CCN fit check     [pending] Save results

  Press [q] to background this job
```

**Background mode** (`--background` flag): Starts the job and returns immediately.

```
$ mcl discover --competitors --background
  Job started: disc_abc123
  Run `mcl jobs status disc_abc123` to check progress.
```

**Job management commands:**
```
$ mcl jobs list
  ID              Type        Status      Started         Elapsed
  disc_abc123     discover    running     2 min ago       00:02:14
  gen_def456      script      completed   15 min ago      00:01:03
  reco_ghi789     recon       failed      1 hour ago      00:08:42

$ mcl jobs status disc_abc123
  Job: disc_abc123 (Competitor Discovery)
  Status: running | Elapsed: 00:03:01

  [done] YouTube scrape (5/5 competitors)
  [done] Transcript extraction (15/15 videos)
  [running] Hook analysis (8/15 videos)
  [pending] Scoring
  [pending] CCN fit check

$ mcl jobs cancel disc_abc123
  Job disc_abc123 cancelled.
```

**Desktop notification** on job completion (when terminal supports it via `notify-send`, `osascript`, or `terminal-notifier`). **Non-interactive mode** (`--no-prompt`): all options supplied via flags, no user input required -- suitable for cron jobs and scripting.

### 6.3 Dual Mode: Local vs Cloud

```python
# packages/cli/src/mcl_cli/main.py
"""MCL CLI entry point.

Dual mode:
- Local mode: imports mcl_pipeline directly, runs on local machine
- Cloud mode: calls MCL API via HTTP, runs on server

Mode selection:
- --local flag forces local mode
- MCL_API_URL env var triggers cloud mode
- Default: local mode (no server needed)
"""

import typer
from mcl_cli.config import load_config

app = typer.Typer(name="mcl", help="Microcelebrity Labs CLI")


def get_runner():
    """Get the appropriate runner based on mode."""
    config = load_config()
    if config.mode == "local":
        from mcl_cli.runners.local import LocalRunner
        return LocalRunner(config)
    else:
        from mcl_cli.runners.cloud import CloudRunner
        return CloudRunner(config)
```

```python
# packages/cli/src/mcl_cli/runners/local.py
"""Local runner -- imports mcl_pipeline directly."""

from mcl_pipeline.recon import SkeletonRipperPipeline, JobConfig
from mcl_pipeline.scoring.engine import score_topic
from mcl_pipeline.brain.engine import create_default_brain
from mcl_pipeline.storage import LocalStorageBackend


class LocalRunner:
    """Run pipeline locally using mcl_pipeline package.

    Data stored in ~/.mcl/data/ (JSON/JSONL files, matching GVB structure).
    """

    def __init__(self, config):
        self.storage = LocalStorageBackend(data_dir=config.data_dir)

    def run_recon(self, usernames, platform, **kwargs):
        pipeline = SkeletonRipperPipeline(base_dir=self.storage.recon_dir)
        config = JobConfig(usernames=usernames, platform=platform, **kwargs)
        return pipeline.run(config, on_progress=self._print_progress)
```

```python
# packages/cli/src/mcl_cli/runners/cloud.py
"""Cloud runner -- calls MCL API via HTTP."""

import httpx
from mcl_cli.auth import get_api_key


class CloudRunner:
    """Run pipeline via MCL API.

    Requires: MCL_API_URL and stored API key.
    """

    def __init__(self, config):
        self.client = httpx.Client(
            base_url=config.api_url,
            headers={"X-API-Key": get_api_key()},
        )

    def run_recon(self, usernames, platform, **kwargs):
        response = self.client.post("/api/v1/recon/run", json={
            "usernames": usernames,
            "platform": platform,
            **kwargs,
        })
        job = response.json()
        return self._poll_job(job["job_id"])
```

### 6.4 Auth Flow

```
mcl auth login
    |
    v
Opens browser -> https://app.mcl.dev/cli-auth
    |
    v
User logs in via Supabase Auth
    |
    v
Callback generates API key -> displays key
    |
    v
User pastes key OR auto-captures via localhost callback
    |
    v
Key stored in system keyring via `keyring` package
    |
    v
All subsequent CLI requests use X-API-Key header
```

### 6.5 Config File

```toml
# ~/.mcl/config.toml
[default]
mode = "local"          # "local" or "cloud"
api_url = ""            # Set for cloud mode
workspace_id = ""       # Set for cloud mode
data_dir = "~/.mcl/data"

[credentials]
openai_api_key = ""     # For local mode
anthropic_api_key = ""

[pipeline]
llm_provider = "openai"
llm_model = "gpt-4o-mini"
transcribe_provider = "openai"
```

---

## 7. Layer 3c: MCP Server

### 7.1 Interface Design

```python
# packages/mcp/src/mcl_mcp/server.py
"""MCP Server for MCL -- enables Claude/GPT to use the content pipeline.

Exposes MCL pipeline operations as MCP tools.
Thin wrapper: validates input, calls API or pipeline, returns structured output.
"""

from mcp.server import Server
from mcp.types import Tool, TextContent


server = Server("mcl")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="mcl_discover",
            description="Discover trending content topics in a niche",
            inputSchema={
                "type": "object",
                "properties": {
                    "mode": {"type": "string", "enum": ["competitor", "keyword", "research"]},
                    "query": {"type": "string", "description": "Search query or topic"},
                },
                "required": ["mode"],
            },
        ),
        Tool(
            name="mcl_develop_angle",
            description="Develop a content angle from a topic using the Contrast Formula",
            inputSchema={
                "type": "object",
                "properties": {
                    "topic_id": {"type": "string"},
                    "format": {"type": "string", "enum": ["longform", "shortform", "linkedin"]},
                },
                "required": ["topic_id"],
            },
        ),
        Tool(
            name="mcl_generate_hooks",
            description="Generate hooks from an angle using 6 HookGenie patterns",
            inputSchema={
                "type": "object",
                "properties": {
                    "angle_id": {"type": "string"},
                    "patterns": {
                        "type": "array",
                        "items": {"type": "string", "enum": [
                            "contradiction", "specificity", "timeframe_tension",
                            "pov_as_advice", "vulnerable_confession", "pattern_interrupt",
                        ]},
                    },
                },
                "required": ["angle_id"],
            },
        ),
        Tool(name="mcl_generate_script", description="Generate a full script from hooks", ...),
        Tool(name="mcl_run_recon", description="Run competitor recon pipeline", ...),
        Tool(name="mcl_get_brain", description="Get the current agent brain", ...),
        Tool(name="mcl_analyze", description="Collect and analyze content performance", ...),
        Tool(name="mcl_research_topic", description="Research a topic using last30days skill", ...),
    ]
```

---

## 8. Channel Plugin Architecture

### 8.1 Base Classes

```python
# packages/pipeline/src/mcl_pipeline/channels/base.py
"""Abstract base classes for channel plugins.

Each platform implements three interfaces:
1. DiscoverChannel -- find trending content
2. PublishChannel -- post content (future)
3. AnalyzeChannel -- collect analytics
"""

from abc import ABC, abstractmethod
from typing import Optional, Callable
from mcl_pipeline.models.topic import Topic
from mcl_pipeline.models.analytics import AnalyticsEntry


class ChannelConfig:
    """Base configuration for a channel."""
    name: str
    display_name: str
    supports_discover: bool = True
    supports_publish: bool = False
    supports_analyze: bool = False
    required_credentials: list[str] = []
    optional_credentials: list[str] = []


class DiscoverChannel(ABC):
    """Interface for discovering content from a platform."""

    @abstractmethod
    def discover_topics(
        self,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> list[Topic]:
        """Search platform for trending topics matching keywords.

        Returns scored Topics.
        """
        ...

    @abstractmethod
    def scrape_competitor(
        self,
        handle: str,
        max_items: int = 20,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> list[dict]:
        """Scrape a competitor's recent content.

        Returns raw content metadata dicts.
        """
        ...


class PublishChannel(ABC):
    """Interface for publishing content to a platform. (Future)"""

    @abstractmethod
    def publish(self, content: dict, credentials: dict) -> dict:
        """Publish content. Returns platform-specific response."""
        ...


class AnalyzeChannel(ABC):
    """Interface for collecting analytics from a platform."""

    @abstractmethod
    def collect_analytics(
        self,
        content_ids: list[str],
        credentials: dict,
    ) -> list[AnalyticsEntry]:
        """Collect analytics for published content.

        Returns AnalyticsEntry models.
        """
        ...

    @abstractmethod
    def get_connection_status(self, credentials: dict) -> dict:
        """Check if platform API is properly connected.

        Returns: {"connected": bool, "details": str}
        """
        ...
```

### 8.2 Channel Registry

```python
# packages/pipeline/src/mcl_pipeline/channels/registry.py
"""Config-driven channel registry.

Adding a new platform = one file + one registry entry.
"""

from typing import Optional
from mcl_pipeline.channels.base import DiscoverChannel, PublishChannel, AnalyzeChannel


class ChannelRegistry:
    """Central registry of all channel plugins."""

    _discover: dict[str, type[DiscoverChannel]] = {}
    _publish: dict[str, type[PublishChannel]] = {}
    _analyze: dict[str, type[AnalyzeChannel]] = {}

    @classmethod
    def register_discover(cls, name: str, channel_class: type[DiscoverChannel]):
        cls._discover[name] = channel_class

    @classmethod
    def register_publish(cls, name: str, channel_class: type[PublishChannel]):
        cls._publish[name] = channel_class

    @classmethod
    def register_analyze(cls, name: str, channel_class: type[AnalyzeChannel]):
        cls._analyze[name] = channel_class

    @classmethod
    def get_discover(cls, name: str) -> Optional[DiscoverChannel]:
        channel_cls = cls._discover.get(name)
        return channel_cls() if channel_cls else None

    @classmethod
    def list_channels(cls) -> dict[str, dict]:
        """List all registered channels with capabilities."""
        all_names = set(cls._discover) | set(cls._publish) | set(cls._analyze)
        return {
            name: {
                "discover": name in cls._discover,
                "publish": name in cls._publish,
                "analyze": name in cls._analyze,
            }
            for name in sorted(all_names)
        }
```

### 8.3 Per-Platform Implementations

#### YouTube Channel (`channels/youtube.py`)

```python
"""YouTube channel plugin.

GVB origin:
- Discovery: recon/scraper/youtube.py (get_channel_videos, download_video, save_channel_data)
- Analysis: viral-analyze.md YouTube Analytics API integration
"""

from mcl_pipeline.channels.base import DiscoverChannel, AnalyzeChannel
from mcl_pipeline.channels.registry import ChannelRegistry
from mcl_pipeline.recon.scrapers.youtube import get_channel_videos, download_video


class YouTubeDiscoverChannel(DiscoverChannel):
    """YouTube discovery via yt-dlp + YouTube Data API v3.

    Capabilities:
    - Scrape competitor channels (yt-dlp, no API quota)
    - Keyword search (YouTube Data API, 100 units per search)
    - Video download + transcription

    API Key Model (BYOK + Paid Fallback):
    - Free tier: User must bring their own YouTube Data API key (BYOK).
      Key stored encrypted in workspace_connections table.
    - Paid tier: MCL provides YouTube API access, metered per API call.
      MCL-managed key used transparently; usage billed to workspace.
    - Rate limiting is per-key, not per-platform. Each key has its own
      10K units/day ceiling tracked independently.
    """

    def discover_topics(self, keywords, max_results=20, progress_callback=None):
        ...

    def scrape_competitor(self, handle, max_items=20, progress_callback=None):
        """Wraps get_channel_videos() from GVB."""
        return get_channel_videos(handle, max_videos=max_items, progress_callback=progress_callback)


class YouTubeAnalyzeChannel(AnalyzeChannel):
    """YouTube analytics via YouTube Analytics API v2.

    Required credentials: YouTube OAuth token (stored encrypted in workspace_connections table).
    Free tier: user provides own OAuth credentials (BYOK).
    Paid tier: MCL-managed OAuth, metered per API call.
    """

    def collect_analytics(self, content_ids, credentials):
        ...

    def get_connection_status(self, credentials):
        ...


# Register
ChannelRegistry.register_discover("youtube", YouTubeDiscoverChannel)
ChannelRegistry.register_analyze("youtube", YouTubeAnalyzeChannel)
```

#### Instagram Channel (`channels/instagram.py`)

```python
"""Instagram channel plugin.

GVB origin:
- Discovery: recon/scraper/instagram.py (InstaClient)
- Analysis: viral-analyze.md Instagram Graph API + instaloader fallback
"""

from mcl_pipeline.channels.base import DiscoverChannel, AnalyzeChannel
from mcl_pipeline.channels.registry import ChannelRegistry
from mcl_pipeline.recon.scrapers.instagram import InstaClient


class InstagramDiscoverChannel(DiscoverChannel):
    """Instagram discovery -- split model based on client type.

    Web Dashboard: Uses Apify API for Instagram competitor scraping.
      MCL never scrapes Instagram directly from the server.
      Apify handles session management, rate limits, and TOS compliance.
      Required credentials: apify_api_key (stored in channel_credentials)

    CLI: Users run instaloader locally with their own Instagram session.
      User must acknowledge Instagram TOS acceptance during `mcl setup --instagram`.
      `tos_accepted_at` timestamp stored in workspace settings.
      MCL provides the instaloader wrapper but does not manage sessions server-side.

    This split exists for legal risk mitigation: server-side Instagram scraping
    at scale carries TOS violation risk. Apify accepts this liability for web users.
    CLI users accept personal responsibility via TOS acknowledgment.
    """

    def __init__(self, mode: Literal["web", "cli"] = "web"):
        self._mode = mode
        self._client = None

    def _get_client(self, credentials: dict):
        if self._mode == "web":
            # Apify API -- no direct scraping
            return ApifyInstagramClient(api_key=credentials["apify_api_key"])
        else:
            # CLI mode -- local instaloader with user's session
            if not self._client:
                self._client = InstaClient(session_dir=credentials.get("session_dir"))
                self._client.login(credentials["ig_username"], credentials["ig_password"])
            return self._client

    def scrape_competitor(self, handle, max_items=50, progress_callback=None):
        """Wraps InstaClient.get_competitor_reels() (CLI) or Apify API (web)."""
        ...


class InstagramAnalyzeChannel(AnalyzeChannel):
    """Instagram analytics.

    Mode 1: Instagram Graph API (full metrics: views, reach, saves, follower growth)
    Mode 2: Instaloader fallback (limited: views, likes, comments) -- CLI only
    """
    ...


ChannelRegistry.register_discover("instagram", InstagramDiscoverChannel)
ChannelRegistry.register_analyze("instagram", InstagramAnalyzeChannel)
```

#### New Platform Channels

| Channel | File | Discovery Method | Credentials |
|---|---|---|---|
| Reddit | `channels/reddit.py` | last30days skill + Reddit API | `REDDIT_CLIENT_ID`, `REDDIT_SECRET` (optional -- can use OpenAI web search) |
| TikTok | `channels/tiktok.py` | yt-dlp (`tiktok.com/@handle`) | None (yt-dlp) |
| Hacker News | `channels/hackernews.py` | Algolia Search API (`hn.algolia.com/api/v1/search`) | None (public API) |
| LinkedIn | `channels/linkedin.py` | Apify LinkedIn scraper | `APIFY_API_KEY` |
| X/Twitter | `channels/x.py` | xAI Agent Tools API (grok-4 x_search) | `XAI_API_KEY` |

---

## 9. Data Model

### 9.1 Postgres Schema (Supabase)

```sql
-- supabase/migrations/00001_initial_schema.sql

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (managed by Supabase Auth, this extends it)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspaces (multi-tenancy root)
CREATE TABLE public.workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    owner_id    UUID NOT NULL REFERENCES public.profiles(id),
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    deleted_at  TIMESTAMPTZ,  -- Soft delete: NULL = active, non-NULL = deleted
    parent_id   UUID REFERENCES public.workspaces(id),  -- B2B: agency parent workspace
    settings    JSONB NOT NULL DEFAULT '{}',  -- Includes tos_accepted_at (ISO timestamp) for Instagram CLI scraping acknowledgment
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members (RBAC)
-- NOTE: workspace owner is auto-added with role='owner' and accepted_at=now()
-- on workspace creation. This is required because RLS policies check
-- workspace_members for access. Without it, the owner cannot read their own workspace.
CREATE TABLE public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at  TIMESTAMPTZ,  -- NULL until invitation accepted; owner rows set to now() immediately
    PRIMARY KEY (workspace_id, user_id)
);

-- API keys for CLI/programmatic access
CREATE TABLE public.api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the API key
    key_prefix   TEXT NOT NULL,          -- First 8 chars for identification (e.g., "mcl_abc1...")
    name         TEXT NOT NULL DEFAULT 'default',
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

-- ============================================================================
-- PIPELINE TABLES (workspace-scoped)
-- ============================================================================

-- Agent Brain (one per workspace)
-- Hybrid JSONB storage: full brain in single `data` column with materialized
-- generated columns for commonly queried fields.
-- Pipeline reads: one row, one query, full brain.
-- Dashboard search/filter: uses indexed generated columns.
-- Section-level writes: via jsonb_set() with optimistic locking (version column).
CREATE TABLE public.brains (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data         JSONB NOT NULL DEFAULT '{}',  -- Full AgentBrain JSON
    -- Materialized generated columns for common dashboard queries
    niche        TEXT GENERATED ALWAYS AS (data->'identity'->>'niche') STORED,
    primary_funnel TEXT GENERATED ALWAYS AS (data->'monetization'->>'primary_funnel') STORED,
    version      INTEGER NOT NULL DEFAULT 1,   -- Optimistic lock: incremented on every write
    updated_by   UUID,                         -- User or system actor who last modified this brain
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One brain per workspace
);

CREATE INDEX idx_brains_niche ON public.brains(niche) WHERE niche IS NOT NULL;
CREATE INDEX idx_brains_funnel ON public.brains(primary_funnel) WHERE primary_funnel IS NOT NULL;

-- Brain Audit Log (append-only change history for every brain mutation)
CREATE TABLE public.brain_audit_log (
    id           BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    version      INTEGER NOT NULL,               -- Brain version AFTER this change
    section      TEXT NOT NULL,                   -- Brain section changed (e.g., 'identity', 'learning_weights')
    diff         JSONB NOT NULL,                  -- JSON Merge Patch (RFC 7396) of what changed
    actor_type   TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key')),
    actor_id     UUID NOT NULL,                   -- User ID or system job ID
    reason       TEXT,                            -- Human-readable reason (e.g., 'onboarding', 'brain evolution', 'manual weight override')
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brain_audit_workspace ON public.brain_audit_log(workspace_id, version DESC);
CREATE INDEX idx_brain_audit_section ON public.brain_audit_log(workspace_id, section);

-- Topics
CREATE TABLE public.topics (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data         JSONB NOT NULL,  -- Full Topic JSON
    title        TEXT GENERATED ALWAYS AS (data->>'title') STORED,
    status       TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    weighted_total NUMERIC GENERATED ALWAYS AS ((data->'scoring'->>'weighted_total')::numeric) STORED,
    discovered_at TIMESTAMPTZ GENERATED ALWAYS AS ((data->>'discovered_at')::timestamptz) STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_topics_workspace ON public.topics(workspace_id);
CREATE INDEX idx_topics_status ON public.topics(workspace_id, status);
CREATE INDEX idx_topics_score ON public.topics(workspace_id, weighted_total DESC);

-- Angles
CREATE TABLE public.angles (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    topic_id     TEXT NOT NULL,
    data         JSONB NOT NULL,  -- Full Angle JSON
    format       TEXT GENERATED ALWAYS AS (data->>'format') STORED,
    status       TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_angles_workspace ON public.angles(workspace_id);
CREATE INDEX idx_angles_topic ON public.angles(workspace_id, topic_id);

-- Hooks
CREATE TABLE public.hooks (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    angle_id     TEXT NOT NULL,
    data         JSONB NOT NULL,  -- Full Hook JSON
    pattern      TEXT GENERATED ALWAYS AS (data->>'pattern') STORED,
    status       TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    composite    NUMERIC GENERATED ALWAYS AS ((data->'score'->>'composite')::numeric) STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_hooks_workspace ON public.hooks(workspace_id);
CREATE INDEX idx_hooks_angle ON public.hooks(workspace_id, angle_id);
CREATE INDEX idx_hooks_pattern ON public.hooks(workspace_id, pattern);
CREATE INDEX idx_hooks_score ON public.hooks(workspace_id, composite DESC);

-- Scripts
CREATE TABLE public.scripts (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    angle_id     TEXT NOT NULL,
    data         JSONB NOT NULL,  -- Full Script JSON
    platform     TEXT GENERATED ALWAYS AS (data->>'platform') STORED,
    status       TEXT GENERATED ALWAYS AS (data->>'status') STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_scripts_workspace ON public.scripts(workspace_id);
CREATE INDEX idx_scripts_angle ON public.scripts(workspace_id, angle_id);
CREATE INDEX idx_scripts_status ON public.scripts(workspace_id, status);

-- Analytics Entries
CREATE TABLE public.analytics_entries (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    content_id   TEXT NOT NULL,
    data         JSONB NOT NULL,  -- Full AnalyticsEntry JSON
    platform     TEXT GENERATED ALWAYS AS (data->>'platform') STORED,
    analyzed_at  TIMESTAMPTZ GENERATED ALWAYS AS ((data->>'analyzed_at')::timestamptz) STORED,
    is_winner    BOOLEAN GENERATED ALWAYS AS ((data->>'is_winner')::boolean) STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_analytics_workspace ON public.analytics_entries(workspace_id);
CREATE INDEX idx_analytics_content ON public.analytics_entries(workspace_id, content_id);
CREATE INDEX idx_analytics_winners ON public.analytics_entries(workspace_id) WHERE is_winner = true;

-- Insights (one per workspace, aggregated)
CREATE TABLE public.insights (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data         JSONB NOT NULL DEFAULT '{}',  -- Full Insight JSON
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)
);

-- Swipe File (saved competitor hooks)
-- Seed hooks (is_system=true) are copied from the system library to every new workspace.
-- After onboarding, a background recon job auto-populates niche-specific swipe hooks.
CREATE TABLE public.swipe_hooks (
    id           TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data         JSONB NOT NULL,  -- Full SwipeHook JSON
    pattern      TEXT GENERATED ALWAYS AS (data->>'pattern') STORED,
    competitor   TEXT GENERATED ALWAYS AS (data->>'competitor') STORED,
    is_system    BOOLEAN NOT NULL DEFAULT false,  -- true = curated seed hook, false = user/recon generated
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, workspace_id)
);

CREATE INDEX idx_swipe_workspace ON public.swipe_hooks(workspace_id);
CREATE INDEX idx_swipe_system ON public.swipe_hooks(workspace_id, is_system);

-- Competitor Reels (scraped video metadata)
CREATE TABLE public.competitor_reels (
    shortcode    TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    data         JSONB NOT NULL,  -- Full CompetitorReel JSON
    handle       TEXT NOT NULL,
    views        INTEGER GENERATED ALWAYS AS ((data->>'views')::integer) STORED,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (shortcode, workspace_id)
);

CREATE INDEX idx_reels_workspace ON public.competitor_reels(workspace_id);
CREATE INDEX idx_reels_handle ON public.competitor_reels(workspace_id, handle);

-- ============================================================================
-- JOB TRACKING
-- ============================================================================

CREATE TABLE public.jobs (
    id           TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,  -- 'recon', 'discover', 'content', 'analytics', 'brain', 'export'
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'complete', 'failed', 'cancelled'
    )),
    config       JSONB NOT NULL DEFAULT '{}',
    result       JSONB,
    error        TEXT,
    progress     JSONB NOT NULL DEFAULT '{}',  -- Matches JobProgress dataclass
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_workspace ON public.jobs(workspace_id);
CREATE INDEX idx_jobs_status ON public.jobs(workspace_id, status);

-- Job events for Realtime subscriptions
CREATE TABLE public.job_events (
    id           BIGSERIAL PRIMARY KEY,
    job_id       TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type   TEXT NOT NULL,  -- 'progress', 'complete', 'error', 'log'
    data         JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_events_job ON public.job_events(job_id);

-- Dead Letter Queue (failed jobs for auto-retry and admin inspection)
CREATE TABLE public.dead_letter_jobs (
    id           BIGSERIAL PRIMARY KEY,
    job_id       TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    job_type     TEXT NOT NULL,
    error        TEXT NOT NULL,
    failed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    original_params JSONB NOT NULL DEFAULT '{}',
    auto_retry_at   TIMESTAMPTZ,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_auto_retries INTEGER NOT NULL DEFAULT 2,
    status       TEXT NOT NULL DEFAULT 'pending_retry' CHECK (status IN (
        'pending_retry', 'retrying', 'permanent_failure'
    ))
);

CREATE INDEX idx_dlq_workspace ON public.dead_letter_jobs(workspace_id);
CREATE INDEX idx_dlq_status ON public.dead_letter_jobs(status);
CREATE INDEX idx_dlq_retry_at ON public.dead_letter_jobs(auto_retry_at) WHERE status = 'pending_retry';

-- ============================================================================
-- PLATFORM CREDENTIALS (encrypted)
-- ============================================================================

CREATE TABLE public.channel_credentials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    channel      TEXT NOT NULL,  -- 'youtube', 'instagram', 'reddit', etc.
    credentials  JSONB NOT NULL,  -- Encrypted at rest via Supabase vault
    key_source   TEXT NOT NULL DEFAULT 'byok' CHECK (key_source IN ('byok', 'mcl_managed')),
    is_connected BOOLEAN NOT NULL DEFAULT false,
    connected_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, channel)
);

-- Per-key rate limiting for YouTube API (and other metered APIs)
CREATE TABLE public.api_quota_usage (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    channel      TEXT NOT NULL,
    key_source   TEXT NOT NULL DEFAULT 'byok',
    units_used   INTEGER NOT NULL DEFAULT 0,
    quota_limit  INTEGER NOT NULL DEFAULT 10000,  -- YouTube: 10K units/day
    period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, channel, period_start)
);

-- ============================================================================
-- WORKSPACE CONNECTIONS (platform OAuth / API key storage)
-- ============================================================================

CREATE TABLE public.workspace_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('api_key', 'oauth', 'session')),
    credentials_encrypted JSONB,  -- encrypted via Supabase Vault
    key_source TEXT CHECK (key_source IN ('user_provided', 'mcl_provided')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, platform)
);
CREATE INDEX idx_connections_workspace ON public.workspace_connections(workspace_id);
CREATE INDEX idx_connections_status ON public.workspace_connections(status) WHERE status = 'expired';

-- ============================================================================
-- PROMPT TEMPLATES (admin-managed)
-- ============================================================================

CREATE TABLE public.prompt_templates (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      TEXT NOT NULL,
    version   TEXT NOT NULL,
    data      JSONB NOT NULL,  -- system_prompt, user_prompt_template, required_context
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(name, version)
);

-- ============================================================================
-- PLANS (admin-configurable, database-driven)
-- ============================================================================

CREATE TABLE public.plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT UNIQUE NOT NULL,       -- 'free', 'pro', 'agency'
    display_name            TEXT NOT NULL,              -- 'Free', 'Pro', 'Agency'

    -- AI limits
    ai_calls_per_day        INT NOT NULL DEFAULT 20,
    ai_tokens_per_month     BIGINT NOT NULL DEFAULT 1000000,
    ai_max_tokens_per_call  INT NOT NULL DEFAULT 4096,

    -- Pipeline limits
    discover_runs_per_day   INT NOT NULL DEFAULT 3,
    max_competitors         INT NOT NULL DEFAULT 2,
    max_workspaces          INT NOT NULL DEFAULT 1,
    max_team_members        INT NOT NULL DEFAULT 1,

    -- Platform access
    platforms_allowed       TEXT[] NOT NULL DEFAULT '{youtube,instagram}',

    -- Feature flags (extensible)
    features                JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"export_pdf": true, "api_access": false, "priority_jobs": false,
    --       "default_model": "claude-haiku-4-5", "analytics_history_days": 30}

    -- Pricing
    price_monthly_cents     INT NOT NULL DEFAULT 0,
    price_yearly_cents      INT NOT NULL DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly  TEXT,

    -- Metadata
    is_active               BOOLEAN NOT NULL DEFAULT true,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SUBSCRIPTIONS (Stripe billing)
-- ============================================================================

CREATE TABLE public.subscriptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    plan_id                 UUID NOT NULL REFERENCES public.plans(id),
    status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at               TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    trial_end               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One active subscription per workspace
);
CREATE INDEX idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- Stripe webhook handler: POST /webhooks/stripe
-- Handles: customer.subscription.updated, invoice.payment_failed,
--          customer.subscription.deleted
-- Grace period: 7 days on payment failure before downgrade to free tier.

-- ============================================================================
-- WORKSPACE USAGE (tracks consumption against plan limits)
-- ============================================================================

CREATE TABLE public.workspace_usage (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    period                  TEXT NOT NULL,              -- '2026-03' (month granularity)
    ai_calls_today          INT NOT NULL DEFAULT 0,
    ai_calls_today_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()) + interval '1 day',
    ai_tokens_this_month    BIGINT NOT NULL DEFAULT 0,
    discover_runs_today     INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, period)
);

CREATE INDEX idx_workspace_usage_lookup ON public.workspace_usage(workspace_id, period);

-- ============================================================================
-- RECON TRACKER STATE (duplicate prevention, from GVB tracker.py)
-- ============================================================================

CREATE TABLE public.recon_tracker_state (
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL,
    handle          TEXT NOT NULL,
    last_content_id TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen_urls       TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE(workspace_id, platform, handle)
);

CREATE INDEX idx_recon_tracker_lookup ON public.recon_tracker_state(workspace_id, platform, handle);
```

### 9.2 RLS Policies

```sql
-- supabase/migrations/00002_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_tracker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = ws_id AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check workspace role
CREATE OR REPLACE FUNCTION public.user_workspace_role(ws_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            (SELECT role FROM public.workspace_members
             WHERE workspace_id = ws_id AND user_id = auth.uid()),
            (SELECT 'admin' FROM public.workspaces
             WHERE id = ws_id AND owner_id = auth.uid()),
            'none'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspace policies
CREATE POLICY "Users see own workspaces"
    ON public.workspaces FOR SELECT
    USING (user_has_workspace_access(id) AND deleted_at IS NULL);

CREATE POLICY "Owners can update workspace"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());

-- Generic workspace-scoped policy template for pipeline tables
-- Applied to: brains, topics, angles, hooks, scripts, analytics_entries,
-- insights, swipe_hooks, competitor_reels, jobs, job_events

-- Example for topics (repeat pattern for all pipeline tables):
-- Policies now check BOTH direct membership AND agency grants via user_has_parent_access()
CREATE POLICY "Members can view topics"
    ON public.topics FOR SELECT
    USING (user_has_parent_access(workspace_id, 'topics_read'));

CREATE POLICY "Editors can insert topics"
    ON public.topics FOR INSERT
    WITH CHECK (
        user_workspace_role(workspace_id) IN ('owner', 'admin', 'editor')
        OR user_has_parent_access(workspace_id, 'topics_edit')
    );

CREATE POLICY "Editors can update topics"
    ON public.topics FOR UPDATE
    USING (
        user_workspace_role(workspace_id) IN ('owner', 'admin', 'editor')
        OR user_has_parent_access(workspace_id, 'topics_edit')
    );

CREATE POLICY "Admins can delete topics"
    ON public.topics FOR DELETE
    USING (user_workspace_role(workspace_id) = 'admin');

-- Channel credentials: admin only
CREATE POLICY "Admins manage credentials"
    ON public.channel_credentials FOR ALL
    USING (user_workspace_role(workspace_id) = 'admin');

-- ============================================================================
-- CREATOR-CONTROLLED AGENCY PERMISSIONS (B2B)
-- ============================================================================

-- Workspace Access Grants: granular permissions for parent (agency) -> child (creator) access
CREATE TABLE public.workspace_access_grants (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,  -- Child workspace (creator)
    grantee_workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,  -- Parent workspace (agency)
    -- Read permissions
    can_read_topics     BOOLEAN NOT NULL DEFAULT false,
    can_read_angles     BOOLEAN NOT NULL DEFAULT false,
    can_read_scripts    BOOLEAN NOT NULL DEFAULT false,
    can_read_analytics  BOOLEAN NOT NULL DEFAULT false,
    can_read_brain      BOOLEAN NOT NULL DEFAULT false,
    -- Write permissions
    can_edit_topics     BOOLEAN NOT NULL DEFAULT false,
    can_edit_scripts    BOOLEAN NOT NULL DEFAULT false,
    -- Action permissions
    can_trigger_discover BOOLEAN NOT NULL DEFAULT false,
    can_trigger_analyze  BOOLEAN NOT NULL DEFAULT false,
    -- Metadata
    granted_by   UUID NOT NULL REFERENCES public.profiles(id),  -- Creator who granted access
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ,  -- NULL = active, non-NULL = revoked
    UNIQUE(workspace_id, grantee_workspace_id)
);

CREATE INDEX idx_grants_workspace ON public.workspace_access_grants(workspace_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_grants_grantee ON public.workspace_access_grants(grantee_workspace_id) WHERE revoked_at IS NULL;

-- RLS policies for workspace_access_grants: workspace members can manage grants for their workspace
CREATE POLICY "Members can view grants for their workspace"
    ON public.workspace_access_grants FOR SELECT
    USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Owners/admins can manage grants"
    ON public.workspace_access_grants FOR ALL
    USING (user_workspace_role(workspace_id) IN ('owner', 'admin'));

-- RLS policies for prompt_templates: read-only for all authenticated users, write for admins only
CREATE POLICY "All authenticated users can read prompt templates"
    ON public.prompt_templates FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only system admins can modify prompt templates"
    ON public.prompt_templates FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Helper function: check parent workspace has granted access to a specific resource
CREATE OR REPLACE FUNCTION public.user_has_parent_access(ws_id UUID, resource TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct member access (existing behavior)
    IF user_has_workspace_access(ws_id) THEN
        RETURN true;
    END IF;
    -- Agency access via grants: user is member of grantee_workspace_id, grant covers the resource
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_access_grants g
        JOIN public.workspace_members m ON m.workspace_id = g.grantee_workspace_id
        WHERE g.workspace_id = ws_id
          AND m.user_id = auth.uid()
          AND g.revoked_at IS NULL
          AND CASE resource
              WHEN 'topics_read' THEN g.can_read_topics
              WHEN 'angles_read' THEN g.can_read_angles
              WHEN 'scripts_read' THEN g.can_read_scripts
              WHEN 'analytics_read' THEN g.can_read_analytics
              WHEN 'brain_read' THEN g.can_read_brain
              WHEN 'topics_edit' THEN g.can_edit_topics
              WHEN 'scripts_edit' THEN g.can_edit_scripts
              WHEN 'discover_trigger' THEN g.can_trigger_discover
              WHEN 'analyze_trigger' THEN g.can_trigger_analyze
              ELSE false
          END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B2B: Agency parent can read child workspace data
CREATE POLICY "Parent workspace can read children"
    ON public.workspaces FOR SELECT
    USING (
        parent_id IS NOT NULL AND
        user_has_workspace_access(parent_id)
    );
```

### 9.3 Brain Optimistic Locking & Section-Level Updates

Brain updates use **section-level JSON merge patches** via `jsonb_set()` instead of full brain overwrites. This prevents concurrent updates from clobbering unrelated sections.

**Optimistic Locking Update Pattern:**

```sql
-- Section-level update with optimistic locking (version check)
-- Uses jsonb_set() to patch a single section, not replace the full JSONB
UPDATE public.brains
SET
    data = jsonb_set(data, '{learning_weights}', $1::jsonb),
    version = version + 1,
    updated_by = $2,
    updated_at = now()
WHERE workspace_id = $3
  AND version = $4          -- Optimistic lock: fails if version changed since read
RETURNING version;

-- If RETURNING returns 0 rows, the version has changed (concurrent write).
-- Retry with exponential backoff: max 3 retries, delays 100ms / 200ms / 400ms.
```

**Python implementation pattern:**

```python
async def update_brain_section(
    workspace_id: str,
    section: str,
    patch: dict,
    expected_version: int,
    actor_type: str,
    actor_id: str,
    reason: str,
    max_retries: int = 3,
) -> int:
    """Update a single brain section with optimistic locking.

    Uses jsonb_set() for section-level merge instead of full brain overwrite.
    Retries up to 3 times with exponential backoff on version conflict.
    Returns the new version number.

    Raises:
        OptimisticLockError: After max_retries exhausted.
    """
    for attempt in range(max_retries):
        result = await supabase.rpc("update_brain_section", {
            "ws_id": workspace_id,
            "section_path": f"{{{section}}}",
            "section_data": json.dumps(patch),
            "actor": actor_id,
            "expected_ver": expected_version,
        }).execute()

        if result.data:  # Version returned = success
            new_version = result.data[0]["version"]
            # Append to audit log
            await supabase.table("brain_audit_log").insert({
                "workspace_id": workspace_id,
                "version": new_version,
                "section": section,
                "diff": patch,
                "actor_type": actor_type,
                "actor_id": actor_id,
                "reason": reason,
            }).execute()
            return new_version

        # Version conflict -- re-read and retry
        if attempt < max_retries - 1:
            await asyncio.sleep(0.1 * (2 ** attempt))  # 100ms, 200ms, 400ms
            brain = await supabase.table("brains").select("version").eq(
                "workspace_id", workspace_id
            ).single().execute()
            expected_version = brain.data["version"]

    raise OptimisticLockError(
        f"Brain version conflict after {max_retries} retries for workspace {workspace_id}"
    )
```

### 9.4 Entity Relationship Diagram

```
profiles
    |
    | 1:N
    v
workspaces ---< workspace_members >--- profiles
    |
    | 1:1
    +---> brains
    |
    | 1:N
    +---> topics ---< angles ---< hooks ---< scripts
    |                                           |
    | 1:N                                       | references
    +---> analytics_entries <-------------------+
    |
    | 1:1
    +---> insights
    |
    | 1:N
    +---> swipe_hooks
    |
    | 1:N
    +---> competitor_reels
    |
    | 1:N
    +---> jobs ---< job_events
    |
    | 1:N
    +---> channel_credentials
    |
    | 1:N
    +---> api_keys
    |
    | 1:N
    +---> brain_audit_log
    |
    | 1:N
    +---> workspace_access_grants
```

### 9.5 Status Enum to DB CHECK Constraint Generation

DB `CHECK` constraints on status columns are **generated** from the Python `Enum` classes in `mcl_pipeline/models/enums.py` during migration generation:

```python
# scripts/generate_status_checks.py
"""Generate SQL CHECK constraints from Python status enums.

Run as part of migration generation to keep DB constraints in sync with code.
"""
from mcl_pipeline.models.enums import TopicStatus, ScriptStatus

def enum_to_check(table: str, column: str, enum_class) -> str:
    values = ", ".join(f"'{e.value}'" for e in enum_class)
    return f"ALTER TABLE {table} ADD CONSTRAINT chk_{table}_{column} CHECK ({column} IN ({values}));"

print(enum_to_check("topics", "status", TopicStatus))
# -> ALTER TABLE topics ADD CONSTRAINT chk_topics_status CHECK (status IN ('new', 'developing', 'scripted', 'published', 'analyzed', 'passed'));

print(enum_to_check("scripts", "status", ScriptStatus))
# -> ALTER TABLE scripts ADD CONSTRAINT chk_scripts_status CHECK (status IN ('draft', 'review', 'filming', 'published', 'analyzed', 'archived'));
```

This ensures a single source of truth: change the Python enum, re-generate the migration, and both Pydantic models and DB constraints stay in sync.

---

## 10. Authentication & Authorization

### 10.1 Auth Flow (Web)

```
1. User visits app.mcl.dev/login
2. Supabase Auth UI renders (email + password, Google OAuth, GitHub OAuth)
3. On success, Supabase returns JWT + refresh token
4. JWT stored in httpOnly cookie (set by Supabase Auth helper)
5. All API requests include: Authorization: Bearer {JWT}
6. API middleware verifies JWT against Supabase JWKS
7. Extracts user_id from JWT sub claim
8. TenantMiddleware resolves workspace_id
```

### 10.2 Auth Flow (CLI)

```
1. User runs: mcl auth login
2. CLI opens browser to: app.mcl.dev/cli-auth?callback=http://localhost:9876
3. User logs in via Supabase Auth
4. Server generates API key (random 32-byte hex, prefixed with "mcl_")
5. Stores SHA-256 hash in api_keys table
6. Redirects to localhost:9876?key=mcl_xxxxx
7. CLI captures key, stores in system keyring
8. All subsequent requests: X-API-Key: mcl_xxxxx
```

### 10.3 API Key Format

```
mcl_[8 random hex]_[24 random hex]
^    ^prefix         ^secret
|
Fixed prefix for identification

Example: mcl_a1b2c3d4_e5f6a7b8c9d0e1f2a3b4c5d6
```

### 10.4 Authorization Matrix

| Resource | Viewer | Editor | Admin |
|---|---|---|---|
| Brain: read | yes | yes | yes |
| Brain: write | no | yes | yes |
| Topics/Angles/Hooks/Scripts: read | yes | yes | yes |
| Topics/Angles/Hooks/Scripts: write | no | yes | yes |
| Analytics: read | yes | yes | yes |
| Analytics: collect | no | yes | yes |
| Recon: run | no | yes | yes |
| Workspace settings | no | no | yes |
| Channel credentials | no | no | yes |
| Invite members | no | no | yes |
| Delete workspace | no | no | yes (owner only) |

---

## 11. Background Job System

### 11.1 ARQ Configuration

```python
# packages/api/src/mcl_api/workers/settings.py
"""ARQ worker settings."""

from arq.connections import RedisSettings
from mcl_api.config import Settings

settings = Settings()


class WorkerSettings:
    """ARQ worker configuration."""

    redis_settings = RedisSettings.from_dsn(settings.redis_url)

    # Job functions
    functions = [
        "mcl_api.workers.recon::run_recon_pipeline",
        "mcl_api.workers.discover::run_competitor_discovery",
        "mcl_api.workers.discover::run_keyword_discovery",
        "mcl_api.workers.discover::run_research",
        "mcl_api.workers.content::generate_angle",
        "mcl_api.workers.content::generate_hooks",
        "mcl_api.workers.content::generate_script",
        "mcl_api.workers.analytics::collect_analytics",
        "mcl_api.workers.analytics::deep_analysis",
        "mcl_api.workers.brain::evolve_brain",
        "mcl_api.workers.exports::generate_pdf",
    ]

    # Retry settings
    max_tries = 3
    job_timeout = 600   # 10 minutes max per job
    retry_delay = 30    # 30s between retries

    # Queue settings
    queue_name = "mcl:jobs"
    health_check_interval = 30
```

### 11.2 Job Types

| Job Type | Worker Function | Timeout | Retries | Description |
|---|---|---|---|---|
| `recon` | `run_recon_pipeline` | 600s | 2 | Full skeleton ripper pipeline |
| `discover_competitor` | `run_competitor_discovery` | 300s | 2 | Competitor-based topic discovery |
| `discover_keyword` | `run_keyword_discovery` | 120s | 3 | YouTube/Reddit keyword search |
| `discover_research` | `run_research` | 300s | 2 | last30days deep research |
| `generate_angle` | `generate_angle` | 60s | 3 | AI angle development |
| `generate_hooks` | `generate_hooks` | 60s | 3 | HookGenie hook generation |
| `generate_script` | `generate_script` | 120s | 3 | Full script generation |
| `collect_analytics` | `collect_analytics` | 300s | 2 | Platform analytics collection |
| `deep_analysis` | `deep_analysis` | 300s | 2 | Winner extraction + transcript analysis |
| `evolve_brain` | `evolve_brain` | 120s | 3 | Brain weight evolution |
| `generate_pdf` | `generate_pdf` | 60s | 3 | PDF export generation |

### 11.3 Dead Letter Queue (DLQ) with Auto-Retry

Jobs that exhaust their retry budget are moved to the dead letter queue for inspection, auto-retry, and eventual escalation.

#### DLQ Table

> **Note:** The `dead_letter_jobs` table definition is in Section 9.1 (schema). Not duplicated here.

#### DLQ Flow

```
Job fails 3x (exhausts ARQ max_tries)
    │
    ▼
ARQ on_job_abort hook writes to dead_letter_jobs
    │  status = 'pending_retry'
    │  auto_retry_at = now() + 15 min
    │  retry_count = 0
    ▼
Auto-retry #1 at +15 min
    │  status → 'retrying' → re-enqueue to ARQ
    │  On success → delete DLQ entry, update job status
    │  On failure → retry_count = 1, auto_retry_at = now() + 1 hour
    ▼
Auto-retry #2 at +1 hour
    │  status → 'retrying' → re-enqueue to ARQ
    │  On success → delete DLQ entry, update job status
    │  On failure → retry_count = 2 (= max_auto_retries)
    ▼
Permanent failure
    │  status → 'permanent_failure'
    │  Sentry alert fired
    │  Email notification sent to workspace owner via Resend
```

#### ARQ Abort Hook

```python
async def on_job_abort(ctx: dict, job_id: str):
    """Write failed job to DLQ when ARQ retries are exhausted."""
    supabase = ctx["supabase"]
    job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    if job.data:
        supabase.table("dead_letter_jobs").insert({
            "job_id": job_id,
            "workspace_id": job.data["workspace_id"],
            "job_type": job.data["type"],
            "error": job.data.get("error", "Unknown error"),
            "original_params": job.data.get("config", {}),
            "auto_retry_at": "now() + interval '15 minutes'",
        }).execute()
```

#### DLQ Auto-Retry Worker

A scheduled ARQ cron job runs every 5 minutes to process pending DLQ retries:

```python
async def process_dead_letter_queue(ctx: dict):
    """Cron job: auto-retry DLQ entries whose auto_retry_at has passed."""
    supabase = ctx["supabase"]
    pending = supabase.table("dead_letter_jobs") \
        .select("*") \
        .eq("status", "pending_retry") \
        .lte("auto_retry_at", "now()") \
        .execute()

    for entry in pending.data or []:
        if entry["retry_count"] >= entry["max_auto_retries"]:
            # Mark permanent failure, alert, notify
            supabase.table("dead_letter_jobs").update({
                "status": "permanent_failure",
            }).eq("id", entry["id"]).execute()
            sentry_sdk.capture_message(f"DLQ permanent failure: job {entry['job_id']}")
            await send_dlq_notification_email(entry)
        else:
            # Re-enqueue with incremented retry count
            supabase.table("dead_letter_jobs").update({
                "status": "retrying",
            }).eq("id", entry["id"]).execute()
            await arq_pool.enqueue_job(
                entry["job_type"],
                job_id=entry["job_id"],
                workspace_id=entry["workspace_id"],
                config=entry["original_params"],
            )
```

#### Dashboard: DLQ Admin View

Admin users can inspect DLQ entries at `/admin/dead-letter-queue`:
- Table of failed jobs with error details, retry history, and status
- "Requeue" button to manually re-enqueue any entry (resets retry_count)
- "Dismiss" button to mark as permanent_failure without further retries
- Filter by workspace, job type, and status

#### Job Checkpoints (from GVB `state_manager.py`)

When a job restarts (auto-retry from DLQ), it reads the checkpoint from `jobs.progress` JSONB and resumes from the last completed stage -- not from scratch. This prevents duplicate work and speeds up recovery.

**Checkpoint stages** (ordered):
```
SCRAPING → TRANSCRIBING → EXTRACTING → AGGREGATING → SYNTHESIZING
```

After each stage completes, the worker saves intermediate results + updates `jobs.progress`:

```python
# packages/api/src/mcl_api/workers/checkpoint.py
"""Job checkpoint management. Ported from GVB recon/utils/state_manager.py.

GVB origin: recon/utils/state_manager.py
Changes: Replace file-based state with jobs.progress JSONB column.
"""

from enum import IntEnum


class CheckpointStage(IntEnum):
    SCRAPING = 1
    TRANSCRIBING = 2
    EXTRACTING = 3
    AGGREGATING = 4
    SYNTHESIZING = 5


async def save_checkpoint(job_id: str, stage: CheckpointStage,
                          intermediate_results: dict, db) -> None:
    """Save checkpoint after completing a pipeline stage.
    Writes to jobs.progress JSONB: {"last_stage": 3, "stage_name": "EXTRACTING",
    "intermediate": {...}, "updated_at": "..."}
    """
    await db.table("jobs").update({
        "progress": {
            "last_stage": stage.value,
            "stage_name": stage.name,
            "intermediate": intermediate_results,
            "updated_at": datetime.utcnow().isoformat(),
        }
    }).eq("id", job_id).execute()


async def load_checkpoint(job_id: str, db) -> tuple[CheckpointStage | None, dict]:
    """Load checkpoint for a restarting job.
    Returns (last_completed_stage, intermediate_results) or (None, {}).
    """
    job = await db.table("jobs").select("progress").eq("id", job_id).single()
    progress = job.data.get("progress", {})
    if not progress.get("last_stage"):
        return None, {}
    return CheckpointStage(progress["last_stage"]), progress.get("intermediate", {})
```

### 11.4 Worker Implementation Pattern

```python
# packages/api/src/mcl_api/workers/recon.py
"""Recon pipeline background jobs."""

from arq import ArqRedis
from supabase import create_client

from mcl_pipeline.recon.skeleton_ripper.pipeline import (
    SkeletonRipperPipeline, JobConfig, JobProgress,
)
from mcl_api.config import Settings


async def run_recon_pipeline(ctx: dict, job_id: str, workspace_id: str, config: dict):
    """ARQ job: run full recon pipeline.

    Steps:
    1. Load workspace credentials from Postgres
    2. Create pipeline JobConfig
    3. Run SkeletonRipperPipeline.run() with progress callback
    4. Progress callback writes to job_events table (triggers Realtime)
    5. On completion, save results to Postgres + Storage
    6. Update job status
    """
    settings = Settings()
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # Update job status
    supabase.table("jobs").update({
        "status": "running",
        "started_at": "now()",
    }).eq("id", job_id).execute()

    def on_progress(progress: JobProgress):
        """Write progress to job_events for Realtime."""
        supabase.table("job_events").insert({
            "job_id": job_id,
            "workspace_id": workspace_id,
            "event_type": "progress",
            "data": {
                "status": progress.status.value,
                "phase": progress.phase,
                "message": progress.message,
                "videos_scraped": progress.videos_scraped,
                "videos_transcribed": progress.videos_transcribed,
                "skeletons_extracted": progress.skeletons_extracted,
                "total_target": progress.total_target,
                "current_creator": progress.current_creator,
            },
        }).execute()

    try:
        # Load workspace credentials
        creds_row = supabase.table("channel_credentials") \
            .select("*").eq("workspace_id", workspace_id).execute()

        # Build pipeline config
        pipeline_config = JobConfig(
            usernames=config["usernames"],
            platform=config.get("platform", "instagram"),
            videos_per_creator=config.get("videos_per_creator", 3),
            llm_provider=config.get("llm_provider", "openai"),
            llm_model=config.get("llm_model", "gpt-4o-mini"),
            openai_api_key=_get_credential(creds_row, "openai"),
        )

        # Run pipeline (Layer 1 -- no auth, no tenancy)
        pipeline = SkeletonRipperPipeline(
            base_dir=Path(f"/tmp/mcl/{workspace_id}/recon"),
        )
        result = pipeline.run(pipeline_config, on_progress=on_progress)

        # Save results
        if result.success:
            for skeleton in result.skeletons:
                supabase.table("competitor_reels").upsert({
                    "shortcode": skeleton.get("video_id", ""),
                    "workspace_id": workspace_id,
                    "data": skeleton,
                    "handle": skeleton.get("creator_username", ""),
                }).execute()

            # Generate topics from skeletons
            brain_row = supabase.table("brains") \
                .select("data").eq("workspace_id", workspace_id).single().execute()
            brain = AgentBrain(**brain_row.data["data"])
            topics = generate_topics_from_skeletons(result.skeletons, brain)

            for topic in topics:
                supabase.table("topics").upsert({
                    "id": topic.id,
                    "workspace_id": workspace_id,
                    "data": topic.model_dump(),
                }).execute()

        # Update job
        supabase.table("jobs").update({
            "status": "complete" if result.success else "failed",
            "result": {"skeletons": len(result.skeletons), "topics": len(topics)},
            "completed_at": "now()",
        }).eq("id", job_id).execute()

    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed",
            "error": str(e),
            "completed_at": "now()",
        }).eq("id", job_id).execute()
        raise
```

### 11.4 Job Status Tracking

```
pending -> running -> complete
                   -> failed (-> retry -> running)
                   -> cancelled
```

Every status transition writes to `job_events` table, which triggers Supabase Realtime. Clients subscribe to `job_events` filtered by `job_id` for live updates.

---

## 12. AI Integration

### 12.1 Hybrid Model Architecture

MCL uses AI in two modes:

**Mode 1: Structured Generation (Pipeline Jobs)**
Used for: angle development, hook generation, script writing, brain evolution.
The pipeline sends structured prompts to the LLM and parses structured JSON output.
Provider: configurable per workspace (OpenAI, Anthropic, Google, local Ollama).
Handled by: `mcl_pipeline.recon.skeleton_ripper.llm_client.LLMClient`.

**Mode 2: Conversational Coaching (Chat)**
Used for: onboarding, interactive discovery, freeform coaching.
The API sends conversation context + system prompt to the LLM and streams the response.
Provider: configurable, default Anthropic Claude.
Handled by: `mcl_api.websocket.chat` using the provider's streaming API.

### 12.2 Prompt Template System

```yaml
# packages/pipeline/src/mcl_pipeline/prompts/templates/discover_v1.yaml
name: discover
version: "1"
description: "Multi-platform topic discovery"

system_prompt: |
  You are a content strategy AI. Your job is to discover winning content topics
  for a creator based on their brand, audience, and competitors.

  Creator identity: {identity_summary}
  Content pillars: {pillars_list}
  ICP: {icp_summary}

user_prompt_template: |
  Analyze the following competitor content data and identify {max_topics} content
  topics that would perform well for this creator.

  Competitor data:
  {competitor_data}

  Scoring criteria:
  - ICP Relevance (1-10): Does this matter to {icp_segments}?
  - Timeliness (1-10): Is this trending or evergreen?
  - Content Gap (1-10): Has the creator covered this before?
  - Proof Potential (1-10): Can the creator demonstrate expertise?

  Return a JSON array of topics matching this schema:
  {topic_schema}

required_context:
  - identity_summary
  - pillars_list
  - icp_summary
  - icp_segments
  - competitor_data
  - max_topics
  - topic_schema

output_format: json_array
output_schema: topic
```

### 12.3 Model Configuration per Workspace

No model IDs are hardcoded. Model resolution follows a 3-level cascade:

1. **Workspace override** (`workspace.settings.ai_config.model`) -- highest priority
2. **Plan-level default** (`plans.features.default_model`) -- admin-configurable
3. **System default** (`MCL_DEFAULT_ANTHROPIC_MODEL` env var, fallback: `claude-sonnet-4-6`)

When Anthropic (or any provider) ships new models, update defaults in one place: the `plans` table `features` JSONB or the environment variable. No code deploy needed.

Current system defaults (as of March 2026): `claude-sonnet-4-6` (medium), `claude-haiku-4-5` (low).

```json
{
  "ai_config": {
    "structured_generation": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "chat": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "temperature": 0.8,
      "max_tokens": 8192
    },
    "transcription": {
      "provider": "openai",
      "model": "whisper-1"
    }
  }
}
```

---

## 13. Real-time Updates

### 13.1 Supabase Realtime Channels

```typescript
// packages/web/src/hooks/useRealtime.ts
/**
 * Subscribe to real-time job events via Supabase Realtime.
 *
 * Usage:
 *   const { progress, isComplete, error } = useJobRealtime(jobId);
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useJobRealtime(jobId: string) {
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_events',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const event = payload.new
          if (event.event_type === 'progress') {
            setProgress(event.data)
          } else if (event.event_type === 'complete') {
            setIsComplete(true)
          } else if (event.event_type === 'error') {
            setError(event.data.message)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [jobId])

  return { progress, isComplete, error }
}
```

### 13.2 Real-time Subscriptions Used

| Table | Event | Use Case |
|---|---|---|
| `job_events` | INSERT | Pipeline job progress (recon, discovery, content gen) |
| `topics` | INSERT | New topics appear in discovery view |
| `hooks` | UPDATE | Hook status changes (draft -> winner) |
| `analytics_entries` | INSERT | New analytics data collected |
| `brains` | UPDATE | Brain evolution updates |

---

## 14. File Storage

### 14.1 Supabase Storage Buckets

| Bucket | Access | Content |
|---|---|---|
| `transcripts` | Private | Video transcripts (.txt) |
| `pdfs` | Private | Generated PDF exports |
| `exports` | Private | CSV/JSON data exports |
| `reports` | Private | Synthesis reports |
| `videos` | Private | Downloaded video/audio files (temporary) |

### 14.2 File Path Convention

```
{bucket}/{workspace_id}/{sub_path}

Examples:
transcripts/ws_abc123/reels/video_xyz.txt
pdfs/ws_abc123/script_20260304_001.pdf
reports/ws_abc123/recon/sr_abc123_synthesis.json
```

### 14.3 Storage Service

```python
# packages/api/src/mcl_api/services/storage.py
"""Supabase Storage wrapper."""


class StorageService:
    """File storage operations via Supabase Storage.

    GVB equivalent: local file writes to data/recon/, data/pdfs/, etc.
    MCL: all files go to Supabase Storage buckets.
    """

    def __init__(self, supabase_client, workspace_id: str):
        self.client = supabase_client
        self.workspace_id = workspace_id

    def upload_transcript(self, video_id: str, content: str) -> str:
        """Upload transcript and return storage path."""
        path = f"{self.workspace_id}/reels/{video_id}.txt"
        self.client.storage.from_("transcripts").upload(path, content.encode())
        return path

    def upload_pdf(self, script_id: str, pdf_bytes: bytes) -> str:
        """Upload generated PDF and return signed URL."""
        path = f"{self.workspace_id}/{script_id}.pdf"
        self.client.storage.from_("pdfs").upload(path, pdf_bytes)
        return self.client.storage.from_("pdfs").create_signed_url(path, 3600)

    def get_transcript(self, video_id: str) -> Optional[str]:
        """Get transcript content. Returns None if not found."""
        path = f"{self.workspace_id}/reels/{video_id}.txt"
        try:
            data = self.client.storage.from_("transcripts").download(path)
            return data.decode()
        except Exception:
            return None
```

---

## 15. OpenAPI Contract

### 15.1 How It Bridges Python and TypeScript

```
FastAPI (Python)
    |
    | auto-generates at startup
    v
openapi.json (3.1 spec)
    |
    | CI/CD runs: scripts/generate-client.sh
    v
packages/web/src/api/generated/ (TypeScript)
    |
    | imported by
    v
TanStack Query hooks (packages/web/src/api/hooks.ts)
```

### 15.2 Schema Sync Guarantee

The Pydantic models in `mcl_pipeline.models` are used as FastAPI response/request models. This means the OpenAPI spec is always in sync with the pipeline's data contracts. No manual schema maintenance.

```python
# Example: topics route uses Topic model directly
from mcl_pipeline.models.topic import Topic

@router.get("/", response_model=list[Topic])
async def list_topics(...) -> list[Topic]:
    ...
```

### 15.3 Generated Client Usage

```typescript
// packages/web/src/api/hooks.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { TopicsService, Topic } from './generated'

export function useTopics(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['topics', params],
    queryFn: () => TopicsService.listTopics(params),
  })
}

export function useDevelopAngle() {
  return useMutation({
    mutationFn: (topicId: string) => TopicsService.developTopic(topicId),
    onSuccess: () => {
      // Invalidate angles list
      queryClient.invalidateQueries({ queryKey: ['angles'] })
    },
  })
}
```

---

## 16. Error Handling & Logging

### 16.1 Adapted from GVB's ReconLogger

GVB's `ReconLogger` (from `recon/utils/logger.py`) is a singleton, thread-safe logger with file rotation and structured error codes. MCL adapts this for the SaaS context.

```python
# packages/pipeline/src/mcl_pipeline/recon/utils/logger.py
"""Thread-safe logger adapted from GVB.

GVB origin: recon/utils/logger.py
Changes:
- Log output configurable: file, stdout, or callback
- Error registry exported for monitoring integration
- LogLevel enum preserved: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Error code format preserved: {CATEGORY}-{TIMESTAMP}-{HASH}
  e.g., PIPELINE-12345-AB12
"""

class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


class ReconLogger:
    """Thread-safe logger with structured error codes.

    GVB features preserved:
    - Singleton pattern via __new__
    - File rotation: max_file_size_mb=10, max_files=5
    - Error registry: {error_code -> {category, message, timestamp, data}}
    - Error code generation: {category}-{timestamp_part}-{md5_hash[:4]}

    MCL additions:
    - Optional callback for forwarding to Sentry
    - JSON-structured log entries for cloud log aggregation
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(
        self,
        log_dir: Optional[Path] = None,
        max_file_size_mb: int = 10,
        max_files: int = 5,
        on_error: Optional[Callable[[str, dict], None]] = None,  # MCL addition
    ):
        ...

    def error(self, category, message, data=None, exception=None) -> str:
        """Log error and return error code.

        Error code format: {CATEGORY}-{timestamp%100000}-{md5[:4].upper()}
        Example: PIPELINE-12345-AB12
        """
        ...

    def get_recent_errors(self, limit: int = 20) -> list:
        """Get most recent errors from registry."""
        ...
```

### 16.1a Structured JSON Logging (Production)

**Environment-aware log rendering:**
- **Development:** Human-readable console output using `structlog` console renderer (rich formatting)
- **Production:** Structured JSON to stdout, captured by the platform log aggregator, using `structlog` JSON renderer

**Mandatory fields per log entry:** `timestamp`, `level`, `request_id`, `workspace_id` (if available), `job_id` (if available), `message`, `module`

**Library:** `structlog>=23.0` (added to API dependencies)

```python
import structlog

def configure_logging(environment: str) -> None:
    """Configure structlog for dev (console) or production (JSON)."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    if environment == "production":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    )
```

**ReconLogger adaptation:** In cloud mode, `ReconLogger` delegates to `structlog` instead of file rotation. File rotation is only used in local/CLI mode.

### 16.2 API Error Responses

Every error response includes the `request_id` from LoggingMiddleware. Users can share this reference in support tickets. The frontend displays it in error toasts: "Something went wrong. Reference: abc-123-def".

```python
# Standardized error response format
{
    "error": "discovery_failed",
    "code": "PIPELINE-12345-AB12",
    "message": "Skeleton extraction failed for batch",
    "request_id": "abc-123-def",
    "details": {
        "batch_size": 4,
        "failed_video_ids": ["abc", "def"],
        "provider": "openai"
    }
}
```

### 16.3 Sentry Integration

```python
# packages/api/src/mcl_api/main.py (in create_app)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.arq import ArqIntegration

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            ArqIntegration(),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )

# Tag Sentry events with request_id (from LoggingMiddleware)
@app.middleware("http")
async def sentry_request_id_tag(request, call_next):
    with sentry_sdk.configure_scope() as scope:
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            scope.set_tag("request_id", request_id)
    return await call_next(request)
```

---

## 17. Caching Strategy

### 17.1 Redis Caches

| Cache Key Pattern | TTL | Purpose |
|---|---|---|
| `brain:{workspace_id}` | 5 min | Cached brain to avoid DB reads on every scoring call |
| `topics:{workspace_id}:{hash}` | 2 min | Cached topic list queries |
| `rate:{workspace_id}:{window}` | 1 min / 1 hr | Rate limit counters (sorted sets) |
| `job:{job_id}:progress` | 30 min | Latest job progress (avoids DB polling) |

### 17.2 Transcript Cache (from GVB)

GVB's `TranscriptCache` (from `recon/skeleton_ripper/cache.py`) uses file-based caching (`data/recon/transcripts/{video_id}.txt`). In MCL:

- **Local mode (CLI):** Same file-based cache in `~/.mcl/data/recon/transcripts/`
- **Cloud mode (SaaS):** Supabase Storage bucket `transcripts`, checked before calling Whisper API
- Cache key: `video_id` (platform-specific content ID)
- Cache hit avoids: ~$0.006/min OpenAI Whisper API cost + 30-60s transcription time

### 17.3 API Response Caching

```python
# Short-lived cache for read-heavy endpoints
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@router.get("/")
@cache(expire=120)  # 2 minutes
async def list_topics(...):
    ...
```

---

## 18. Security

### 18.1 API Key Encryption

- API keys are generated using `secrets.token_hex(32)`
- Only the SHA-256 hash is stored in `api_keys.key_hash`
- The plaintext key is shown once at creation time, then never retrievable
- Key prefix (`mcl_` + first 8 hex chars) stored separately for user identification

### 18.2 Platform Credential Storage

- Channel credentials (API keys, OAuth tokens) stored in `channel_credentials.credentials` (JSONB)
- Encrypted at rest via Supabase Vault (Postgres TDE)
- API never returns raw credentials in responses -- only `{"connected": true, "last_tested": "..."}`
- Credentials decrypted server-side only when pipeline jobs need them
- YouTube API key model:
  - Free tier: BYOK (Bring Your Own Key). User provides their own YouTube Data API key, stored encrypted in `channel_credentials`. Rate limiting is per-key (each key has its own 10K units/day ceiling).
  - Paid tier: MCL provides YouTube API access via MCL-managed keys. Usage metered per API call and billed to workspace. `key_source` column distinguishes `'byok'` from `'mcl_managed'`.
  - Quota tracked in `api_quota_usage` table per workspace + channel + day.

### 18.3 Rate Limiting

```
Free tier:    60 req/min,  1,000 req/hour
Pro tier:    300 req/min, 10,000 req/hour
Enterprise:  custom

Pipeline jobs count as:
  recon job = 5 requests
  discovery = 3 requests
  content gen = 1 request
  analytics = 3 requests
```

### 18.4 Input Validation

- All API inputs validated via Pydantic models (automatic from FastAPI)
- Maximum payload size: 1 MB
- String fields: max length enforced per schema
- File uploads: max 100 MB (video files), 10 MB (other)
- SQL injection: prevented by Supabase client (parameterized queries)
- XSS: React escapes by default, CSP headers via middleware

### 18.5 CORS

See Section 18.7 for the full CORS configuration policy.

```python
# Only allow configured origins
cors_origins = [
    "https://app.microcelebritylabs.com",  # Production
    "http://localhost:5173",                # Dev (Vite default)
]
```

### 18.6 API Versioning Policy

All REST endpoints are prefixed with `/api/v1/`. This is the canonical version prefix for the initial release.

**Version lifecycle:**

- **Current:** `/api/v1/` -- all endpoints documented in Section 4.3.
- **Breaking changes:** When a backward-incompatible change is required, a new version prefix (`/api/v2/`) is introduced. Both versions run concurrently in the same FastAPI application via separate router mounts.
- **Deprecation period:** After `/api/v2/` ships, `/api/v1/` is supported for **6 months**. During this period, sunset endpoints return a `Deprecation` response header:
  ```
  Deprecation: true
  Sunset: Sat, 01 Nov 2026 00:00:00 GMT
  Link: <https://docs.microcelebritylabs.com/api/v2/migration>; rel="successor-version"
  ```
- **Sunset:** After the 6-month deprecation window, `/api/v1/` endpoints return `410 Gone`.

**What counts as a breaking change:**
- Removing or renaming an endpoint
- Removing or renaming a required field in a request/response body
- Changing the type of an existing field
- Changing error response structure

**What does NOT require a new version:**
- Adding new optional fields to request/response bodies
- Adding new endpoints
- Adding new enum values (clients should handle unknown values gracefully)

**Implementation:**

```python
# Versioned router mounting in create_app()
v1_router = APIRouter(prefix="/api/v1")
# ... mount all v1 routes ...

# When v2 is needed:
v2_router = APIRouter(prefix="/api/v2")
# ... mount v2 routes with breaking changes ...

# Deprecation middleware for v1 endpoints after v2 ships
@app.middleware("http")
async def add_deprecation_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/v1/"):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = SUNSET_DATE
        response.headers["Link"] = (
            '<https://docs.microcelebritylabs.com/api/v2/migration>; rel="successor-version"'
        )
    return response
```

### 18.7 CORS Configuration

CORS middleware is configured in the FastAPI application factory (`create_app()` in Section 4.1) with explicit origin whitelisting, allowed methods, and headers.

**Allowed origins:**

| Environment | Origin | Purpose |
|-------------|--------|---------|
| Production | `https://app.microcelebritylabs.com` | Web dashboard |
| Development | `http://localhost:5173` | Vite dev server |

**Middleware configuration:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.microcelebritylabs.com",  # Production
        "http://localhost:5173",                 # Development (Vite)
    ],
    allow_credentials=True,   # Required for cookie-based auth if needed
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
)
```

**Notes:**
- `allow_credentials=True` enables cookie-based auth flows (e.g., Supabase session cookies) alongside Bearer token auth.
- `X-Request-Id` is included in allowed headers so clients can pass their own request IDs for correlation (see Section 4.4, LoggingMiddleware).
- Origins are loaded from `settings.cors_origins` in production, allowing environment-variable override via `MCL_CORS_ORIGINS`.
- Wildcard (`*`) origins are never used in production.

---

## 19. Deployment Architecture

### 19.1 Docker Setup

```dockerfile
# docker/Dockerfile.api
FROM python:3.11-slim

# Install system dependencies for yt-dlp and whisper
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pipeline package
COPY packages/pipeline/ /app/packages/pipeline/
RUN pip install --no-cache-dir /app/packages/pipeline/

# Install API package
COPY packages/api/ /app/packages/api/
RUN pip install --no-cache-dir /app/packages/api/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "mcl_api.main:create_app", "--host", "0.0.0.0", "--port", "8000", "--factory"]
```

```dockerfile
# docker/Dockerfile.worker
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY packages/pipeline/ /app/packages/pipeline/
RUN pip install --no-cache-dir /app/packages/pipeline/

COPY packages/api/ /app/packages/api/
RUN pip install --no-cache-dir /app/packages/api/

CMD ["arq", "mcl_api.workers.settings.WorkerSettings"]
```

### 19.2 Docker Compose (Development)

```yaml
# docker/docker-compose.dev.yml
version: "3.9"

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    ports:
      - "8000:8000"
    env_file: ../.env
    depends_on:
      - redis
    volumes:
      - ../packages:/app/packages  # Hot reload

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    env_file: ../.env
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build:
      context: ../packages/web
    ports:
      - "5173:5173"
    volumes:
      - ../packages/web/src:/app/src  # Hot reload
```

### 19.3 Recommended Production Hosting

| Service | Recommendation | Why |
|---|---|---|
| API + Worker | Railway or Render | Docker deploy, auto-scaling, easy env vars |
| Supabase | Supabase Cloud (Pro plan) | Managed Postgres, Auth, Realtime, Storage |
| Redis | Upstash Redis | Serverless, pay-per-request, ARQ compatible |
| Frontend | Vercel | Vite/React, edge CDN, zero-config |
| Monitoring | Sentry Cloud | Free tier generous for early stage |
| Analytics | PostHog Cloud | Free tier up to 1M events/month |
| Email | Resend | Simple API, generous free tier |

### 19.4 Environment Variables

```bash
# .env.example

# Supabase
MCL_SUPABASE_URL=https://xxxxx.supabase.co
MCL_SUPABASE_ANON_KEY=eyJhbGciOi...
MCL_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Redis
MCL_REDIS_URL=redis://localhost:6379

# External APIs (platform defaults -- workspaces can override)
MCL_DEFAULT_OPENAI_API_KEY=sk-xxx
MCL_DEFAULT_ANTHROPIC_API_KEY=sk-ant-xxx

# Monitoring
MCL_SENTRY_DSN=https://xxx@sentry.io/xxx
MCL_POSTHOG_API_KEY=phc_xxx

# Email
MCL_RESEND_API_KEY=re_xxx

# CORS (see Section 18.7 for full CORS policy)
MCL_CORS_ORIGINS=["https://app.microcelebritylabs.com","http://localhost:5173"]

# Web Frontend (Vite env vars must be prefixed with VITE_)
VITE_API_URL=http://localhost:8000          # Dev: http://localhost:8000  Prod: https://api.microcelebritylabs.com
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_POSTHOG_KEY=phc_xxx
```

---

## 20. GVB Code Reuse Map

Complete file-by-file mapping of what moves from GVB to MCL and what changes.

### 20.1 Direct Ports (minimal changes)

These files move with only import path changes and removal of global state:

| GVB Source | MCL Destination | Changes |
|---|---|---|
| `recon/scraper/youtube.py` | `pipeline/src/mcl_pipeline/recon/scrapers/youtube.py` | Remove global `DATA_DIR`, paths as args |
| `recon/scraper/instagram.py` | `pipeline/src/mcl_pipeline/recon/scrapers/instagram.py` | `session_dir` as constructor arg |
| `recon/scraper/downloader.py` | `pipeline/src/mcl_pipeline/recon/scrapers/downloader.py` | Remove global `DATA_DIR` |
| `recon/skeleton_ripper/pipeline.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/pipeline.py` | `base_dir`/`output_dir` injected |
| `recon/skeleton_ripper/extractor.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/extractor.py` | Import paths only |
| `recon/skeleton_ripper/synthesizer.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/synthesizer.py` | Import paths only |
| `recon/skeleton_ripper/aggregator.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/aggregator.py` | No changes (already clean) |
| `recon/skeleton_ripper/llm_client.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/llm_client.py` | `api_key` via constructor, not env |
| `recon/skeleton_ripper/prompts.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/prompts.py` | No changes (string constants) |
| `recon/skeleton_ripper/cache.py` | `pipeline/src/mcl_pipeline/recon/skeleton_ripper/cache.py` | `cache_dir` via constructor |
| `recon/utils/retry.py` | `pipeline/src/mcl_pipeline/recon/utils/retry.py` | No changes |
| `recon/storage/models.py` | `pipeline/src/mcl_pipeline/recon/storage/models.py` | Import paths only (for local mode) |
| `recon/storage/database.py` | `pipeline/src/mcl_pipeline/recon/storage/database.py` | Import paths only (for local mode) |
| `recon/tracker.py` | `pipeline/src/mcl_pipeline/recon/tracker.py` | Replace local JSON state with `recon_tracker_state` table. In cloud mode, `filter_new_content()` queries DB by `(workspace_id, platform, handle)`. Before saving a topic, check if `source.url` already exists for that workspace (duplicate prevention). `seen_urls` stored as TEXT[] column for quick lookup. |
| `recon/utils/state_manager.py` | `pipeline/src/mcl_pipeline/recon/utils/state_manager.py` | Replace file-based checkpoints with `jobs.progress` JSONB column. On job restart (auto-retry from DLQ), read checkpoint and resume from last completed stage. Stages: SCRAPING -> TRANSCRIBING -> EXTRACTING -> AGGREGATING -> SYNTHESIZING. After each stage, save intermediate results + update `jobs.progress`. |
| `skills/last30days/` (entire dir) | `pipeline/src/mcl_pipeline/skills/last30days/` | Add `__init__.py` wrapper |
| `skills/last30days/scripts/briefing.py` | `pipeline/src/mcl_pipeline/skills/last30days/briefing.py` | Direct port. Output formatting for research briefings. |

### 20.2 Significant Refactors

| GVB Source | MCL Destination | Changes |
|---|---|---|
| `recon/config.py` | `pipeline/src/mcl_pipeline/recon/config.py` | Remove global `PIPELINE_DIR`/`DATA_DIR`/`BRAIN_FILE`. `load_config()` -> `ReconConfig.from_workspace()`. `load_competitors()` -> `Competitor.from_brain_data()`. Credentials via constructor, not env/.credentials. |
| `recon/bridge.py` | `pipeline/src/mcl_pipeline/recon/bridge.py` | Brain data passed as arg, not loaded from file. Returns Pydantic `Topic` models, not dicts. No `save_topics_jsonl()` -- caller handles persistence. |
| `recon/utils/logger.py` | `pipeline/src/mcl_pipeline/recon/utils/logger.py` | Add `on_error` callback for Sentry forwarding. Log output configurable (file/stdout/callback). Singleton pattern preserved. |
| `scoring/engine.py` | `pipeline/src/mcl_pipeline/scoring/engine.py` | Remove `load_brain_context()`. All functions accept `AgentBrain` model. No file I/O. |
| `scoring/rescore.py` | `pipeline/src/mcl_pipeline/scoring/rescore.py` | Topics and brain passed as args. No `find_latest_topics_file()`. |
| `scripts/generate-pdf.py` | `pipeline/src/mcl_pipeline/content/pdf.py` | Accept Pydantic models. Return bytes, not write to disk. Remove argparse/CLI. |

### 20.3 Schema Conversions (JSON Schema -> Pydantic)

| GVB Schema | MCL Model | Key Classes |
|---|---|---|
| `schemas/agent-brain.schema.json` | `pipeline/src/mcl_pipeline/models/brain.py` | `AgentBrain`, `Identity`, `ICP`, `ContentPillar`, `Competitor`, `Cadence`, `Monetization`, `LearningWeights`, `HookPreferences`, `PerformancePatterns`, `VisualPatterns`, `PlatformConfig`, `BrainMetadata` |
| `schemas/topic.schema.json` | `pipeline/src/mcl_pipeline/models/topic.py` | `Topic`, `TopicSource`, `TopicScoring`, `CCNFit`, `CompetitorCoverage` |
| `schemas/angle.schema.json` | `pipeline/src/mcl_pipeline/models/angle.py` | `Angle`, `Contrast`, `FunnelDirection`, `CompetitorAngle` |
| `schemas/hook.schema.json` | `pipeline/src/mcl_pipeline/models/hook.py` | `Hook`, `HookScore`, `HookPerformance` |
| `schemas/script.schema.json` | `pipeline/src/mcl_pipeline/models/script.py` | `Script`, `ScriptStructure`, `OpeningHook`, `IntroFramework`, `RetentionHook`, `ScriptSection`, `CTA`, `Outro`, `FilmingCard` |
| `schemas/analytics-entry.schema.json` | `pipeline/src/mcl_pipeline/models/analytics.py` | `AnalyticsEntry`, `Metrics`, `ThumbnailAnalysis` |
| `schemas/insight.schema.json` | `pipeline/src/mcl_pipeline/models/insight.py` | `Insight` (with nested: `top_topics[]`, `hook_performance{}`, `thumbnail_patterns[]`, `content_format_performance[]`, `best_posting_times[]`, `competitor_insights[]`) |
| `schemas/swipe-hook.schema.json` | `pipeline/src/mcl_pipeline/models/swipe_hook.py` | `SwipeHook` (with nested: `engagement{}`, `visual_hook{}`) |
| `schemas/competitor-reel.schema.json` | `pipeline/src/mcl_pipeline/models/competitor_reel.py` | `CompetitorReel` (with nested: `profile{}`) |

### 20.4 Command Prompt Extractions

| GVB Command | Lines | MCL Prompt Template | MCL Python Module (non-AI logic) |
|---|---|---|---|
| `viral-setup.md` | 732 | `prompts/templates/setup_v1.yaml` | (handled by web UI flow -- no separate module) |
| `viral-onboard.md` | 270 | `prompts/templates/onboard_v1.yaml` | `brain/engine.py` -- `create_default_brain()`, `validate_brain()` |
| `viral-discover.md` | 959 | `prompts/templates/discover_v1.yaml` | `content/discover.py` -- `deduplicate_topics()`, `rank_topics()`, `merge_discovery_sources()` |
| `viral-angle.md` | 516 | `prompts/templates/angle_v1.yaml` | `content/angles.py` -- contrast formula validation, competitor angle comparison |
| `viral-script.md` | 1,247 | `prompts/templates/script_v1.yaml` | `content/hooks.py` -- `score_hook()`, `rank_hooks()`. `content/scripts.py` -- script structure validation |
| `viral-analyze.md` | 1,613 | `prompts/templates/analyze_v1.yaml` | `analytics/collector.py`, `analytics/winner_extractor.py` |
| `viral-update-brain.md` | 462 | `prompts/templates/update_brain_v1.yaml` | `brain/evolution.py` -- `BrainEvolution` class |

### 20.5 Files NOT Ported

| GVB File | Reason |
|---|---|
| `recon/web/app.py` | Replaced by FastAPI API + React dashboard |
| `recon/web/templates/*.html` | Replaced by React components |
| `recon/web/static/` | Replaced by Vite build |
| `scripts/init-viral-command.sh` | Replaced by `mcl` CLI setup commands |
| `scripts/run-recon-ui.sh` | Replaced by web dashboard |
| `scripts/setup-yt-oauth.py` | Moved to API: `POST /api/v1/channels/youtube/connect` |
| `scripts/setup-ig-token.py` | Moved to API: `POST /api/v1/channels/instagram/connect` |
| `.claude/commands/*.md` (as commands) | Extracted into prompt templates + Python modules |
| `data/*.json`, `data/*.jsonl` | Replaced by Postgres tables |
| `install.sh` | Replaced by `pip install mcl` |

### 20.6 New Code (not from GVB)

| MCL Module | Purpose |
|---|---|
| `pipeline/src/mcl_pipeline/channels/base.py` | Channel plugin abstract base classes |
| `pipeline/src/mcl_pipeline/channels/registry.py` | Channel plugin registry |
| `pipeline/src/mcl_pipeline/channels/reddit.py` | Reddit discovery channel |
| `pipeline/src/mcl_pipeline/channels/tiktok.py` | TikTok discovery channel |
| `pipeline/src/mcl_pipeline/channels/hackernews.py` | HN discovery channel |
| `pipeline/src/mcl_pipeline/channels/linkedin.py` | LinkedIn discovery channel |
| `pipeline/src/mcl_pipeline/channels/x.py` | X/Twitter discovery channel |
| `pipeline/src/mcl_pipeline/storage.py` | StorageBackend protocol + implementations |
| `pipeline/src/mcl_pipeline/prompts/registry.py` | Versioned prompt template system |
| `pipeline/src/mcl_pipeline/models/workspace.py` | Workspace config model |
| `api/` (entire package) | FastAPI application (routes, middleware, workers, WebSocket) |
| `web/` (entire package) | React dashboard |
| `cli/` (entire package) | CLI tool |
| `mcp/` (entire package) | MCP server |
| `supabase/migrations/` | Database schema + RLS policies |

---

## Appendix A: Implementation Order

Recommended build order for a solo developer or small team:

1. **Pipeline package scaffold** -- pyproject.toml, models (Pydantic from schemas), empty modules
2. **Port scoring engine** -- lowest risk, no external deps, easy to test
3. **Port recon module** -- scrapers, skeleton ripper, bridge, cache
4. **Supabase setup** -- migrations, RLS policies, storage buckets
5. **FastAPI skeleton** -- app factory, auth middleware, tenant middleware
6. **Brain routes + worker** -- simplest end-to-end: API -> DB -> Response
7. **Recon routes + worker** -- first background job: API -> ARQ -> Pipeline -> Realtime
8. **React dashboard scaffold** -- Vite, auth, workspace selection, sidebar
9. **Discovery routes + UI** -- first real page: topic list, scoring, competitor/keyword modes (Discovery page with "Discover Topics" and "Competitor Intel" tabs)
10. **Content pipeline routes + UI** -- angles, hooks, scripts, PDF export
11. **Analytics routes + UI** -- collection, winners, insights, brain evolution
12. **CLI package** -- local mode first, then cloud mode
13. **Channel plugins** -- Reddit, TikTok, HN (each is independent)
14. **MCP server** -- thin wrapper over API, last priority

---

## Appendix B: Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| JSONB columns for pipeline data | Store full JSON Schema objects as JSONB | Preserves GVB schema flexibility. Generated columns extract frequently-queried fields. Avoids 50+ normalized columns per table. |
| Composite primary keys (id + workspace_id) | Multi-tenant without UUID collision | GVB IDs like `topic_20260304_001` are workspace-scoped, not globally unique. Composite key preserves this. |
| ARQ over Celery | Simpler, async-native, Redis-only | ARQ is lighter than Celery (no separate broker), native async support matches FastAPI. |
| Supabase over raw Postgres | Auth + RLS + Realtime + Storage in one | Eliminates 4 separate services. RLS provides tenant isolation at DB level. |
| Pipeline as separate package | `pip install mcl-pipeline` | CLI can import directly (no API needed for local mode). API imports it too. Single source of truth for business logic. |
| Prompt templates as YAML | Not hardcoded in Python | Allows versioning, A/B testing, and non-developer editing without code changes. |
| Generated TypeScript client | From OpenAPI spec | Zero manual type maintenance. API changes automatically propagate to frontend. |
| PipelineConfig dependency injection | `@dataclass PipelineConfig` injected at construction | Replaces ~30 hardcoded path constants across 14 GVB files. Enables testability and dual-mode (local/SaaS) operation. |
| YouTube API BYOK + Paid Fallback | Free tier: user's key; Paid tier: MCL-managed key | Avoids shared 10K quota ceiling. Per-key rate limiting scales with user count. |

---

## Revision History

| Date | Changes | Resolution |
|------|---------|-----------|
| 2026-03-24 | Initial draft | -- |
| 2026-03-24 | **Section 3.3.1 Brain Model**: Restored GVB schema fields stripped during Pydantic conversion. `HookPreferences` now includes 6 float fields (contradiction, specificity, timeframe_tension, pov_as_advice, vulnerable_confession, pattern_interrupt). `Monetization.cta_strategy` is a structured `CTAStrategy` object (not a string). `Cadence.weekly_schedule` uses typed `WeeklySchedule` model. `VisualPatterns` includes full nested structure (top_visual_types, top_pattern_interrupts, text_overlay_colors, pacing_performance). `PerformancePatterns` adds missing fields (top_performing_formats, audience_growth_drivers, avg_ctr, view_to_follower_ratio, avg_saves, avg_shares). | Resolution 1: Pydantic Models -- Extend, Don't Replace |
| 2026-03-24 | **Section 8 (Channel Plugins), Section 9 (Data Model), Section 18 (Security)**: YouTube API architecture changed from shared MCL key to BYOK (free tier) + MCL-managed (paid tier). Keys stored encrypted in `channel_credentials` with `key_source` column. Added `api_quota_usage` table. Rate limiting is per-key, not per-platform. | Resolution 2: YouTube API -- BYOK + Paid Fallback |
| 2026-03-24 | **Section 3.2**: Added PipelineConfig dependency injection pattern. Listed all 14 GVB files and ~30 path constants requiring refactor. Added protocol interfaces (BrainLoader, CacheBackend, StorageBackend). | Resolution 4: Hardcoded Paths -> PipelineConfig |
| 2026-03-24 | **Section 9.1**: Added `updated_by UUID` to brains table, `brain_audit_log` table. **Section 9.3**: New section for optimistic locking with `jsonb_set()` section-level updates, version check, max 3 retries with exponential backoff. | Resolution 6: Brain Optimistic Locking |
| 2026-03-24 | **Section 4.5**: Replaced JWT-in-query-param with ticket-based auth. Added `POST /ws/ticket` (30s single-use tickets in Redis), GETDEL validation, connection limits (max 10/workspace), heartbeat ping/pong 30s, workspace access revalidation on each push. | Resolution 7: WebSocket Ticket Auth |
| 2026-03-24 | **Section 3.8**: Expanded `AnalyticsCollector` with Supabase Vault credentials (in-memory only), auto token refresh (3 retries + mark expired), per-video resilience, rate limit backoff, staleness detection (>7 days). | Resolution 8: Analytics Collector |
| 2026-03-24 | **Section 3.3.2**: Added `TopicStatus` and `ScriptStatus` enums as single source of truth. DB CHECK constraints generated from enums. Updated Topic and Script Pydantic models to reference enums. **Section 9.5**: New section for enum-to-CHECK generation. | Resolution 9: Status Enum Single Source of Truth |
| 2026-03-24 | **Section 8 (Instagram channel)**: Split model -- web uses Apify API, CLI uses local instaloader with TOS acknowledgment. Added `tos_accepted_at` to workspace settings. | Resolution 10: Instagram Scraping Split Model |
| 2026-03-24 | **Section 9.2**: Added `workspace_access_grants` table with 9 granular boolean permissions. Added `user_has_parent_access()` SQL function. Updated RLS policies to check grants. Added AgencyPermissions UI component description. | Resolution 11: Creator-Controlled Agency Permissions |
| 2026-03-24 | **Section 3.6**: Updated `create_default_brain()` for hybrid onboarding (quick form + AI coaching). Defined minimum viable brain fields. **Section 5.3a**: New Dashboard Home Screen section. **Section 5.2 (Pages)**: Updated Dashboard route description. | Resolution 12: Onboarding UX Hybrid Model, Resolution 13: Dashboard Home Screen |
| 2026-03-24 | **Section 5.3 (Components)**: Added WeightSliders as advanced settings feature (not main dashboard). Manual override with "Reset to AI-recommended". Overrides logged in brain_audit_log. | Resolution 14: WeightSliders Advanced Override |
| 2026-03-24 | **Section 11.3**: Added Dead Letter Queue with `dead_letter_jobs` table, auto-retry flow (15 min then 1 hour then permanent_failure + Sentry + email), ARQ `on_job_abort` hook, DLQ admin dashboard. DLQ table added to Section 9 schema and RLS. | Resolution 16: Dead Letter Queue with Auto-Retry |
| 2026-03-24 | No offline mode or `mcl sync` in v1. CLI requires internet for all operations. | Resolution 17: Offline Mode -- v1 Online Only, v2 Server-Wins Sync |
| 2026-03-24 | **Section 4.3.2**: Added `GET /workspaces/{id}/export` (GDPR ZIP), `DELETE /workspaces/{id}` soft delete with 30-day grace, `POST /account/delete`. Nightly purge job. GDPR sections 4.3.2a-c. | Resolution 18: GDPR Export/Deletion |
| 2026-03-24 | **Section 9**: Added `is_system BOOLEAN DEFAULT false` to `swipe_hooks`. ~50 curated seed hooks ship with MCL, inherited on workspace creation. Post-onboarding recon job auto-populates niche hooks. | Resolution 19: Swipe Hooks -- Seed Library + Auto Recon |
| 2026-03-24 | **Sections 4.3.3, 4.3.8, 4.3.10**: Added `DiscoverRequest`, `AnalyzeRequest`, `EvolveRequest` full request/response schemas. | Resolution 20: Discover Request Schema |
| 2026-03-24 | **Section 4.3.7**: `PATCH /scripts/{id}/publish` with `PublishRequest`. Publish flow: status->published, analytics at 48h, weekly for 90 days. Dashboard "I Published This" button. `mcl publish` CLI command added to Section 6.2. | Resolution 21: Mark as Published Flow |
| 2026-03-24 | **Section 9**: `brains` table updated to hybrid JSONB with materialized generated columns (`niche`, `primary_funnel`). One row, one query for pipeline reads; indexed columns for dashboard search. | Resolution 22: Brain Storage -- Hybrid JSONB |
| 2026-03-24 | **Section 4.3.15**: `GET /health` endpoint (status/checks/version/timestamp, 200 or 503). HEALTHCHECK in Dockerfiles (Section 19). | Resolution 23: Health Check Endpoint |
| 2026-03-24 | **Section 5.3 (Components)**: Added ScriptWizard -- 4-step guided wizard (Format Selection, Angle Selection, Hook Generation, Script Generation) with progress bar, forward/back navigation. **Section 5.4a**: New section for Long-Running Job UX (web) -- toast on start, global nav bar job indicator, slide-out job detail drawer with real-time WebSocket progress, background operation, browser notification on completion. | Resolution 29: Script Generation UX -- Web Dashboard |
| 2026-03-24 | **Section 6.2**: Added `jobs` subcommand tree (list/status/cancel). **Section 6.2a**: New section for Script Generation Interactive Flow -- sequential `questionary`-based wizard (format, angle, hooks with top-3/show-all/regenerate/combine, script, next actions). Non-interactive mode with `--format`, `--angle`, `--hook auto`, `--output`, `--no-prompt` flags. **Section 6.2b**: New section for Long-Running Job UX (CLI) -- foreground mode with live progress and `[q]` to background, `--background` flag, `mcl jobs list/status/cancel`, desktop notifications, `--no-prompt` for automation. | Resolution 29: Script Generation UX -- CLI, Resolution 30: Long-Running Job UX |
| 2026-03-24 | **Section 9.1**: Added `plans` table (admin-configurable limits, pricing, feature flags) and `workspace_usage` table (tracks consumption against plan limits). **Section 4.4**: Added `PlanLimitMiddleware` with `check_ai_limit()` and `check_pipeline_limit()` enforcement functions returning 429 with detail. **Section 4.1**: Added admin routes (`GET /admin/plans`, `PATCH /admin/plans/{id}`, `GET /admin/plans/{id}/impact`). Admin changes take effect immediately, no code deploy needed. | Resolution 24: Admin-Configurable Plan Limits |
| 2026-03-24 | **Section 9.1**: Added `recon_tracker_state` table for duplicate prevention. **Section 20.1**: Updated `recon/tracker.py` entry with cloud-mode behavior (query DB by workspace/platform/handle, check `source.url` uniqueness before saving topics). | Resolution 25: Port tracker.py -- Duplicate Prevention |
| 2026-03-24 | **Section 11.3**: Added Job Checkpoints subsection. `recon/utils/state_manager.py` ported to write checkpoints to `jobs.progress` JSONB. On DLQ auto-retry, jobs resume from last completed stage (SCRAPING -> TRANSCRIBING -> EXTRACTING -> AGGREGATING -> SYNTHESIZING). **Section 20.1**: Added `state_manager.py` to GVB Code Reuse Map. | Resolution 26: Port state_manager.py -- Job Checkpoints |
| 2026-03-24 | **Section 3.5 (LLM Providers)**: Replaced hardcoded `claude-3-sonnet-20240229` and `claude-3-haiku-20240307` with `claude-sonnet-4-6` and `claude-haiku-4-5`. Updated Gemini models. **Section 12.3**: Added 3-level model resolution cascade (workspace override -> plan default -> system default). No hardcoded model IDs; when new models ship, update `plans.features.default_model` or env var. | Resolution 27: Configurable AI Model IDs |
| 2026-03-24 | **Section 4.4**: Added `LoggingMiddleware` definition -- generates UUID request_id, attaches to request.state, returns as X-Request-Id header, includes in all structured logs. **Section 16.2**: Error responses now include `request_id`. **Section 16.3**: Sentry events tagged with request_id. Workers log originating request_id. Frontend displays request_id in error toasts. | Resolution 28: Request ID Propagation |
| 2026-03-24 | **Section 18.6**: New section -- API Versioning Policy. All endpoints prefixed `/api/v1/`. Breaking changes get `/api/v2/` prefix. v1 supported 6 months after v2 ships. `Deprecation` response header on sunset endpoints. Defined what counts as breaking vs. non-breaking changes. | Resolution 33: API Versioning |
| 2026-03-24 | **Section 18.7**: New section -- CORS Configuration. Production whitelist `https://app.microcelebritylabs.com`, dev whitelist `http://localhost:5173`. Explicit allowed methods (GET, POST, PATCH, PUT, DELETE, OPTIONS) and headers (Authorization, Content-Type, X-Request-Id). `allow_credentials=True`. Updated `create_app()` CORS middleware in Section 4.1, Settings defaults in Section 4.2, env vars in Section 19.4, and Section 18.5 reference. | Resolution 34: CORS Configuration |
| 2026-03-24 | **Section 2 (Monorepo)**: Updated CLI `main.py` comment from "Click/Typer" to "Typer". CLI already uses Typer in Section 6.1 (`typer>=0.12`). | Resolution 38: Typer for CLI Framework |
| 2026-03-24 | **Section 2 (Monorepo)**: Added `briefing.py` to `skills/last30days/` directory tree. **Section 3.10**: Added `briefing.py` to skills directory listing. **Section 20.1**: Added `skills/last30days/scripts/briefing.py` -> `pipeline/src/mcl_pipeline/skills/last30days/briefing.py` (direct port). | Resolution 39: Port briefing.py |
| 2026-03-24 | **Section 4.4**: New subsection -- Supabase Client Split (Anon Key vs. Service Role Key). API middleware uses anon key + user JWT (RLS enforced). ARQ workers use service role key (bypasses RLS for cross-workspace operations). Service role key never exposed to client-facing code. `get_user_supabase()` and `get_worker_supabase()` factory functions documented. | Resolution 40: Service Role Key -- Split Usage |
| 2026-03-24 | **Fixes 41-59**: (1) **Section 4.3.2**: Workspace owner auto-added to `workspace_members` with `role='owner', accepted_at=now()` on creation; `workspace_members.role` CHECK now includes 'owner'; added `accepted_at` column. (2) **Section 9.1**: Added `workspace_connections` table (platform OAuth/API key storage with status, expiry, encrypted credentials). Added `subscriptions` table (Stripe billing with plan_id, status, period tracking). RLS enabled for both. (3) **Section 4.3.3**: Added `audience_blockers` and `content_jobs` to brain section update allowed names. Added `GET /brain/evolve/preview` and `POST /brain/evolve/apply` endpoints with section-level approve/reject. (4) **Section 16.1a**: New subsection for structured JSON logging -- `structlog` with JSON renderer in production, console renderer in dev. Mandatory fields: timestamp, level, request_id, workspace_id, job_id, message, module. ReconLogger delegates to structlog in cloud mode. (5) **Section 5.5**: Updated `generate-client.sh` to generate offline spec committed to `docs/api/openapi.json`. (6) **Section 5.2**: Merged Recon page into Discovery page -- two tabs: "Discover Topics" and "Competitor Intel". Removed separate `/recon` route. (7) **Section 19.4**: Added `VITE_API_URL` and `VITE_SUPABASE_*` to `.env.example`. (8) Stripe webhook handler endpoint documented for subscription lifecycle events. | Fixes 41-59 |
| 2026-03-24 | Final consistency fixes -- 17 issues resolved from post-resolution review. Standardized `brains` table name, `agency` plan tier, `deleted_at` on workspaces, `owner` in RLS write policies, RLS on `workspace_access_grants` and `prompt_templates`, `PlatformConfig` forward reference resolved, `UNIQUE(workspace_id)` on subscriptions, duplicate `dead_letter_jobs` removed, API routes workspace-nested, pipeline diagram standardized to 5 stages, WebSocket paths unified to `/ws/pipeline/{job_id}` and `/ws/chat`, `AgentBrain` model gains `audience_blockers` and `content_jobs`, health check status standardized to `healthy/degraded/unhealthy`. | Post-Resolution Review Fixes 1-17 |
