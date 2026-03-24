# Microcelebrity Labs (MCL) -- Implementation Plan

**Version:** 1.0.0
**Date:** 2026-03-24
**Status:** Draft
**Origin:** Spinoff from Go Viral Bitch (GVB) at `/Users/yogi/content-scale/goviralbitch/`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [GVB Source Mapping](#gvb-source-mapping)
4. [Phase 0: Project Scaffolding (Week 1)](#phase-0-project-scaffolding-week-1)
5. [Phase 1: Pipeline Package (Week 1-2)](#phase-1-pipeline-package-week-1-2)
6. [Phase 2: Database & Auth (Week 2)](#phase-2-database--auth-week-2)
7. [Phase 3: FastAPI Backend (Week 2-3)](#phase-3-fastapi-backend-week-2-3)
8. [Phase 4: Web Dashboard (Week 3-4)](#phase-4-web-dashboard-week-3-4)
9. [Phase 5: CLI (Week 4)](#phase-5-cli-week-4)
10. [Phase 6: Platform Channels (Week 4-5)](#phase-6-platform-channels-week-4-5)
11. [Phase 7: Polish & Launch Prep (Week 5-6)](#phase-7-polish--launch-prep-week-5-6)
12. [Phase 8: Beta Launch](#phase-8-beta-launch)
13. [V2 Roadmap -- Deferred Features](#v2-roadmap----deferred-features)

---

## Architecture Overview

```
                                +-----------------+
                                |   Vite + React  |
                                | (packages/web)  |
                                +--------+--------+
                                         |
                                   REST / WS
                                         |
+-------------+              +-----------+-----------+              +----------+
|  mcl CLI    |---REST/WS--->|     FastAPI           |<------------>| Supabase |
|(packages/cli)|             |   (packages/api)      |              | Postgres |
+-------------+              +-----------+-----------+              +----------+
                                         |                               |
                              +----------+----------+                    |
                              |  ARQ Worker         |                    |
                              | (packages/worker)   |                    |
                              +----------+----------+                    |
                                         |                               |
                              +----------+----------+                    |
                              |  mcl-pipeline       |<---Supabase SDK---+
                              | (packages/pipeline) |
                              +-----+-----+--------+
                                    |     |
                      +-------------+     +-------------+
                      |                                 |
               +------+------+                  +-------+-------+
               |  Channel    |                  | Recon /       |
               |  Plugins    |                  | Scoring /     |
               |  (YT, IG,   |                  | Skills        |
               |   Reddit)   |                  |               |
               +-------------+                  +---------------+
```

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Pipeline Core | Python package (`mcl-pipeline`) | GVB code wrapped as importable library |
| API | FastAPI | Thin orchestration layer over pipeline |
| Frontend | Vite + React + TypeScript + shadcn/ui | SPA dashboard |
| Database | Supabase (Postgres + Auth + RLS + Realtime + Storage) | Multi-tenant data layer |
| Background Jobs | ARQ + Redis | Async pipeline execution |
| CLI | Python package (`mcl`) | Developer/power-user interface |
| Marketing | Framer/Webflow | Separate, not in this plan |

---

## Monorepo Structure

```
/Users/yogi/mcl/
├── packages/
│   ├── pipeline/                          # GVB -> MCL pipeline (Python package)
│       ├── mcl_pipeline/
│       │   ├── __init__.py
│       │   ├── channels/
│       │   │   ├── __init__.py
│       │   │   ├── base.py               # DiscoverChannel, PublishChannel, AnalyzeChannel ABCs
│       │   │   ├── registry.py           # Config-driven channel registry
│       │   │   ├── youtube.py            # FROM GVB: recon/scraper/youtube.py
│       │   │   ├── instagram.py          # FROM GVB: recon/scraper/instagram.py
│       │   │   └── reddit.py             # New: Reddit channel
│       │   ├── recon/
│       │   │   ├── __init__.py           # FROM GVB: recon/__init__.py
│       │   │   ├── config.py             # FROM GVB: recon/config.py (refactored)
│       │   │   ├── bridge.py             # FROM GVB: recon/bridge.py (refactored)
│       │   │   ├── tracker.py            # FROM GVB: recon/tracker.py (refactored)
│       │   │   ├── scraper/
│       │   │   │   ├── __init__.py
│       │   │   │   ├── youtube.py        # FROM GVB: recon/scraper/youtube.py
│       │   │   │   ├── instagram.py      # FROM GVB: recon/scraper/instagram.py
│       │   │   │   └── downloader.py     # FROM GVB: recon/scraper/downloader.py
│       │   │   ├── skeleton_ripper/
│       │   │   │   ├── __init__.py
│       │   │   │   ├── pipeline.py       # FROM GVB: recon/skeleton_ripper/pipeline.py
│       │   │   │   ├── extractor.py      # FROM GVB: recon/skeleton_ripper/extractor.py
│       │   │   │   ├── synthesizer.py    # FROM GVB: recon/skeleton_ripper/synthesizer.py
│       │   │   │   ├── aggregator.py     # FROM GVB: recon/skeleton_ripper/aggregator.py
│       │   │   │   ├── llm_client.py     # FROM GVB: recon/skeleton_ripper/llm_client.py
│       │   │   │   ├── prompts.py        # FROM GVB: recon/skeleton_ripper/prompts.py
│       │   │   │   └── cache.py          # FROM GVB: recon/skeleton_ripper/cache.py (Redis)
│       │   │   ├── storage/
│       │   │   │   ├── __init__.py
│       │   │   │   ├── models.py         # FROM GVB: recon/storage/models.py (Supabase)
│       │   │   │   └── database.py       # FROM GVB: recon/storage/database.py (Supabase)
│       │   │   └── utils/
│       │   │       ├── __init__.py
│       │   │       ├── logger.py         # FROM GVB: recon/utils/logger.py
│       │   │       ├── retry.py          # FROM GVB: recon/utils/retry.py
│       │   │       └── state_manager.py  # FROM GVB: recon/utils/state_manager.py
│       │   ├── scoring/
│       │   │   ├── __init__.py
│       │   │   ├── engine.py             # FROM GVB: scoring/engine.py
│       │   │   └── rescore.py            # FROM GVB: scoring/rescore.py
│       │   ├── prompts/
│       │   │   ├── __init__.py
│       │   │   ├── onboard.py            # FROM GVB: .claude/commands/viral-onboard.md
│       │   │   ├── discover.py           # FROM GVB: .claude/commands/viral-discover.md
│       │   │   ├── angle.py              # FROM GVB: .claude/commands/viral-angle.md
│       │   │   ├── script.py             # FROM GVB: .claude/commands/viral-script.md
│       │   │   ├── analyze.py            # FROM GVB: .claude/commands/viral-analyze.md
│       │   │   └── update_brain.py       # FROM GVB: .claude/commands/viral-update-brain.md
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── brain.py              # FROM GVB: schemas/agent-brain.schema.json
│       │   │   ├── topic.py              # FROM GVB: schemas/topic.schema.json
│       │   │   ├── angle.py              # FROM GVB: schemas/angle.schema.json
│       │   │   ├── hook.py               # FROM GVB: schemas/hook.schema.json
│       │   │   ├── script.py             # FROM GVB: schemas/script.schema.json
│       │   │   ├── analytics.py          # FROM GVB: schemas/analytics-entry.schema.json
│       │   │   ├── insight.py            # FROM GVB: schemas/insight.schema.json
│       │   │   ├── swipe_hook.py         # FROM GVB: schemas/swipe-hook.schema.json
│       │   │   └── competitor_reel.py    # FROM GVB: schemas/competitor-reel.schema.json
│       │   ├── skills/
│       │   │   ├── __init__.py
│       │   │   └── last30days/           # FROM GVB: skills/last30days/ (full directory)
│       │   │       ├── __init__.py       # wraps last30days.py main() as research_topic()
│       │   │       ├── scripts/
│       │   │       │   ├── last30days.py    # main entry point (1200 lines)
│       │   │       │   ├── briefing.py      # output formatting
│       │   │       │   ├── store.py         # SQLite research accumulator (654 lines)
│       │   │       │   ├── watchlist.py     # topic watchlist (296 lines)
│       │   │       │   └── lib/
│       │   │       │       ├── env.py           # config/environment (276 lines)
│       │   │       │       ├── score.py         # scoring weights (372 lines)
│       │   │       │       ├── schema.py        # data schemas (403 lines)
│       │   │       │       ├── render.py        # output rendering (491 lines)
│       │   │       │       ├── ui.py            # terminal UI (455 lines)
│       │   │       │       ├── youtube_yt.py    # YouTube research (375 lines)
│       │   │       │       ├── openai_reddit.py # Reddit via OpenAI (378 lines)
│       │   │       │       ├── xai_x.py         # X/Twitter research (217 lines)
│       │   │       │       ├── bird_x.py        # X/Twitter alt (435 lines)
│       │   │       │       ├── reddit_enrich.py # Reddit enrichment (256 lines)
│       │   │       │       ├── brave_search.py  # Brave web search (213 lines)
│       │   │       │       ├── openrouter_search.py # OpenRouter search (216 lines)
│       │   │       │       ├── websearch.py     # Web search (401 lines)
│       │   │       │       ├── normalize.py     # Data normalization (205 lines)
│       │   │       │       ├── entity_extract.py # Entity extraction
│       │   │       │       ├── models.py        # Data models
│       │   │       │       ├── http.py          # HTTP utilities
│       │   │       │       └── dates.py         # Date utilities
│       │   │       ├── tests/
│       │   │       ├── fixtures/
│       │   │       ├── agents/
│       │   │       ├── SKILL.md
│       │   │       ├── SPEC.md
│       │   │       └── README.md
│       │   └── data/
│       │       └── cta_templates.json    # FROM GVB: data/cta-templates.json
│       ├── pyproject.toml
│       └── tests/
│           ├── __init__.py
│           ├── conftest.py
│           ├── test_schemas.py
│           ├── test_scoring.py
│           ├── test_bridge.py
│           ├── test_tracker.py
│           ├── test_cache.py
│           ├── test_channels.py
│           └── test_prompts.py
│   ├── api/                              # Layer 2: FastAPI application
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                   # FastAPI app factory
│   │   │   ├── config.py                 # Settings via pydantic-settings
│   │   │   ├── deps.py                   # Dependency injection (Supabase client, Redis, etc.)
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py               # POST /auth/signup, /auth/login, /auth/api-key
│   │   │   │   ├── workspaces.py         # CRUD for workspaces
│   │   │   │   ├── brain.py              # GET/PUT /workspaces/{id}/brain
│   │   │   │   ├── topics.py             # CRUD for topics
│   │   │   │   ├── angles.py             # CRUD for angles
│   │   │   │   ├── hooks.py              # CRUD for hooks
│   │   │   │   ├── scripts.py            # CRUD for scripts
│   │   │   │   ├── analytics.py          # CRUD for analytics entries
│   │   │   │   ├── recon.py              # Trigger recon jobs, get reports
│   │   │   │   ├── pipeline.py           # Trigger pipeline stages
│   │   │   │   ├── chat.py               # AI chat endpoint (WebSocket)
│   │   │   │   └── health.py             # GET /health
│   │   │   ├── middleware/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py               # JWT / API key verification
│   │   │   │   ├── tenancy.py            # Workspace ID extraction + RLS
│   │   │   │   └── rate_limit.py         # Token bucket rate limiting
│   │   │   ├── jobs/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── discover.py           # ARQ task: run discovery
│   │   │   │   ├── recon.py              # ARQ task: run skeleton ripper
│   │   │   │   ├── angle.py              # ARQ task: generate angles
│   │   │   │   ├── script.py             # ARQ task: generate scripts
│   │   │   │   ├── analyze.py            # ARQ task: run analytics
│   │   │   │   └── rescore.py            # ARQ task: rescore topics
│   │   │   └── websocket/
│   │   │       ├── __init__.py
│   │   │       └── manager.py            # WebSocket connection manager
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   ├── web/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── api/
│   │   │   │   ├── client.ts             # Auto-generated OpenAPI client
│   │   │   │   ├── supabase.ts           # Supabase client init
│   │   │   │   └── hooks.ts              # React Query hooks
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Onboarding.tsx        # Wizard: identity, ICP, pillars, etc.
│   │   │   │   ├── Dashboard.tsx         # Overview: brain summary + recent activity
│   │   │   │   ├── Discovery.tsx         # Two tabs: "Discover Topics" + "Competitor Intel"
│   │   │   │   ├── Angles.tsx            # Angle workshop with contrast formula
│   │   │   │   ├── Scripts.tsx           # Script editor + filming cards
│   │   │   │   ├── Analytics.tsx         # Performance charts + insights
│   │   │   │   ├── Settings.tsx          # Workspace, API keys, channels
│   │   │   │   └── Chat.tsx             # AI coaching chat
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # shadcn/ui components
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── Layout.tsx
│   │   │   │   ├── brain/
│   │   │   │   │   ├── BrainSummary.tsx
│   │   │   │   │   └── BrainEditor.tsx
│   │   │   │   ├── topics/
│   │   │   │   │   ├── TopicCard.tsx
│   │   │   │   │   ├── TopicScoring.tsx
│   │   │   │   │   └── TopicList.tsx
│   │   │   │   ├── angles/
│   │   │   │   │   ├── ContrastEditor.tsx
│   │   │   │   │   └── AngleCard.tsx
│   │   │   │   ├── scripts/
│   │   │   │   │   ├── ScriptEditor.tsx
│   │   │   │   │   ├── FilmingCards.tsx
│   │   │   │   │   └── BeatTimeline.tsx
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── PerformanceChart.tsx
│   │   │   │   │   └── InsightCard.tsx
│   │   │   │   └── chat/
│   │   │   │       ├── ChatWindow.tsx
│   │   │   │       └── MessageBubble.tsx
│   │   │   ├── lib/
│   │   │   │   ├── utils.ts
│   │   │   │   └── constants.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   └── package.json
│   ├── cli/
│   │   ├── mcl_cli/
│   │   │   ├── __init__.py
│   │   │   ├── __main__.py
│   │   │   ├── auth.py                   # API key management
│   │   │   ├── config.py                 # CLI config (~/.mcl/config.toml)
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── onboard.py            # mcl onboard
│   │   │   │   ├── discover.py           # mcl discover [--competitors|--keywords|--all]
│   │   │   │   ├── angle.py              # mcl angle <topic_id>
│   │   │   │   ├── script.py             # mcl script <angle_id> [--longform|--shortform]
│   │   │   │   ├── analyze.py            # mcl analyze
│   │   │   │   ├── recon.py              # mcl recon <handle> [--videos=N]
│   │   │   │   ├── brain.py              # mcl brain [show|edit|export]
│   │   │   │   └── status.py             # mcl status
│   │   │   └── output.py                 # Rich console output formatting
│   │   └── pyproject.toml
│   └── worker/
│       ├── worker/
│       │   ├── __init__.py
│       │   ├── main.py                   # ARQ worker entrypoint
│       │   └── settings.py               # Worker config
│       ├── pyproject.toml
│       └── Dockerfile
├── infra/
│   ├── supabase/
│   │   ├── config.toml
│   │   └── migrations/
│   │       ├── 20260324000001_initial_schema.sql
│   │       ├── 20260324000002_rls_policies.sql
│   │       └── 20260324000003_seed_data.sql
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── docs/
│   └── specs/
│       └── IMPLEMENTATION-PLAN.md         # This file
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── pyproject.toml                         # Root workspace config
├── .gitignore
├── .env.example
└── README.md
```

---

## GVB Source Mapping

This section maps every GVB source file to its MCL destination and describes the required changes.

### Legend
- **as-is**: Copy with minimal import path changes
- **refactor**: Significant structural changes needed
- **rewrite**: Keep logic, rewrite interface

### Python Modules

| GVB Source | MCL Destination | Migration Type | Key Changes |
|-----------|----------------|---------------|-------------|
| `recon/__init__.py` | `packages/pipeline/mcl_pipeline/recon/__init__.py` | as-is | Update import paths from `recon.` to `mcl_pipeline.recon.` |
| `recon/config.py` | `packages/pipeline/mcl_pipeline/recon/config.py` | refactor | Remove `PIPELINE_DIR` / `DATA_DIR` / `BRAIN_FILE` filesystem reads. Accept config via constructor injection. `ReconConfig` becomes Pydantic model. `load_config()` becomes `ReconConfig.from_workspace(workspace_id, supabase_client)`. |
| `recon/bridge.py` | `packages/pipeline/mcl_pipeline/recon/bridge.py` | refactor | Remove `save_topics_jsonl()` file writes -- return `list[Topic]` instead. Remove `load_brain_pillars()` / `load_brain_learning_weights()` filesystem reads -- accept as parameters. `generate_topics_from_skeletons(skeletons, brain: AgentBrain) -> list[Topic]` |
| `recon/tracker.py` | `packages/pipeline/mcl_pipeline/recon/tracker.py` | refactor | Replace `STATE_FILE` JSON reads/writes with Supabase `recon_tracker_state` table (columns: workspace_id, platform, handle, last_content_id, last_checked_at, seen_urls TEXT[]). `filter_new_content()` queries DB by `(workspace_id, platform, handle)` instead of dict. Before saving a topic, check if `source.url` already exists for that workspace (duplicate prevention). `get_stale_competitors()` accepts brain data as param instead of reading file. |
| `recon/scraper/youtube.py` | `packages/pipeline/mcl_pipeline/recon/scraper/youtube.py` | as-is | Add `workspace_id: str` parameter to `get_channel_videos()` and `save_channel_data()`. Replace `DATA_DIR` with injected path. Keep yt-dlp subprocess calls unchanged. |
| `recon/scraper/instagram.py` | `packages/pipeline/mcl_pipeline/recon/scraper/instagram.py` | refactor | **Split model:** Web mode uses Apify API (MCL never scrapes Instagram directly from server). CLI mode uses local instaloader with user's own session. Add `mode: Literal["web", "cli"]` to constructor. Web mode requires `apify_api_key` credential. CLI mode requires `tos_accepted_at` in workspace settings. Add `workspace_id: str` parameter. Replace `DATA_DIR` with injected path. |
| `recon/scraper/downloader.py` | `packages/pipeline/mcl_pipeline/recon/scraper/downloader.py` | as-is | Replace `DATA_DIR` with injected temp directory. `transcribe_video_openai()`, `transcribe_video_local()`, `download_direct()` are pure functions -- no changes needed beyond import paths. |
| `recon/skeleton_ripper/pipeline.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/pipeline.py` | refactor | `SkeletonRipperPipeline.__init__()` accepts `cache: TranscriptCache` and `storage_backend` instead of hardcoded paths. `_save_outputs()` returns data dict instead of writing files (caller decides storage). `JobConfig`, `JobProgress`, `JobResult` become Pydantic models. |
| `recon/skeleton_ripper/extractor.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/extractor.py` | as-is | Only import path changes. `BatchedExtractor`, `ExtractionResult`, `BatchExtractionResult` keep their logic. |
| `recon/skeleton_ripper/synthesizer.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/synthesizer.py` | as-is | Only import path changes. `PatternSynthesizer`, `SynthesisResult`, `generate_report()` keep their logic. |
| `recon/skeleton_ripper/aggregator.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/aggregator.py` | as-is | Pure data transformation -- no changes needed. `SkeletonAggregator`, `AggregatedData`, `CreatorStats` stay as-is. |
| `recon/skeleton_ripper/llm_client.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/llm_client.py` | as-is | `LLMClient` with PROVIDERS dict stays unchanged. Add API key injection via constructor param instead of env-only. |
| `recon/skeleton_ripper/prompts.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/prompts.py` | as-is | No changes. `SKELETON_EXTRACT_BATCH_PROMPT`, `SKELETON_SYNTHESIS_SYSTEM_PROMPT`, all helpers stay. |
| `recon/skeleton_ripper/cache.py` | `packages/pipeline/mcl_pipeline/recon/skeleton_ripper/cache.py` | rewrite | Replace file-based `TranscriptCache` with Redis-backed implementation. Keep same interface: `get(platform, username, video_id)`, `set(...)`, `exists(...)`, `clear_all()`, `get_stats()`. Use `redis.asyncio` for async support. Keep `is_valid_transcript()` as-is (pure function). |
| `recon/storage/models.py` | `packages/pipeline/mcl_pipeline/recon/storage/models.py` | rewrite | Replace SQLite CRUD (`Asset.create()`, `Asset.get()`, `Asset.list()`, `Asset.search()`, `Collection` CRUD) with Supabase client calls. `Asset` and `Collection` become Pydantic models with class methods that use `supabase.table("assets")` instead of raw SQL. Remove FTS -- use Supabase full-text search. |
| `recon/storage/database.py` | `packages/pipeline/mcl_pipeline/recon/storage/database.py` | rewrite | Remove SQLite entirely. Replace with Supabase connection factory: `get_supabase_client(url, key) -> Client`. Remove `SCHEMA_SQL` -- schema lives in Supabase migrations. Keep `db_transaction()` as context manager using Supabase RPC for transactions. |
| `recon/utils/logger.py` | `packages/pipeline/mcl_pipeline/recon/utils/logger.py` | as-is | Keep `ReconLogger` singleton with file rotation. Add optional Sentry integration: `if sentry_dsn: sentry_sdk.capture_exception()` in `error()` and `critical()` methods. |
| `recon/utils/retry.py` | `packages/pipeline/mcl_pipeline/recon/utils/retry.py` | as-is | No changes. `retry_with_backoff`, `network_retry`, `api_retry` stay as-is. |
| `recon/utils/state_manager.py` | `packages/pipeline/mcl_pipeline/recon/utils/state_manager.py` | refactor | Replace file-based state with `jobs.progress` JSONB column. Checkpoint stages: SCRAPING -> TRANSCRIBING -> EXTRACTING -> AGGREGATING -> SYNTHESIZING. After each stage, save intermediate results + update `jobs.progress`. On job restart (auto-retry from DLQ), read checkpoint and resume from last completed stage. `save_checkpoint(job_id, stage, intermediate_results, db)` and `load_checkpoint(job_id, db)` replace file-based `save_job_state()`/`load_job_state()`. |
| `scoring/engine.py` | `packages/pipeline/mcl_pipeline/scoring/engine.py` | refactor | Remove `BRAIN_FILE` filesystem read. `load_brain_context()` becomes `build_brain_context(brain: AgentBrain) -> dict` accepting Pydantic model. All scoring functions (`score_topic`, `score_icp_relevance`, `score_content_gap`, `score_proof_potential`, `apply_competitor_bonuses`, `calculate_weighted_total`) keep their logic but accept `brain_ctx` as param instead of loading from file. |
| `scoring/rescore.py` | `packages/pipeline/mcl_pipeline/scoring/rescore.py` | refactor | `rescore_topics(topics: list[Topic], brain: AgentBrain) -> list[Topic]` accepts data instead of reading files. Remove CLI main block. Return modified list instead of writing to file. |
| `skills/last30days/` | `packages/pipeline/mcl_pipeline/skills/last30days/` | refactor | Port full directory. Replace file-based storage with return values. `last30days.py` main logic becomes `async def research_topic(topic: str, config: ResearchConfig) -> ResearchResult`. Keep all lib/ modules (`brave_search.py`, `openai_reddit.py`, `reddit_enrich.py`, etc.) as-is with import path updates. |
| `skills/last30days/scripts/briefing.py` | `packages/pipeline/mcl_pipeline/skills/last30days/briefing.py` | direct port | Output formatting for research briefings. Import path updates only. |
| `scripts/generate-pdf.py` | `packages/pipeline/mcl_pipeline/pdf/generator.py` | refactor | Remove CLI main block. `generate_script_pdf(script: Script, brain: AgentBrain) -> bytes` returns PDF bytes instead of writing file. Caller uploads to Supabase Storage. Keep all ReportLab logic. |
| `scripts/fetch-yt-analytics.py` | `packages/pipeline/mcl_pipeline/analytics/youtube_analytics.py` | rewrite | Port YouTube Analytics API collection to `AnalyticsCollector` pattern. Credentials from Supabase Vault. Auto token refresh. Per-video resilience. Rate limit backoff. |
| `scripts/fetch-ig-insights.py` | `packages/pipeline/mcl_pipeline/analytics/instagram_insights.py` | rewrite | Port Instagram Graph API insights collection to `AnalyticsCollector` pattern. Credentials from Supabase Vault. Auto token refresh. Staleness detection (>7 days triggers auto-refresh). |
| `data/cta-templates.json` | `packages/pipeline/mcl_pipeline/data/cta_templates.json` | as-is | No changes. Bundled as package data. |

### Schema Migration (JSON Schema -> Pydantic)

| GVB Schema | MCL Pydantic Module | Lines | Key Models |
|-----------|-------------------|-------|-----------|
| `schemas/agent-brain.schema.json` | `schemas/brain.py` | 342 | `AgentBrain`, `Identity`, `ICP`, `Pillar`, `PlatformConfig`, `Competitor`, `Cadence`, `Monetization`, `LearningWeights`, `HookPreferences`, `VisualPatterns`, `PerformancePatterns`, `AudienceBlocker`, `ContentJobs`, `BrainMetadata` |
| `schemas/topic.schema.json` | `schemas/topic.py` | 103 | `Topic`, `TopicSource`, `TopicScoring`, `CCNFit`, `CompetitorCoverage` |
| `schemas/angle.schema.json` | `schemas/angle.py` | 80 | `Angle`, `Contrast`, `FunnelDirection`, `CompetitorAngle` |
| `schemas/hook.schema.json` | `schemas/hook.py` | 104 | `Hook`, `HookScore`, `HookPerformance` |
| `schemas/script.schema.json` | `schemas/script.py` | 206 | `Script`, `ScriptStructure`, `OpeningHook`, `IntroFramework`, `RetentionHook`, `ScriptSection`, `MidCTA`, `ClosingCTA`, `Outro`, `FilmingCard`, `ShortformStructure`, `Beat`, `ShortformCTA`, `ScriptPerformance` |
| `schemas/analytics-entry.schema.json` | `schemas/analytics.py` | 85 | `AnalyticsEntry`, `AnalyticsMetrics`, `ThumbnailAnalysis`, `WinnerMetrics` |
| `schemas/insight.schema.json` | `schemas/insight.py` | 116 | `Insight`, `TopTopic`, `HookStats`, `ThumbnailPattern`, `OptimalPostingTime`, `CompetitorInsight`, `FormatPerformance` |
| `schemas/swipe-hook.schema.json` | `schemas/swipe_hook.py` | 120 | `SwipeHook`, `SwipeEngagement`, `VisualHook` |
| `schemas/competitor-reel.schema.json` | `schemas/competitor_reel.py` | 57 | `CompetitorReel`, `ReelProfile` |

### Command Prompts -> AI Templates

| GVB Command | MCL Prompt Module | Lines | Template Variables |
|------------|------------------|-------|-------------------|
| `.claude/commands/viral-onboard.md` | `prompts/onboard.py` | 270 | `brain: AgentBrain`, `is_fresh: bool` |
| `.claude/commands/viral-discover.md` | `prompts/discover.py` | 959 | `brain: AgentBrain`, `mode: DiscoveryMode`, `keywords: list[str]` |
| `.claude/commands/viral-angle.md` | `prompts/angle.py` | 516 | `brain: AgentBrain`, `topic: Topic`, `format: ContentFormat` |
| `.claude/commands/viral-script.md` | `prompts/script.py` | 1247 | `brain: AgentBrain`, `angle: Angle`, `hooks: list[Hook]`, `platform: Platform` |
| `.claude/commands/viral-analyze.md` | `prompts/analyze.py` | 1613 | `brain: AgentBrain`, `entries: list[AnalyticsEntry]`, `insights: Insight` |
| `.claude/commands/viral-update-brain.md` | `prompts/update_brain.py` | 462 | `brain: AgentBrain`, `insights: Insight`, `entries: list[AnalyticsEntry]` |

---

## Phase 0: Project Scaffolding (Week 1)

### Goal
Set up the monorepo structure, all package configurations, Docker compose for local dev, CI/CD pipeline, and initial Supabase project.

### Dependencies
- None (starting fresh)

### Acceptance Criteria
- `pip install -e packages/pipeline` works
- `docker compose up` starts Redis
- `cd packages/web && npm run dev` shows empty Vite app
- `supabase start` runs local Supabase
- CI runs linting + type checking on push
- `GET /health` endpoint returns `{"status": "healthy", "checks": {"postgres": true, "redis": true}, "version": "0.1.0", "timestamp": "..."}` (200 OK)
- Dockerfiles include `HEALTHCHECK` directives

### Task 0.1: Initialize Monorepo Root

**Files to create:**

**`/Users/yogi/mcl/pyproject.toml`** (root workspace):
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mcl-monorepo"
version = "0.1.0"
description = "Microcelebrity Labs monorepo"
requires-python = ">=3.11"

[tool.ruff]
target-version = "py311"
line-length = 120
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM"]

[tool.ruff.isort]
known-first-party = ["mcl_pipeline", "mcl_cli"]

[tool.pytest.ini_options]
testpaths = ["packages/pipeline/tests", "packages/api/tests"]
asyncio_mode = "auto"

[tool.mypy]
python_version = "3.11"
strict = true
plugins = ["pydantic.mypy"]
```

**`/Users/yogi/mcl/.gitignore`**:
```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.eggs/
*.egg
.venv/
venv/

# Node
node_modules/
packages/web/dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store

# Supabase
infra/supabase/.branches/
infra/supabase/.temp/

# Redis
dump.rdb

# Logs
*.log
logs/
```

**`/Users/yogi/mcl/.env.example`**:
```env
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Platform APIs (local/CLI mode only — in SaaS mode, keys are per-workspace BYOK or MCL-managed)
YOUTUBE_DATA_API_KEY=

# Web Frontend
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key

# Resend (transactional email)
RESEND_API_KEY=

# Sentry (optional)
SENTRY_DSN=

# PostHog (optional)
POSTHOG_API_KEY=
```

### Task 0.2: Pipeline Package Scaffold

**`/Users/yogi/mcl/packages/pipeline/pyproject.toml`**:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mcl-pipeline"
version = "0.1.0"
description = "MCL content pipeline - core library"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0",
    "requests>=2.25.0",
    "yt-dlp>=2023.0.0",
    "python-dotenv>=1.0.0",
    "redis>=5.0.0",
    "supabase>=2.0.0",
    "reportlab>=4.0.0",
    "anthropic>=0.18",
    "google-generativeai>=0.4",
    "openai>=1.12",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
    "pytest-cov>=4.0",
    "ruff>=0.1.0",
    "mypy>=1.0",
]
instagram = ["instaloader>=4.10"]
whisper = ["openai-whisper>=20231117"]

[tool.hatch.build.targets.wheel]
packages = ["mcl_pipeline"]
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/__init__.py`**:
```python
"""MCL Pipeline - Core content pipeline library."""
__version__ = "0.1.0"
```

Create empty `__init__.py` in every subdirectory:
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/scraper/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/skeleton_ripper/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/storage/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/utils/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/scoring/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/prompts/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/skills/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/skills/last30days/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/mcl_pipeline/pdf/__init__.py`
- `/Users/yogi/mcl/packages/pipeline/tests/__init__.py`

### Task 0.3: API Package Scaffold

**`/Users/yogi/mcl/packages/api/pyproject.toml`**:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mcl-api"
version = "0.1.0"
description = "MCL FastAPI backend"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic-settings>=2.0",
    "mcl-pipeline",
    "arq>=0.25",
    "redis>=5.0.0",
    "supabase>=2.0.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.27.0",
    "websockets>=12.0",
    "bcrypt>=4.0",
    "resend>=2.0",
    "structlog>=23.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
    "httpx>=0.27.0",
    "mypy>=1.0",
]
```

**`/Users/yogi/mcl/packages/api/app/main.py`** (skeleton):
```python
"""MCL API - FastAPI application factory."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    app = FastAPI(
        title="Microcelebrity Labs API",
        version="0.1.0",
        description="Content pipeline orchestration API",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes registered in Phase 3
    return app

app = create_app()
```

**`/Users/yogi/mcl/packages/api/app/config.py`**:
```python
"""Application settings via pydantic-settings."""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    redis_url: str = "redis://localhost:6379"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    youtube_data_api_key: str = ""
    resend_api_key: str = ""
    sentry_dsn: str = ""
    posthog_api_key: str = ""
    environment: str = "development"

    class Config:
        env_file = ".env"
```

**`/Users/yogi/mcl/packages/api/Dockerfile`**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY packages/pipeline /app/packages/pipeline
COPY packages/api /app/packages/api
RUN pip install --no-cache-dir /app/packages/pipeline /app/packages/api
EXPOSE 8000
CMD ["uvicorn", "mcl_api.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

**`/Users/yogi/mcl/packages/worker/Dockerfile`**:
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY packages/pipeline /app/packages/pipeline
COPY packages/api /app/packages/api
COPY packages/worker /app/packages/worker
RUN pip install --no-cache-dir /app/packages/pipeline /app/packages/api /app/packages/worker
CMD ["arq", "worker.main.WorkerSettings"]
```

### Task 0.4: Web App Scaffold

Run these commands to initialize the Vite + React + TypeScript project:

```bash
cd /Users/yogi/mcl/packages/web
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install -D openapi-typescript-codegen
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks
```

Add to `package.json` scripts: `"lint": "eslint src --ext .ts,.tsx"`.

Create `eslint.config.js` with TypeScript + React rules (extend `@typescript-eslint/recommended`, enable `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`).

**`/Users/yogi/mcl/packages/web/vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

### Task 0.5: Worker Package Scaffold

**`/Users/yogi/mcl/packages/worker/pyproject.toml`**:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mcl-worker"
version = "0.1.0"
description = "MCL ARQ background worker"
requires-python = ">=3.11"
dependencies = [
    "arq>=0.25",
    "mcl-pipeline",
    "redis>=5.0.0",
    "supabase>=2.0.0",
]
```

**`/Users/yogi/mcl/packages/worker/worker/main.py`**:
```python
"""ARQ worker entrypoint."""
from arq import create_pool
from arq.connections import RedisSettings

async def startup(ctx: dict) -> None:
    """Initialize worker context with Supabase client and pipeline."""
    pass  # Populated in Phase 3

async def shutdown(ctx: dict) -> None:
    """Cleanup on worker shutdown."""
    pass

class WorkerSettings:
    functions = []  # Populated in Phase 3
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings()
    max_jobs = 10
    job_timeout = 600  # 10 minutes
```

### Task 0.6: CLI Package Scaffold

**`/Users/yogi/mcl/packages/cli/pyproject.toml`**:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mcl"
version = "0.1.0"
description = "MCL CLI - content pipeline from your terminal"
requires-python = ">=3.11"
dependencies = [
    "mcl-pipeline",
    "typer[all]>=0.9",
    "rich>=13.0",
    "httpx>=0.27.0",
    "toml>=0.10",
]

[project.scripts]
mcl = "mcl_cli.__main__:main"
```

> **Note:** Typer is built on Click, so Click plugins and utilities remain compatible. The `typer[all]` extra includes Rich integration and shell autocompletion support.

**`/Users/yogi/mcl/packages/cli/mcl_cli/__main__.py`**:
```python
"""MCL CLI entrypoint."""
import typer

app = typer.Typer(
    name="mcl",
    help="Microcelebrity Labs - Content pipeline from your terminal.",
)


def version_callback(value: bool):
    if value:
        typer.echo("mcl 0.1.0")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(False, "--version", callback=version_callback, is_eager=True),
):
    """Microcelebrity Labs - Content pipeline from your terminal."""
    pass


if __name__ == "__main__":
    app()
```

### Task 0.7: Docker Compose

**`/Users/yogi/mcl/infra/docker-compose.yml`**:
```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  api:
    build:
      context: ../../
      dockerfile: packages/api/Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ../../.env
    depends_on:
      - redis
    volumes:
      - ../../packages/pipeline:/app/packages/pipeline
      - ../../packages/api:/app/packages/api
    command: uvicorn mcl_api.main:create_app --factory --host 0.0.0.0 --port 8000 --reload

  worker:
    build:
      context: ../../
      dockerfile: packages/worker/Dockerfile
    env_file:
      - ../../.env
    depends_on:
      - redis
    volumes:
      - ../../packages/pipeline:/app/packages/pipeline
      - ../../packages/worker:/app/packages/worker
    command: arq worker.main.WorkerSettings

volumes:
  redis-data:
```

### Task 0.8: Supabase Project Init

```bash
cd /Users/yogi/mcl/infra/supabase
npx supabase init
```

**`/Users/yogi/mcl/infra/supabase/config.toml`** (add after init):
```toml
[api]
port = 54321

[db]
port = 54322
```

### Task 0.9: CI/CD Pipeline

**`/Users/yogi/mcl/.github/workflows/ci.yml`**:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  python-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install ruff mypy
      - run: ruff check packages/
      - run: ruff format --check packages/
      - run: pip install -e "packages/pipeline[dev]" -e "packages/api[dev]"
      - run: mypy packages/api/ --strict

  python-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e "packages/pipeline[dev]" -e "packages/api[dev]"
      - run: pytest packages/pipeline/tests/ -v --cov=mcl_pipeline
      - run: pytest packages/api/tests/ -v

  web-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd packages/web && npm ci
      - run: cd packages/web && npm run lint
      - run: cd packages/web && npx tsc --noEmit

  web-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd packages/web && npm ci
      - run: cd packages/web && npm test
```

### Testing Requirements (Phase 0)
- `pip install -e packages/pipeline` completes without error
- `cd packages/web && npm run dev` starts Vite dev server on :5173
- `docker compose -f infra/docker-compose.yml up redis` starts Redis on :6379
- `python -c "from mcl_pipeline import __version__; print(__version__)"` prints `0.1.0`

---

## Phase 1: Pipeline Package (Week 1-2)

### Goal
Port all GVB code into the `mcl-pipeline` package with proper abstractions. Replace filesystem I/O with injectable dependencies. Convert JSON schemas to Pydantic models. Implement channel plugin architecture.

### Dependencies
- Phase 0 complete

### Acceptance Criteria
- All Pydantic models validate against existing GVB JSON data
- `from mcl_pipeline.schemas.brain import AgentBrain` works
- `from mcl_pipeline.scoring.engine import score_topic` works with brain param
- `from mcl_pipeline.channels.base import DiscoverChannel` provides ABC
- Redis-backed transcript cache passes all tests
- 80%+ test coverage on pipeline package

### Task 1.0: PipelineConfig Dependency Injection

**Required before any other Phase 1 task.** Create the `PipelineConfig` dataclass and its protocol interfaces. This replaces ~30 hardcoded path constants across 14 GVB files with a single injectable config object.

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/config.py`**:
```python
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
```

**GVB files requiring refactor (14 files, ~30 path constants):**

| GVB File | Path Constants to Remove |
|----------|------------------------|
| `recon/config.py` | `PIPELINE_DIR`, `DATA_DIR`, `BRAIN_FILE`, `CONFIG_FILE` |
| `recon/bridge.py` | `TOPICS_JSONL`, `BRAIN_FILE` |
| `recon/tracker.py` | `STATE_FILE`, `BRAIN_FILE` |
| `recon/scraper/youtube.py` | `DATA_DIR`, `CHANNEL_DATA_DIR` |
| `recon/scraper/instagram.py` | `DATA_DIR`, `IG_DATA_DIR` |
| `recon/scraper/downloader.py` | `DATA_DIR`, `TEMP_DIR`, `TRANSCRIPTS_DIR` |
| `recon/skeleton_ripper/pipeline.py` | `BASE_DIR`, `OUTPUT_DIR`, `CACHE_DIR` |
| `recon/skeleton_ripper/cache.py` | `CACHE_DIR`, `CACHE_FILE` |
| `recon/storage/models.py` | `DB_PATH` |
| `recon/storage/database.py` | `DB_PATH`, `SCHEMA_SQL` |
| `recon/utils/state_manager.py` | `STATE_DIR`, `STATE_FILE` |
| `recon/utils/logger.py` | `LOG_DIR`, `LOG_FILE` |
| `scoring/engine.py` | `BRAIN_FILE` |
| `scoring/rescore.py` | `TOPICS_FILE`, `BRAIN_FILE` |

Every module listed above must accept `PipelineConfig` (or a relevant subset) via constructor injection. No module reads paths from globals or environment variables.

### Task 1.1: Pydantic Schema Models

Port each JSON Schema to a Pydantic v2 model. Reference the GVB schema files listed in the GVB Source Mapping section above.

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/__init__.py`**:
```python
"""Pydantic models for all MCL data structures."""
from .brain import AgentBrain
from .topic import Topic
from .angle import Angle
from .hook import Hook
from .script import Script
from .analytics import AnalyticsEntry
from .insight import Insight
from .swipe_hook import SwipeHook
from .competitor_reel import CompetitorReel

__all__ = [
    "AgentBrain", "Topic", "Angle", "Hook", "Script",
    "AnalyticsEntry", "Insight", "SwipeHook", "CompetitorReel",
]
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/brain.py`**:
Reference GVB: `goviralbitch/schemas/agent-brain.schema.json` (342 lines)

```python
"""Agent Brain schema - central persistent memory.

Ported from GVB schemas/agent-brain.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Identity(BaseModel):
    """Creator identity and brand positioning."""
    name: str = Field(description="Creator's name")
    brand: str = Field(description="Brand name or handle")
    niche: str = Field(description="Primary content niche")
    tone: list[str] = Field(default_factory=list, description="Content tone descriptors")
    differentiator: str = Field(default="", description="What makes this creator unique")


class ICP(BaseModel):
    """Ideal Customer Profile."""
    segments: list[str] = Field(description="Audience segments")
    pain_points: list[str] = Field(description="Top pain points")
    goals: list[str] = Field(description="What the audience wants to achieve")
    platforms_they_use: list[str] = Field(default_factory=list)
    budget_range: str = Field(default="")


class Pillar(BaseModel):
    """Content pillar."""
    name: str
    description: str
    keywords: list[str] = Field(default_factory=list)


class PlatformConfig(BaseModel):
    """Platform configuration."""
    research: list[str] = Field(description="Platforms to scan for discovery")
    posting: list[str] = Field(description="Platforms the creator posts on")
    api_keys_configured: list[str] = Field(default_factory=list)


class Competitor(BaseModel):
    """Competitor to monitor."""
    name: str
    platform: str
    handle: str
    why_watch: str = Field(default="")


class WeeklySchedule(BaseModel):
    shorts_per_day: int = Field(default=2, ge=0)
    shorts_days: list[str] = Field(default_factory=list)
    longform_per_week: int = Field(default=2, ge=0)
    longform_days: list[str] = Field(default_factory=list)


class Cadence(BaseModel):
    weekly_schedule: WeeklySchedule = Field(default_factory=WeeklySchedule)
    optimal_times: dict[str, str] = Field(default_factory=dict)


class CTAStrategy(BaseModel):
    default_cta: str = Field(default="")
    lead_magnet_url: str = Field(default="")
    community_url: str = Field(default="")
    newsletter_url: str = Field(default="")
    website_url: str = Field(default="")


class Monetization(BaseModel):
    primary_funnel: str
    secondary_funnels: list[str] = Field(default_factory=list)
    cta_strategy: CTAStrategy = Field(default_factory=CTAStrategy)
    client_capture: str = Field(default="")


class LearningWeights(BaseModel):
    icp_relevance: float = Field(default=1.0, ge=0.1, le=5.0)
    timeliness: float = Field(default=1.0, ge=0.1, le=5.0)
    content_gap: float = Field(default=1.0, ge=0.1, le=5.0)
    proof_potential: float = Field(default=1.0, ge=0.1, le=5.0)


class HookPreferences(BaseModel):
    contradiction: float = Field(default=0, ge=0)
    specificity: float = Field(default=0, ge=0)
    timeframe_tension: float = Field(default=0, ge=0)
    pov_as_advice: float = Field(default=0, ge=0)
    vulnerable_confession: float = Field(default=0, ge=0)
    pattern_interrupt: float = Field(default=0, ge=0)


class VisualTypePerformance(BaseModel):
    type: str
    avg_engagement: float = 0
    sample_count: int = 0
    trend: str = "stable"  # rising | stable | declining


class VisualPatterns(BaseModel):
    top_visual_types: list[VisualTypePerformance] = Field(default_factory=list)
    top_pattern_interrupts: list[dict] = Field(default_factory=list)
    text_overlay_colors: dict[str, dict] = Field(default_factory=dict)
    pacing_performance: dict[str, dict] = Field(default_factory=dict)


class PerformancePatterns(BaseModel):
    top_performing_topics: list[str] = Field(default_factory=list)
    top_performing_formats: list[str] = Field(default_factory=list)
    audience_growth_drivers: list[str] = Field(default_factory=list)
    avg_ctr: float = Field(default=0)
    avg_retention_30s: float = Field(default=0)
    total_content_analyzed: int = Field(default=0, ge=0)
    view_to_follower_ratio: float = Field(default=0)
    avg_saves: float = Field(default=0)
    avg_shares: float = Field(default=0)


class AudienceBlocker(BaseModel):
    lie: str = Field(description="The false belief the audience holds")
    destruction: str = Field(description="How content destroys this lie")
    pillar: str = Field(description="Which content pillar addresses this")


class ContentJobs(BaseModel):
    build_trust: list[str] = Field(default_factory=list)
    demonstrate_capability: list[str] = Field(default_factory=list)
    drive_action: list[str] = Field(default_factory=list)


class EvolutionEntry(BaseModel):
    timestamp: datetime
    reason: str
    changes: list[str]


class BrainMetadata(BaseModel):
    version: str = Field(default="0.1.0", pattern=r"^\d+\.\d+\.\d+$")
    created_at: datetime
    updated_at: datetime
    last_onboard: Optional[datetime] = None
    last_analysis: Optional[datetime] = None
    evolution_log: list[EvolutionEntry] = Field(default_factory=list)


class AgentBrain(BaseModel):
    """Central brain for the MCL system. Evolving memory that all modules read."""
    identity: Identity
    icp: ICP
    pillars: list[Pillar]
    platforms: PlatformConfig
    competitors: list[Competitor]
    cadence: Cadence
    monetization: Monetization
    learning_weights: LearningWeights = Field(default_factory=LearningWeights)
    hook_preferences: HookPreferences = Field(default_factory=HookPreferences)
    visual_patterns: Optional[VisualPatterns] = None
    performance_patterns: PerformancePatterns = Field(default_factory=PerformancePatterns)
    audience_blockers: list[AudienceBlocker] = Field(default_factory=list)
    content_jobs: Optional[ContentJobs] = None
    metadata: BrainMetadata

    # MCL-specific additions (not in GVB)
    workspace_id: Optional[str] = Field(default=None, description="Supabase workspace ID")
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/topic.py`**:
Reference GVB: `goviralbitch/schemas/topic.schema.json` (103 lines)

```python
"""Topic schema - discovered content topic.

Ported from GVB schemas/topic.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TopicSource(BaseModel):
    platform: str  # youtube, instagram, tiktok, reddit, etc.
    url: str
    author: str = ""
    engagement_signals: str = ""


class CCNFit(BaseModel):
    """Core/Casual/New audience fit."""
    core: bool = False
    casual: bool = False
    new_audience: bool = False
    pass_: bool = Field(default=False, alias="pass")

    class Config:
        populate_by_name = True


class TopicScoring(BaseModel):
    icp_relevance: int = Field(ge=1, le=10)
    timeliness: int = Field(ge=1, le=10)
    content_gap: int = Field(ge=1, le=10)
    proof_potential: int = Field(ge=1, le=10)
    total: int = Field(ge=4, le=40)
    weighted_total: float
    ccn_fit: Optional[CCNFit] = None


class CompetitorCoverage(BaseModel):
    competitor: str = ""
    url: str = ""
    performance: str = ""


class Topic(BaseModel):
    """A discovered topic scored against the creator's ICP."""
    id: str
    title: str
    description: str = ""
    source: TopicSource
    discovered_at: datetime
    scoring: TopicScoring
    pillars: list[str] = Field(default_factory=list)
    competitor_coverage: list[CompetitorCoverage] = Field(default_factory=list)
    status: str = Field(default="new")  # new | developing | scripted | passed
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/angle.py`**:
Reference GVB: `goviralbitch/schemas/angle.schema.json` (80 lines)

```python
"""Angle schema - content angle via Contrast Formula.

Ported from GVB schemas/angle.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Contrast(BaseModel):
    common_belief: str = Field(description="What the audience currently believes")
    surprising_truth: str = Field(description="The insight that changes thinking")
    contrast_strength: str = Field(description="mild | moderate | strong | extreme")


class FunnelDirection(BaseModel):
    cta_type: str = ""  # community | lead_magnet | newsletter | website | dm | booking | product
    cta_copy: str = ""
    monetization_tie: str = ""


class CompetitorAngle(BaseModel):
    competitor: str = ""
    their_angle: str = ""
    differentiation: str = ""


class Angle(BaseModel):
    """Content angle developed via the Contrast Formula."""
    id: str
    topic_id: str
    format: str  # longform | shortform | linkedin
    title: str = ""
    contrast: Contrast
    target_audience: str = ""
    pain_addressed: str = ""
    proof_method: str = ""
    funnel_direction: Optional[FunnelDirection] = None
    competitor_angles: list[CompetitorAngle] = Field(default_factory=list)
    content_job: str = ""  # build_trust | demonstrate_capability | drive_action
    blocker_destroyed: str = ""
    created_at: datetime
    status: str = Field(default="draft")  # draft | approved | scripted | passed
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/hook.py`**:
Reference GVB: `goviralbitch/schemas/hook.schema.json` (104 lines)

```python
"""Hook schema - generated hooks from content angles.

Ported from GVB schemas/hook.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HookScore(BaseModel):
    contrast_fit: float = Field(ge=0, le=10)
    pattern_strength: float = Field(ge=0, le=10)
    platform_fit: float = Field(ge=0, le=10)
    composite: float = Field(ge=0, le=10)


class HookPerformance(BaseModel):
    ctr: Optional[float] = None
    retention_30s: Optional[float] = None
    engagement_rate: Optional[float] = None
    analyzed_at: Optional[datetime] = None


class Hook(BaseModel):
    """Content hook using one of 6 proven patterns."""
    id: str
    angle_id: str
    platform: str  # youtube_longform | youtube_shorts | instagram_reels | tiktok | linkedin
    pattern: str  # contradiction | specificity | timeframe_tension | pov_as_advice | vulnerable_confession | pattern_interrupt
    hook_text: str
    visual_cue: str = ""
    score: HookScore
    cta_pairing: str = ""
    status: str = Field(default="draft")  # draft | approved | used | winner | dud
    performance: Optional[HookPerformance] = None
    created_at: datetime
    notes: str = ""
    source: str = Field(default="original")  # original | swipe
    swipe_reference: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/script.py`**:
Reference GVB: `goviralbitch/schemas/script.schema.json` (206 lines)

```python
"""Script schema - full content scripts with filming cards.

Ported from GVB schemas/script.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OpeningHook(BaseModel):
    hook_text: str
    pattern: str
    visual_direction: str = ""


class IntroFramework(BaseModel):
    """3 P's: Proof/Promise/Plan."""
    proof: str = ""
    promise: str = ""
    plan: str = ""


class RetentionHook(BaseModel):
    text: str
    timestamp_target: str = ""
    technique: str = ""


class ScriptSection(BaseModel):
    title: str
    talking_points: list[str] = Field(default_factory=list)
    proof_element: str = ""
    transition: str = ""
    duration_estimate: str = ""


class MidCTA(BaseModel):
    text: str
    type: str = ""
    placement: str = ""


class ClosingCTA(BaseModel):
    text: str
    type: str = ""
    template_source: str = ""


class Outro(BaseModel):
    subscribe_prompt: str = ""
    next_video_tease: str = ""


class ScriptStructure(BaseModel):
    opening_hook: OpeningHook
    intro_framework: Optional[IntroFramework] = None
    retention_hook: RetentionHook
    sections: list[ScriptSection] = Field(min_length=3, max_length=5)
    mid_cta: MidCTA
    closing_cta: ClosingCTA
    outro: Outro


class FilmingCard(BaseModel):
    scene_number: int
    section_name: str
    shot_type: str  # talking_head | screen_recording | b_roll | split_screen | whiteboard
    say: list[str] = Field(default_factory=list)
    show: str = ""
    duration_estimate: str = ""
    notes: str = ""


class Beat(BaseModel):
    beat_number: int
    timestamp: str = ""
    action: str = ""
    visual: str = ""
    text_overlay: str = ""
    audio_note: str = ""


class ShortformCTA(BaseModel):
    text: str
    type: str = ""
    placement: str = ""


class ShortformStructure(BaseModel):
    beats: list[Beat] = Field(default_factory=list)
    caption: str = ""
    hashtags: list[str] = Field(default_factory=list)
    cta: ShortformCTA
    estimated_duration: str = ""


class ScriptPerformance(BaseModel):
    views: int = 0
    ctr: float = 0
    avg_view_duration: float = 0
    retention_30s: float = 0
    engagement_rate: float = 0
    analyzed_at: Optional[datetime] = None


class Script(BaseModel):
    """Full content script with filming cards."""
    id: str
    angle_id: str
    hook_ids: list[str] = Field(default_factory=list)
    platform: str  # youtube_longform | youtube_shorts | instagram_reels | tiktok | linkedin
    title: str
    script_structure: Optional[ScriptStructure] = None
    filming_cards: list[FilmingCard] = Field(default_factory=list)
    shortform_structure: Optional[ShortformStructure] = None
    estimated_duration: str = ""
    status: str = Field(default="draft")  # draft | filming | published | analyzed
    performance: Optional[ScriptPerformance] = None
    created_at: datetime
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/analytics.py`**:
Reference GVB: `goviralbitch/schemas/analytics-entry.schema.json` (85 lines)

```python
"""Analytics entry schema.

Ported from GVB schemas/analytics-entry.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AnalyticsMetrics(BaseModel):
    views: int = Field(default=0, ge=0)
    impressions: int = Field(default=0, ge=0)
    ctr: float = Field(default=0, ge=0, le=100)
    retention_30s: float = Field(default=0, ge=0, le=100)
    avg_view_duration: float = 0
    avg_view_percentage: float = Field(default=0, ge=0, le=100)
    completion_rate: float = Field(default=0, ge=0, le=100)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    shares: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    subscribers_gained: int = Field(default=0, ge=0)
    engagement_rate: float = Field(default=0, ge=0)


class ThumbnailAnalysis(BaseModel):
    url: str = ""
    text_overlay: str = ""
    emotion: str = ""
    style: str = ""
    ctr_performance: str = ""


class WinnerMetrics(BaseModel):
    threshold_used: str = ""
    percentile: float = Field(default=0, ge=0, le=100)


class AnalyticsEntry(BaseModel):
    """Per-content performance data."""
    id: str
    content_id: str
    platform: str
    published_at: Optional[datetime] = None
    analyzed_at: datetime
    days_since_publish: int = Field(default=0, ge=0)
    metrics: AnalyticsMetrics = Field(default_factory=AnalyticsMetrics)
    thumbnail: Optional[ThumbnailAnalysis] = None
    hook_pattern_used: str = ""
    topic_category: str = ""
    content_pillar: str = ""
    is_winner: bool = False
    winner_reason: str = ""
    winner_metrics: Optional[WinnerMetrics] = None
    collection_method: str = ""
    source_url: str = ""
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/insight.py`**:
Reference GVB: `goviralbitch/schemas/insight.schema.json` (116 lines)

```python
"""Insight schema - aggregated performance patterns.

Ported from GVB schemas/insight.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TopTopic(BaseModel):
    topic: str
    avg_performance: float
    content_count: int = Field(ge=1)
    best_platform: str = ""
    trend: str = "stable"  # rising | stable | declining


class HookStats(BaseModel):
    times_used: int = Field(default=0, ge=0)
    avg_ctr: float = 0
    avg_retention_30s: float = 0
    avg_engagement: float = 0
    best_platform: str = ""
    trend: str = "stable"


class ThumbnailPattern(BaseModel):
    style: str = ""
    text_approach: str = ""
    avg_ctr: float = 0
    sample_count: int = 0


class OptimalPostingTime(BaseModel):
    best_day: str = ""
    best_time: str = ""
    timezone: str = ""
    confidence: str = "low"  # low | medium | high


class CompetitorInsight(BaseModel):
    competitor: str = ""
    strategy_summary: str = ""
    top_performing_topics: list[str] = Field(default_factory=list)
    posting_frequency: str = ""


class FormatPerformance(BaseModel):
    avg_views: float = 0
    avg_engagement: float = 0
    content_count: int = 0
    trend: str = "stable"


class HookPerformanceMap(BaseModel):
    contradiction: Optional[HookStats] = None
    specificity: Optional[HookStats] = None
    timeframe_tension: Optional[HookStats] = None
    pov_as_advice: Optional[HookStats] = None
    vulnerable_confession: Optional[HookStats] = None
    pattern_interrupt: Optional[HookStats] = None


class Insight(BaseModel):
    """Aggregated patterns from analysis cycles."""
    last_updated: datetime
    analysis_count: int = Field(default=0, ge=0)
    top_topics: list[TopTopic] = Field(default_factory=list)
    hook_performance: Optional[HookPerformanceMap] = None
    thumbnail_patterns: list[ThumbnailPattern] = Field(default_factory=list)
    optimal_posting_times: dict[str, OptimalPostingTime] = Field(default_factory=dict)
    competitor_insights: list[CompetitorInsight] = Field(default_factory=list)
    content_format_performance: dict[str, FormatPerformance] = Field(default_factory=dict)

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/swipe_hook.py`**:
Reference GVB: `goviralbitch/schemas/swipe-hook.schema.json` (120 lines)

```python
"""Swipe hook schema - competitor hooks saved as inspiration.

Ported from GVB schemas/swipe-hook.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SwipeEngagement(BaseModel):
    views: int = Field(ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    engagement_rate: float = 0


class VisualHook(BaseModel):
    on_screen: str = ""
    text_overlays: str = ""
    visual_type: str = ""  # talking_head | screen_recording | split_screen | b_roll | text_only | branded_graphic | other
    pattern_interrupt: bool = False
    pacing: str = ""  # fast | moderate | slow


class SwipeHook(BaseModel):
    """Competitor hook saved as inspiration reference."""
    id: str
    hook_text: str
    pattern: str  # contradiction | specificity | timeframe_tension | pov_as_advice | vulnerable_confession | pattern_interrupt
    why_it_works: str
    competitor: str
    platform: str
    url: str
    engagement: SwipeEngagement
    competitor_angle: str = ""
    topic_keywords: list[str] = Field(default_factory=list)
    source_video_title: str = ""
    saved_at: datetime
    used_count: int = Field(default=0, ge=0)
    visual_hook: Optional[VisualHook] = None
    notes: str = ""

    # MCL-specific
    workspace_id: Optional[str] = None
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/schemas/competitor_reel.py`**:
Reference GVB: `goviralbitch/schemas/competitor-reel.schema.json` (57 lines)

```python
"""Competitor reel schema.

Ported from GVB schemas/competitor-reel.schema.json.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ReelProfile(BaseModel):
    full_name: str = ""
    followers: int = 0
    username: str = ""


class CompetitorReel(BaseModel):
    """Metadata for a scraped competitor reel or video."""
    shortcode: str
    url: str
    video_url: str = ""
    views: int = Field(ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    caption: str = Field(default="", max_length=200)
    timestamp: Optional[datetime] = None
    profile: Optional[ReelProfile] = None

    # MCL-specific
    workspace_id: Optional[str] = None
```

### Task 1.2: Channel Plugin Architecture

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/base.py`**:
```python
"""Base classes for platform channel plugins.

Each platform implements one or more of these interfaces:
- DiscoverChannel: Scrape/search for content topics
- PublishChannel: Post content to the platform
- AnalyzeChannel: Fetch performance analytics
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic
from mcl_pipeline.schemas.analytics import AnalyticsEntry


class DiscoverChannel(ABC):
    """Interface for discovering content on a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Unique platform identifier (e.g., 'youtube', 'instagram')."""
        ...

    @abstractmethod
    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """Search the platform for trending topics relevant to the brain's ICP."""
        ...

    @abstractmethod
    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape recent content from a competitor."""
        ...


class PublishChannel(ABC):
    """Interface for publishing content to a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        ...

    @abstractmethod
    async def publish(
        self,
        content: dict,
        workspace_id: str,
    ) -> dict:
        """Publish content and return platform-specific metadata."""
        ...


class AnalyzeChannel(ABC):
    """Interface for fetching analytics from a platform."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        ...

    @abstractmethod
    async def fetch_analytics(
        self,
        content_ids: list[str],
        workspace_id: str,
    ) -> list[AnalyticsEntry]:
        """Fetch performance data for published content."""
        ...
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/registry.py`**:
```python
"""Config-driven channel registry."""
from __future__ import annotations
from typing import Type
from mcl_pipeline.channels.base import DiscoverChannel, PublishChannel, AnalyzeChannel


class ChannelRegistry:
    """Maps platform names to channel implementations."""

    def __init__(self) -> None:
        self._discover: dict[str, Type[DiscoverChannel]] = {}
        self._publish: dict[str, Type[PublishChannel]] = {}
        self._analyze: dict[str, Type[AnalyzeChannel]] = {}

    def register_discover(self, platform: str, cls: Type[DiscoverChannel]) -> None:
        self._discover[platform] = cls

    def register_publish(self, platform: str, cls: Type[PublishChannel]) -> None:
        self._publish[platform] = cls

    def register_analyze(self, platform: str, cls: Type[AnalyzeChannel]) -> None:
        self._analyze[platform] = cls

    def get_discover(self, platform: str) -> Type[DiscoverChannel] | None:
        return self._discover.get(platform)

    def get_publish(self, platform: str) -> Type[PublishChannel] | None:
        return self._publish.get(platform)

    def get_analyze(self, platform: str) -> Type[AnalyzeChannel] | None:
        return self._analyze.get(platform)

    def list_platforms(self) -> dict[str, list[str]]:
        return {
            "discover": list(self._discover.keys()),
            "publish": list(self._publish.keys()),
            "analyze": list(self._analyze.keys()),
        }


# Global registry singleton
registry = ChannelRegistry()


def register_default_channels() -> None:
    """Register all built-in channels."""
    from mcl_pipeline.channels.youtube import YouTubeDiscoverChannel
    from mcl_pipeline.channels.instagram import InstagramDiscoverChannel

    registry.register_discover("youtube", YouTubeDiscoverChannel)
    registry.register_discover("instagram", InstagramDiscoverChannel)
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/youtube.py`**:
Reference GVB: `goviralbitch/recon/scraper/youtube.py`

```python
"""YouTube channel plugin.

Wraps GVB's recon/scraper/youtube.py behind the DiscoverChannel interface.
"""
from __future__ import annotations
from typing import Optional
from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic
from mcl_pipeline.recon.scraper.youtube import get_channel_videos, save_channel_data


class YouTubeDiscoverChannel(DiscoverChannel):
    @property
    def platform_name(self) -> str:
        return "youtube"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """YouTube keyword-based discovery via yt-dlp search."""
        # Implementation: use yt-dlp search for each keyword
        # Score results against brain ICP
        # Return scored topics
        raise NotImplementedError("Phase 6 implementation")

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape YouTube channel videos using yt-dlp."""
        videos = get_channel_videos(
            handle=competitor.handle,
            max_videos=max_items,
            progress_callback=progress_callback,
        )
        return videos
```

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/instagram.py`**:
Reference GVB: `goviralbitch/recon/scraper/instagram.py`

```python
"""Instagram channel plugin.

Wraps GVB's recon/scraper/instagram.py behind the DiscoverChannel interface.
"""
from __future__ import annotations
from typing import Optional
from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic
from mcl_pipeline.recon.scraper.instagram import InstaClient


class InstagramDiscoverChannel(DiscoverChannel):
    def __init__(self, username: str = "", password: str = ""):
        self._username = username
        self._password = password
        self._client: Optional[InstaClient] = None

    @property
    def platform_name(self) -> str:
        return "instagram"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        raise NotImplementedError("Instagram discovery not yet supported")

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 50,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Scrape Instagram reels using Instaloader."""
        if not self._client:
            self._client = InstaClient()
            if not self._client.login(self._username, self._password):
                raise RuntimeError("Instagram login failed")
        reels = self._client.get_competitor_reels(
            handle=competitor.handle,
            max_reels=max_items,
            progress_callback=progress_callback,
        )
        return reels
```

### Task 1.3: Port Scoring Engine

Reference GVB: `goviralbitch/scoring/engine.py` and `goviralbitch/scoring/rescore.py`

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/scoring/engine.py`**:

Key change: Remove filesystem dependency. The function `load_brain_context()` is replaced by `build_brain_context(brain: AgentBrain) -> dict` that takes a Pydantic model.

```python
"""Scoring engine - scores topics against brain ICP, pillars, and learning weights.

Ported from GVB scoring/engine.py. Key change: accepts AgentBrain model instead of
reading from filesystem.
"""
import re
from typing import Optional
from mcl_pipeline.schemas.brain import AgentBrain

# ACTION_KEYWORDS and OPINION_KEYWORDS: copy verbatim from GVB scoring/engine.py
ACTION_KEYWORDS = [
    "build", "tutorial", "how to", "how-to", "demo", "walkthrough",
    "setup", "set up", "install", "create", "deploy", "step by step",
    "guide", "implement", "configure", "automate",
]

OPINION_KEYWORDS = [
    "opinion", "debate", "thoughts", "rant", "hot take", "unpopular",
    "controversial", "prediction", "review",
]


def build_brain_context(brain: AgentBrain) -> dict:
    """Build scoring context from an AgentBrain model.

    Replaces GVB's load_brain_context() which read from filesystem.
    """
    icp_keywords: list[str] = []
    icp_keywords.extend(brain.icp.pain_points)
    icp_keywords.extend(brain.icp.goals)
    icp_keywords.extend(brain.icp.segments)

    pillar_keywords: dict[str, list[str]] = {}
    for pillar in brain.pillars:
        if pillar.name:
            pillar_keywords[pillar.name] = pillar.keywords

    competitor_handles = [
        c.handle.lstrip("@").lower() for c in brain.competitors if c.handle
    ]

    return {
        "icp_keywords": icp_keywords,
        "pillar_keywords": pillar_keywords,
        "learning_weights": brain.learning_weights.model_dump(),
        "competitor_handles": competitor_handles,
    }


# Copy all remaining functions verbatim from GVB scoring/engine.py:
# - _tokenize(text)
# - _count_keyword_matches(text, keywords)
# - _extract_stems(text)
# - _count_pain_point_matches(text, pain_points)
# - score_icp_relevance(text, brain_ctx)
# - score_content_gap(text, brain_ctx)
# - score_proof_potential(text)
# - apply_competitor_bonuses(scores, views)
# - calculate_weighted_total(scores, weights)

# CHANGED signature: score_topic now accepts brain parameter
def score_topic(
    title: str,
    description: str,
    brain: AgentBrain,
    views: int = 0,
    timeliness: int = 6,
    is_competitor: bool = False,
) -> dict:
    """Score a topic against the agent brain.

    Changed from GVB: accepts AgentBrain model instead of loading from file.
    """
    brain_ctx = build_brain_context(brain)
    text = f"{title} {description}"

    scores = {
        "icp_relevance": score_icp_relevance(text, brain_ctx),
        "timeliness": timeliness,
        "content_gap": score_content_gap(text, brain_ctx),
        "proof_potential": score_proof_potential(text),
    }

    if is_competitor and views > 0:
        scores = apply_competitor_bonuses(scores, views)

    scores["total"] = sum(
        scores[k] for k in ["icp_relevance", "timeliness", "content_gap", "proof_potential"]
    )
    scores["weighted_total"] = calculate_weighted_total(scores, brain_ctx["learning_weights"])

    return scores
```

### Task 1.4: Port Recon Modules

Copy the following files from GVB with import path updates (`recon.` -> `mcl_pipeline.recon.`):

1. **scraper/youtube.py** -- as-is with import fix + remove hardcoded `DATA_DIR`
2. **scraper/instagram.py** -- as-is with import fix + remove hardcoded `DATA_DIR`
3. **scraper/downloader.py** -- as-is with import fix + remove hardcoded `DATA_DIR`
4. **skeleton_ripper/extractor.py** -- as-is with import fix
5. **skeleton_ripper/synthesizer.py** -- as-is with import fix
6. **skeleton_ripper/aggregator.py** -- as-is, no import changes needed (pure data)
7. **skeleton_ripper/llm_client.py** -- as-is with import fix
8. **skeleton_ripper/prompts.py** -- as-is, no changes
9. **utils/retry.py** -- as-is with import fix
10. **utils/logger.py** -- as-is with Sentry hook added

### Task 1.5: Redis-Based Transcript Cache

Reference GVB: `goviralbitch/recon/skeleton_ripper/cache.py`

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/recon/skeleton_ripper/cache.py`**:
```python
"""Redis-backed transcript cache.

Replaces GVB's file-based TranscriptCache with Redis.
Keeps the same public interface for backward compatibility.
"""
from typing import Optional
import redis

MIN_TRANSCRIPT_WORDS = 10
MIN_VALID_RATIO = 0.6
CACHE_PREFIX = "mcl:transcript:"
CACHE_TTL = 60 * 60 * 24 * 30  # 30 days


class TranscriptCache:
    """Redis-backed transcript cache with same interface as GVB file cache."""

    def __init__(self, redis_client: Optional[redis.Redis] = None, redis_url: str = "redis://localhost:6379"):
        if redis_client:
            self._redis = redis_client
        else:
            self._redis = redis.from_url(redis_url, decode_responses=True)

    def _make_key(self, platform: str, username: str, video_id: str) -> str:
        safe_platform = platform.lower().replace("/", "_")
        safe_username = username.lower().replace("/", "_")
        safe_video_id = video_id.replace("/", "_")
        return f"{CACHE_PREFIX}{safe_platform}:{safe_username}:{safe_video_id}"

    def get(self, platform: str, username: str, video_id: str) -> Optional[str]:
        key = self._make_key(platform, username, video_id)
        return self._redis.get(key)

    def set(self, platform: str, username: str, video_id: str,
            transcript: str, validate: bool = True) -> bool:
        if validate and not is_valid_transcript(transcript):
            return False
        key = self._make_key(platform, username, video_id)
        self._redis.set(key, transcript, ex=CACHE_TTL)
        return True

    def exists(self, platform: str, username: str, video_id: str) -> bool:
        key = self._make_key(platform, username, video_id)
        return bool(self._redis.exists(key))

    def clear_all(self) -> int:
        keys = list(self._redis.scan_iter(f"{CACHE_PREFIX}*"))
        if keys:
            return self._redis.delete(*keys)
        return 0

    def clear_for_username(self, platform: str, username: str) -> int:
        pattern = f"{CACHE_PREFIX}{platform.lower()}:{username.lower()}:*"
        keys = list(self._redis.scan_iter(pattern))
        if keys:
            return self._redis.delete(*keys)
        return 0

    def get_stats(self) -> dict:
        keys = list(self._redis.scan_iter(f"{CACHE_PREFIX}*"))
        total_size = sum(self._redis.strlen(k) for k in keys)
        return {
            "total_files": len(keys),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }


def is_valid_transcript(transcript: str) -> bool:
    """Check if transcript meets minimum quality threshold."""
    if not transcript or not transcript.strip():
        return False
    word_count = len(transcript.split())
    return word_count >= MIN_TRANSCRIPT_WORDS


def check_transcript_validity(transcripts: list[dict]) -> tuple[int, int, bool]:
    total = len(transcripts)
    valid = sum(1 for t in transcripts if is_valid_transcript(t.get("transcript", "")))
    ratio = valid / total if total > 0 else 0
    return valid, total, ratio >= MIN_VALID_RATIO
```

### Task 1.6: Port Prompt Templates

Convert each GVB command `.md` file into a Python module that returns prompt strings. These are templates with variable interpolation, not the full command logic (that moves to the API/CLI).

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/prompts/onboard.py`**:
Reference GVB: `.claude/commands/viral-onboard.md` (270 lines)

```python
"""Onboarding prompt templates.

Converted from GVB .claude/commands/viral-onboard.md.
The template provides the AI coaching prompts for the 9-section onboarding flow.
"""
from mcl_pipeline.schemas.brain import AgentBrain
from typing import Optional

SECTIONS = [
    "identity", "icp", "pillars", "platforms", "competitors",
    "cadence", "monetization", "audience_blockers", "content_jobs",
]


def get_onboard_system_prompt() -> str:
    """System prompt for the onboarding AI coach."""
    return """You are running the MCL onboarding flow. Your job is to have a conversational coaching session to populate the user's agent brain -- the central memory that every module reads from.

Walk through 9 sections conversationally. Ask 1-2 sections at a time, then pause for the user to respond. Do NOT dump all questions at once. Synthesize their free-text answers into structured fields.

Sections:
1. Identity (name, brand, niche, tone, differentiator)
2. ICP (segments, pain_points, goals, platforms_they_use, budget_range)
3. Content Pillars (name, description, keywords per pillar)
4. Platforms (research platforms, posting platforms)
5. Competitors (name, platform, handle, why_watch)
6. Cadence (shorts_per_day, shorts_days, longform_per_week, longform_days)
7. Monetization (primary_funnel, secondary_funnels, cta_strategy, client_capture)
8. Audience Blockers (lie, destruction, pillar)
9. Content Jobs (build_trust, demonstrate_capability, drive_action pillar mapping)
"""


def get_brain_summary_prompt(brain: AgentBrain) -> str:
    """Generate a summary of the current brain state."""
    pillars = ", ".join(p.name for p in brain.pillars)
    posting = ", ".join(brain.platforms.posting)
    segments = ", ".join(brain.icp.segments)

    return f"""Here's what I have for you currently:

Name: {brain.identity.name} ({brain.identity.brand})
Niche: {brain.identity.niche}
Pillars: {pillars}
Posting on: {posting}
ICP: {segments}
Monetization: {brain.monetization.primary_funnel}

Want to update specific sections, or start completely fresh?"""


def get_section_prompts() -> dict[str, str]:
    """Return the opening context prompts for each section."""
    return {
        "identity": "Let's start with who you are and what you're building. This helps me match your voice and brand in everything I generate.",
        "icp": "Now let's define who your content is actually for. The more specific you are here, the better I can score topics and tailor angles to your audience.",
        "pillars": "Content pillars are the 3-5 recurring themes that everything you create maps back to. They keep you focused and make your content recognizable.",
        "platforms": "Let's figure out where to look for trends and where you actually post. These can be different.",
        "competitors": "Who in your space is worth watching? These are creators whose content strategy you can learn from.",
        "cadence": "How often do you want to post? Consistency matters more than volume.",
        "monetization": "Every piece of content should serve a funnel. Let's map out how your content connects to revenue.",
        "audience_blockers": "What lies or excuses does your audience believe that hold them back? These are the false beliefs your content exists to destroy.",
        "content_jobs": "Each content pillar has a primary job -- building trust, demonstrating capability, or driving action.",
    }
```

Follow the same pattern for `discover.py`, `angle.py`, `script.py`, `analyze.py`, and `update_brain.py`. Each module extracts the prompt text and template variables from the corresponding GVB command file.

### Task 1.7: Copy Seed Data

Copy GVB `data/cta-templates.json` to `packages/pipeline/mcl_pipeline/data/cta_templates.json` unchanged.

### Task 1.8: Unit Tests

**`/Users/yogi/mcl/packages/pipeline/tests/conftest.py`**:
```python
"""Shared test fixtures."""
import pytest
from datetime import datetime
from mcl_pipeline.schemas.brain import (
    AgentBrain, Identity, ICP, Pillar, PlatformConfig,
    Competitor, Cadence, Monetization, LearningWeights,
    HookPreferences, PerformancePatterns, BrainMetadata,
)


@pytest.fixture
def sample_brain() -> AgentBrain:
    """A fully populated AgentBrain for testing."""
    return AgentBrain(
        identity=Identity(
            name="Test Creator",
            brand="@testcreator",
            niche="AI Automation",
            tone=["practical", "bold"],
            differentiator="Builds live on camera",
        ),
        icp=ICP(
            segments=["agency owners", "solopreneurs"],
            pain_points=["can't scale without hiring", "drowning in manual tasks"],
            goals=["automate operations", "scale revenue"],
        ),
        pillars=[
            Pillar(name="AI Automation", description="Using AI to automate business", keywords=["ai", "automation", "agent"]),
            Pillar(name="Content Strategy", description="Growing through content", keywords=["content", "youtube", "viral"]),
        ],
        platforms=PlatformConfig(research=["youtube", "reddit"], posting=["youtube", "instagram_reels"]),
        competitors=[
            Competitor(name="Chase H", platform="youtube", handle="@Chase-H-AI", why_watch="Great demos"),
        ],
        cadence=Cadence(),
        monetization=Monetization(primary_funnel="community"),
        learning_weights=LearningWeights(),
        hook_preferences=HookPreferences(),
        performance_patterns=PerformancePatterns(),
        metadata=BrainMetadata(
            version="0.1.0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ),
    )
```

**`/Users/yogi/mcl/packages/pipeline/tests/test_schemas.py`**:
```python
"""Test Pydantic schema models validate correctly."""
from datetime import datetime
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
from mcl_pipeline.schemas.angle import Angle, Contrast
from mcl_pipeline.schemas.hook import Hook, HookScore


def test_brain_roundtrip(sample_brain):
    """Brain serializes to dict and back."""
    data = sample_brain.model_dump()
    brain2 = AgentBrain.model_validate(data)
    assert brain2.identity.name == "Test Creator"
    assert len(brain2.pillars) == 2


def test_topic_creation():
    topic = Topic(
        id="topic_20260324_001",
        title="AI Agents for Call Centers",
        source=TopicSource(platform="youtube", url="https://youtube.com/watch?v=test"),
        discovered_at=datetime.utcnow(),
        scoring=TopicScoring(
            icp_relevance=8, timeliness=7, content_gap=6,
            proof_potential=9, total=30, weighted_total=30.0,
        ),
    )
    assert topic.status == "new"


def test_hook_composite_score():
    hook = Hook(
        id="hook_001", angle_id="angle_001",
        platform="youtube_longform", pattern="contradiction",
        hook_text="Everyone thinks X but actually Y",
        score=HookScore(contrast_fit=8, pattern_strength=7, platform_fit=9, composite=8.0),
        created_at=datetime.utcnow(),
    )
    assert hook.score.composite == 8.0
```

**`/Users/yogi/mcl/packages/pipeline/tests/test_scoring.py`**:
```python
"""Test scoring engine with injected brain."""
from mcl_pipeline.scoring.engine import score_topic, build_brain_context


def test_score_topic_with_brain(sample_brain):
    scores = score_topic(
        title="How to build AI agents for agency automation",
        description="Step by step tutorial on building AI agents",
        brain=sample_brain,
    )
    assert "icp_relevance" in scores
    assert "weighted_total" in scores
    assert 4 <= scores["total"] <= 40


def test_competitor_bonus(sample_brain):
    scores = score_topic(
        title="AI automation tutorial",
        description="Full demo walkthrough",
        brain=sample_brain,
        views=150_000,
        is_competitor=True,
    )
    # Competitor with >100K views should get content_gap bonus
    assert scores["content_gap"] >= 6
```

**`/Users/yogi/mcl/packages/pipeline/tests/test_cache.py`**:
```python
"""Test Redis-backed transcript cache."""
import pytest
from unittest.mock import MagicMock
from mcl_pipeline.recon.skeleton_ripper.cache import TranscriptCache, is_valid_transcript


def test_is_valid_transcript():
    assert not is_valid_transcript("")
    assert not is_valid_transcript("too short")
    assert is_valid_transcript("This is a valid transcript with more than ten words in it for testing")


def test_cache_set_get():
    mock_redis = MagicMock()
    mock_redis.get.return_value = "cached transcript text with enough words to be valid"
    cache = TranscriptCache(redis_client=mock_redis)

    cache.set("instagram", "testuser", "abc123", "valid transcript with enough words for test purposes here")
    result = cache.get("instagram", "testuser", "abc123")
    assert result is not None
```

### Testing Requirements (Phase 1)
- `pytest packages/pipeline/tests/ -v` all pass
- `from mcl_pipeline.schemas import AgentBrain, Topic, Angle, Hook, Script` works
- `from mcl_pipeline.scoring.engine import score_topic` works with brain param
- `from mcl_pipeline.channels.base import DiscoverChannel` provides ABC
- `from mcl_pipeline.recon.skeleton_ripper.cache import TranscriptCache` uses Redis

---

## Phase 2: Database & Auth (Week 2)

### Goal
Design the Supabase Postgres schema for multi-tenancy, implement RLS policies, set up auth flows.

### Dependencies
- Phase 0 (Supabase project init)
- Phase 1 (Pydantic models define the data shape)

### Acceptance Criteria
- All tables created with proper foreign keys
- RLS policies prevent cross-workspace data access
- Auth signup/login works via Supabase client
- API key generation and validation works

### Task 2.1: Database Schema

**`/Users/yogi/mcl/infra/supabase/migrations/20260324000001_initial_schema.sql`**:

```sql
-- ============================================================
-- MCL Database Schema
-- Multi-tenant content pipeline data store
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Core: Workspaces & Users
-- ============================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    deleted_at  TIMESTAMPTZ,  -- Soft delete: NULL = active, non-NULL = deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,  -- bcrypt hash of the API key
    key_prefix TEXT NOT NULL,  -- First 8 chars for identification
    name TEXT NOT NULL DEFAULT 'Default',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Pipeline: Agent Brain
-- ============================================================

CREATE TABLE brains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',  -- Full AgentBrain JSON
    version INTEGER NOT NULL DEFAULT 1,  -- Optimistic lock version (integer, not semver)
    updated_by UUID,                     -- User or system actor who last modified
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One brain per workspace
);

-- Brain Audit Log (append-only change history)
CREATE TABLE brain_audit_log (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    section TEXT NOT NULL,
    diff JSONB NOT NULL,              -- JSON Merge Patch (RFC 7396)
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key')),
    actor_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brain_audit_workspace ON brain_audit_log(workspace_id, version DESC);

-- ============================================================
-- Pipeline: Topics
-- ============================================================

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,  -- e.g., topic_20260324_001
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source JSONB NOT NULL DEFAULT '{}',
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scoring JSONB NOT NULL DEFAULT '{}',
    pillars TEXT[] DEFAULT '{}',
    competitor_coverage JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'developing', 'scripted', 'published', 'analyzed', 'passed')),  -- Generated from TopicStatus enum
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_topics_workspace ON topics(workspace_id);
CREATE INDEX idx_topics_status ON topics(workspace_id, status);
CREATE INDEX idx_topics_discovered ON topics(workspace_id, discovered_at DESC);

-- ============================================================
-- Pipeline: Angles
-- ============================================================

CREATE TABLE angles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    format TEXT NOT NULL,  -- longform | shortform | linkedin
    title TEXT DEFAULT '',
    contrast JSONB NOT NULL DEFAULT '{}',
    target_audience TEXT DEFAULT '',
    pain_addressed TEXT DEFAULT '',
    proof_method TEXT DEFAULT '',
    funnel_direction JSONB DEFAULT '{}',
    competitor_angles JSONB DEFAULT '[]',
    content_job TEXT DEFAULT '',
    blocker_destroyed TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_angles_workspace ON angles(workspace_id);
CREATE INDEX idx_angles_topic ON angles(topic_id);
CREATE INDEX idx_angles_status ON angles(workspace_id, status);

-- ============================================================
-- Pipeline: Hooks
-- ============================================================

CREATE TABLE hooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    angle_id UUID REFERENCES angles(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    pattern TEXT NOT NULL,
    hook_text TEXT NOT NULL,
    visual_cue TEXT DEFAULT '',
    score JSONB NOT NULL DEFAULT '{}',
    cta_pairing TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    performance JSONB DEFAULT NULL,
    source TEXT DEFAULT 'original',
    swipe_reference TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_hooks_workspace ON hooks(workspace_id);
CREATE INDEX idx_hooks_angle ON hooks(angle_id);
CREATE INDEX idx_hooks_pattern ON hooks(workspace_id, pattern);

-- ============================================================
-- Pipeline: Scripts
-- ============================================================

CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    angle_id UUID REFERENCES angles(id) ON DELETE SET NULL,
    hook_ids UUID[] DEFAULT '{}',
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    script_structure JSONB DEFAULT NULL,
    filming_cards JSONB DEFAULT '[]',
    shortform_structure JSONB DEFAULT NULL,
    estimated_duration TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'filming', 'published', 'analyzed', 'archived')),  -- Generated from ScriptStatus enum
    performance JSONB DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_scripts_workspace ON scripts(workspace_id);
CREATE INDEX idx_scripts_status ON scripts(workspace_id, status);

-- ============================================================
-- Pipeline: Analytics Entries
-- ============================================================

CREATE TABLE analytics_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    content_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    days_since_publish INT DEFAULT 0,
    metrics JSONB NOT NULL DEFAULT '{}',
    thumbnail JSONB DEFAULT NULL,
    hook_pattern_used TEXT DEFAULT '',
    topic_category TEXT DEFAULT '',
    content_pillar TEXT DEFAULT '',
    is_winner BOOLEAN DEFAULT false,
    winner_reason TEXT DEFAULT '',
    winner_metrics JSONB DEFAULT NULL,
    collection_method TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_analytics_workspace ON analytics_entries(workspace_id);
CREATE INDEX idx_analytics_content ON analytics_entries(content_id);
CREATE INDEX idx_analytics_winners ON analytics_entries(workspace_id, is_winner) WHERE is_winner = true;

-- ============================================================
-- Pipeline: Insights
-- ============================================================

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',  -- Full Insight JSON
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)
);

-- ============================================================
-- Pipeline: Swipe Hooks
-- ============================================================

-- MCL ships with ~50 curated seed hooks (is_system=true) across niches.
-- Every new workspace inherits seed hooks on creation.
-- After onboarding, a background recon job auto-populates niche-specific swipe hooks.
CREATE TABLE swipe_hooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    hook_text TEXT NOT NULL,
    pattern TEXT NOT NULL,
    why_it_works TEXT NOT NULL,
    competitor TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    engagement JSONB NOT NULL DEFAULT '{}',
    competitor_angle TEXT DEFAULT '',
    topic_keywords TEXT[] DEFAULT '{}',
    source_video_title TEXT DEFAULT '',
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_count INT DEFAULT 0,
    is_system BOOLEAN DEFAULT false,  -- true = curated seed hook, false = user/recon generated
    visual_hook JSONB DEFAULT NULL,
    notes TEXT DEFAULT '',
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_swipe_hooks_workspace ON swipe_hooks(workspace_id);
CREATE INDEX idx_swipe_hooks_pattern ON swipe_hooks(workspace_id, pattern);

-- ============================================================
-- Recon: Competitor Data
-- ============================================================

CREATE TABLE competitor_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    shortcode TEXT NOT NULL,
    url TEXT NOT NULL,
    video_url TEXT DEFAULT '',
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    caption TEXT DEFAULT '',
    posted_at TIMESTAMPTZ,
    profile JSONB DEFAULT '{}',
    competitor_handle TEXT NOT NULL,
    platform TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, shortcode)
);

CREATE INDEX idx_reels_workspace ON competitor_reels(workspace_id);
CREATE INDEX idx_reels_competitor ON competitor_reels(workspace_id, competitor_handle);

-- ============================================================
-- Recon: Skeleton Reports
-- ============================================================

CREATE TABLE skeleton_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    skeletons JSONB NOT NULL DEFAULT '[]',
    synthesis JSONB DEFAULT NULL,
    report_markdown TEXT DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | complete | failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_workspace ON skeleton_reports(workspace_id);

-- ============================================================
-- Recon: Tracker State (duplicate prevention, from GVB tracker.py)
-- ============================================================

CREATE TABLE recon_tracker_state (
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL,
    handle          TEXT NOT NULL,
    last_content_id TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen_urls       TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE(workspace_id, platform, handle)
);

CREATE INDEX idx_recon_tracker_lookup ON recon_tracker_state(workspace_id, platform, handle);

-- ============================================================
-- Recon: Assets & Collections (from GVB storage/database.py)
-- ============================================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    content_path TEXT,
    preview TEXT,
    metadata JSONB,
    starred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_type ON assets(workspace_id, type);
CREATE INDEX idx_assets_starred ON assets(workspace_id, starred) WHERE starred = true;

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_collections (
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (asset_id, collection_id)
);

-- ============================================================
-- Jobs: Background job tracking
-- ============================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,  -- discover | recon | angle | script | analyze | rescore
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | complete | failed
    progress JSONB DEFAULT '{}',
    result JSONB DEFAULT NULL,
    error TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX idx_jobs_status ON jobs(workspace_id, status);

-- ============================================================
-- Jobs: Dead Letter Queue (auto-retry failed jobs)
-- ============================================================

CREATE TABLE dead_letter_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    error TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    original_params JSONB NOT NULL DEFAULT '{}',
    auto_retry_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_auto_retries INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'pending_retry' CHECK (status IN ('pending_retry', 'retrying', 'permanent_failure'))
);

CREATE INDEX idx_dlq_workspace ON dead_letter_jobs(workspace_id);
CREATE INDEX idx_dlq_status ON dead_letter_jobs(status);
CREATE INDEX idx_dlq_retry_at ON dead_letter_jobs(auto_retry_at) WHERE status = 'pending_retry';

-- ============================================================
-- Plans (admin-configurable, database-driven)
-- ============================================================

CREATE TABLE plans (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    TEXT UNIQUE NOT NULL,
    display_name            TEXT NOT NULL,
    ai_calls_per_day        INT NOT NULL DEFAULT 20,
    ai_tokens_per_month     BIGINT NOT NULL DEFAULT 1000000,
    ai_max_tokens_per_call  INT NOT NULL DEFAULT 4096,
    discover_runs_per_day   INT NOT NULL DEFAULT 3,
    max_competitors         INT NOT NULL DEFAULT 2,
    max_workspaces          INT NOT NULL DEFAULT 1,
    max_team_members        INT NOT NULL DEFAULT 1,
    platforms_allowed       TEXT[] NOT NULL DEFAULT '{youtube,instagram}',
    features                JSONB NOT NULL DEFAULT '{}',
    price_monthly_cents     INT NOT NULL DEFAULT 0,
    price_yearly_cents      INT NOT NULL DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly  TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Workspace Connections (platform OAuth / API key storage)
-- ============================================================

CREATE TABLE workspace_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('api_key', 'oauth', 'session')),
    credentials_encrypted JSONB,  -- encrypted via Supabase Vault
    key_source TEXT CHECK (key_source IN ('user_provided', 'mcl_provided')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, platform)
);
CREATE INDEX idx_connections_workspace ON workspace_connections(workspace_id);
CREATE INDEX idx_connections_status ON workspace_connections(status) WHERE status = 'expired';

-- ============================================================
-- Subscriptions (Stripe billing)
-- ============================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One active subscription per workspace
);
CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ============================================================
-- Workspace Access Grants (creator-controlled agency permissions)
-- ============================================================

CREATE TABLE workspace_access_grants (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,  -- Child workspace (creator)
    grantee_workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,  -- Parent workspace (agency)
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
    granted_by   UUID NOT NULL REFERENCES auth.users(id),
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ,  -- NULL = active, non-NULL = revoked
    UNIQUE(workspace_id, grantee_workspace_id)
);

CREATE INDEX idx_grants_workspace ON workspace_access_grants(workspace_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_grants_grantee ON workspace_access_grants(grantee_workspace_id) WHERE revoked_at IS NULL;

-- ============================================================
-- Workspace Usage (tracks consumption against plan limits)
-- ============================================================

CREATE TABLE workspace_usage (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    period                  TEXT NOT NULL,
    ai_calls_today          INT NOT NULL DEFAULT 0,
    ai_calls_today_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()) + interval '1 day',
    ai_tokens_this_month    BIGINT NOT NULL DEFAULT 0,
    discover_runs_today     INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, period)
);

CREATE INDEX idx_workspace_usage_lookup ON workspace_usage(workspace_id, period);

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_workspaces_updated BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_brains_updated BEFORE UPDATE ON brains FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_topics_updated BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_angles_updated BEFORE UPDATE ON angles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_hooks_updated BEFORE UPDATE ON hooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_scripts_updated BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_plans_updated BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_workspace_usage_updated BEFORE UPDATE ON workspace_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Task 2.2: RLS Policies

**`/Users/yogi/mcl/infra/supabase/migrations/20260324000002_rls_policies.sql`**:

```sql
-- ============================================================
-- Row-Level Security Policies
-- Users can only access data in workspaces they belong to
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skeleton_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_tracker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_access_grants ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND accepted_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces: members can read, owners can update
CREATE POLICY workspace_select ON workspaces FOR SELECT USING (is_workspace_member(id) AND deleted_at IS NULL);
CREATE POLICY workspace_insert ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY workspace_delete ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace members: members can read their workspace's members
CREATE POLICY members_select ON workspace_members FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY members_insert ON workspace_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY members_delete ON workspace_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
);

-- Generic workspace-scoped policies for all data tables
-- Pattern: SELECT/INSERT/UPDATE/DELETE all require workspace membership

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'brains', 'topics', 'angles', 'hooks', 'scripts',
            'analytics_entries', 'insights', 'swipe_hooks', 'competitor_reels',
            'skeleton_reports', 'recon_tracker_state', 'assets', 'collections', 'jobs',
            'plans', 'workspace_usage', 'workspace_connections', 'subscriptions',
            'dead_letter_jobs', 'workspace_access_grants'
        ])
    LOOP
        EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (is_workspace_member(workspace_id))', tbl, tbl);
    END LOOP;
END
$$;

-- API keys: users can only manage their own
CREATE POLICY apikeys_select ON api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY apikeys_insert ON api_keys FOR INSERT WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));
CREATE POLICY apikeys_delete ON api_keys FOR DELETE USING (user_id = auth.uid());

-- Asset collections: inherit from assets
CREATE POLICY ac_select ON asset_collections FOR SELECT USING (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
CREATE POLICY ac_insert ON asset_collections FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
CREATE POLICY ac_delete ON asset_collections FOR DELETE USING (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
```

### Task 2.3: Seed Data

**`/Users/yogi/mcl/infra/supabase/migrations/20260324000003_seed_data.sql`**:

```sql
-- No seed data for production. Workspaces are created via the API.
-- This file is a placeholder for development seed data.

-- Example for local dev (uncomment when needed):
-- INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'dev@mcl.dev');
-- INSERT INTO workspaces (id, name, slug, owner_id) VALUES ('ws-dev-001', 'Dev Workspace', 'dev', '00000000-0000-0000-0000-000000000001');
-- INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at) VALUES ('ws-dev-001', '00000000-0000-0000-0000-000000000001', 'owner', now());
```

### Testing Requirements (Phase 2)
- `supabase db reset` applies all migrations without error
- RLS test: user A cannot read user B's workspace data
- `supabase gen types typescript --local` generates TypeScript types

---

## Phase 3: FastAPI Backend (Week 2-3)

### Goal
Build the FastAPI API layer that orchestrates pipeline operations, manages auth, and dispatches background jobs.

### Dependencies
- Phase 1 (pipeline package)
- Phase 2 (database schema)

### Acceptance Criteria
- All REST endpoints return correct responses
- WebSocket streaming works for long-running operations
- ARQ workers process jobs from Redis queue
- OpenAPI spec auto-generates correctly

### Task 3.1: Dependency Injection

**`/Users/yogi/mcl/packages/api/app/deps.py`**:
```python
"""FastAPI dependency injection."""
from functools import lru_cache
from supabase import create_client, Client
from redis.asyncio import Redis
from app.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


async def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)
```

### Task 3.2: Auth Middleware

**`/Users/yogi/mcl/packages/api/app/middleware/auth.py`**:
```python
"""JWT and API key authentication."""
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.deps import get_supabase

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """Verify JWT or API key and return user info."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    # Try JWT first
    try:
        user = supabase.auth.get_user(token)
        return {"user_id": user.user.id, "email": user.user.email}
    except Exception:
        pass

    # Try API key
    # API keys are prefixed with "mcl_" followed by the key
    if token.startswith("mcl_"):
        # Look up key in api_keys table
        prefix = token[:12]
        result = supabase.table("api_keys").select("*").eq("key_prefix", prefix).execute()
        if result.data:
            # Verify hash (bcrypt)
            import bcrypt
            key_data = result.data[0]
            if bcrypt.checkpw(token.encode(), key_data["key_hash"].encode()):
                # Update last_used_at
                supabase.table("api_keys").update({"last_used_at": "now()"}).eq("id", key_data["id"]).execute()
                return {"user_id": key_data["user_id"], "workspace_id": key_data["workspace_id"]}

    raise HTTPException(status_code=401, detail="Invalid credentials")
```

### Task 3.3: REST Endpoints

All endpoints are workspace-scoped: `/api/v1/workspaces/{workspace_id}/...`

**Complete endpoint list:**

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/api/v1/auth/signup` | `auth.signup` | Create account via Supabase Auth |
| POST | `/api/v1/auth/login` | `auth.login` | Login, return JWT |
| POST | `/api/v1/auth/api-key` | `auth.create_api_key` | Generate API key for a workspace |
| DELETE | `/api/v1/auth/api-key/{id}` | `auth.revoke_api_key` | Revoke an API key |
| GET | `/api/v1/workspaces` | `workspaces.list_workspaces` | List user's workspaces |
| POST | `/api/v1/workspaces` | `workspaces.create_workspace` | Create new workspace |
| GET | `/api/v1/workspaces/{ws_id}` | `workspaces.get_workspace` | Get workspace details |
| PUT | `/api/v1/workspaces/{ws_id}` | `workspaces.update_workspace` | Update workspace |
| POST | `/api/v1/workspaces/{ws_id}/invite` | `workspaces.invite_member` | Invite user to workspace |
| GET | `/api/v1/workspaces/{ws_id}/brain` | `brain.get_brain` | Get agent brain |
| PUT | `/api/v1/workspaces/{ws_id}/brain` | `brain.update_brain` | Update agent brain |
| GET | `/api/v1/workspaces/{ws_id}/topics` | `topics.list_topics` | List topics with filters |
| POST | `/api/v1/workspaces/{ws_id}/topics` | `topics.create_topic` | Create topic manually |
| GET | `/api/v1/workspaces/{ws_id}/topics/{id}` | `topics.get_topic` | Get single topic |
| PUT | `/api/v1/workspaces/{ws_id}/topics/{id}` | `topics.update_topic` | Update topic status/notes |
| DELETE | `/api/v1/workspaces/{ws_id}/topics/{id}` | `topics.delete_topic` | Delete topic |
| GET | `/api/v1/workspaces/{ws_id}/angles` | `angles.list_angles` | List angles |
| POST | `/api/v1/workspaces/{ws_id}/angles` | `angles.create_angle` | Create angle |
| GET | `/api/v1/workspaces/{ws_id}/angles/{id}` | `angles.get_angle` | Get angle |
| PUT | `/api/v1/workspaces/{ws_id}/angles/{id}` | `angles.update_angle` | Update angle |
| GET | `/api/v1/workspaces/{ws_id}/hooks` | `hooks.list_hooks` | List hooks |
| POST | `/api/v1/workspaces/{ws_id}/hooks` | `hooks.create_hook` | Create hook |
| GET | `/api/v1/workspaces/{ws_id}/scripts` | `scripts.list_scripts` | List scripts |
| POST | `/api/v1/workspaces/{ws_id}/scripts` | `scripts.create_script` | Create script |
| GET | `/api/v1/workspaces/{ws_id}/scripts/{id}` | `scripts.get_script` | Get script |
| PUT | `/api/v1/workspaces/{ws_id}/scripts/{id}` | `scripts.update_script` | Update script |
| GET | `/api/v1/workspaces/{ws_id}/scripts/{id}/pdf` | `scripts.download_pdf` | Generate and download PDF |
| PATCH | `/api/v1/workspaces/{ws_id}/scripts/{id}/publish` | `scripts.publish_script` | Mark as published, schedule analytics |
| GET | `/api/v1/workspaces/{ws_id}/analytics` | `analytics.list_entries` | List analytics entries |
| POST | `/api/v1/workspaces/{ws_id}/analytics` | `analytics.create_entry` | Create entry manually |
| GET | `/api/v1/workspaces/{ws_id}/insights` | `analytics.get_insights` | Get aggregated insights |
| GET | `/api/v1/workspaces/{ws_id}/swipe-hooks` | `hooks.list_swipe_hooks` | List swipe hooks |
| POST | `/api/v1/workspaces/{ws_id}/pipeline/discover` | `pipeline.start_discover` | Trigger discovery job |
| POST | `/api/v1/workspaces/{ws_id}/pipeline/angle` | `pipeline.start_angle` | Trigger angle generation |
| POST | `/api/v1/workspaces/{ws_id}/pipeline/script` | `pipeline.start_script` | Trigger script generation |
| POST | `/api/v1/workspaces/{ws_id}/pipeline/analyze` | `pipeline.start_analyze` | Trigger analytics |
| POST | `/api/v1/workspaces/{ws_id}/pipeline/rescore` | `pipeline.start_rescore` | Trigger rescore |
| POST | `/api/v1/workspaces/{ws_id}/recon/scrape` | `recon.start_scrape` | Trigger competitor scrape |
| POST | `/api/v1/workspaces/{ws_id}/recon/ripper` | `recon.start_ripper` | Trigger skeleton ripper |
| GET | `/api/v1/workspaces/{ws_id}/recon/reports` | `recon.list_reports` | List skeleton reports |
| GET | `/api/v1/workspaces/{ws_id}/recon/reports/{id}` | `recon.get_report` | Get skeleton report |
| GET | `/api/v1/workspaces/{ws_id}/jobs` | `pipeline.list_jobs` | List background jobs |
| GET | `/api/v1/workspaces/{ws_id}/jobs/{id}` | `pipeline.get_job` | Get job status |
| WS | `/ws/chat` | `chat.chat_ws` | AI coaching chat (WebSocket) |
| WS | `/ws/pipeline/{job_id}` | `pipeline.stream_job` | Stream job progress (WebSocket) |
| GET | `/api/v1/health` | `health.health_check` | Health check |

**Example route implementation:**

**`/Users/yogi/mcl/packages/api/app/routes/brain.py`**:
```python
"""Agent brain routes."""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from mcl_pipeline.schemas.brain import AgentBrain
from app.deps import get_supabase
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/brain", tags=["brain"])


@router.get("", response_model=AgentBrain)
async def get_brain(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Brain not found. Run onboarding first.")
    return AgentBrain.model_validate(result.data["data"])


@router.put("")
async def update_brain(
    workspace_id: str,
    brain: AgentBrain,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    data = brain.model_dump(mode="json")
    supabase.table("brains").upsert({
        "workspace_id": workspace_id,
        "data": data,
        "version": brain.metadata.version,
    }).execute()
    return {"status": "updated"}
```

### Task 3.4: ARQ Job Definitions

**`/Users/yogi/mcl/packages/api/app/jobs/discover.py`**:
```python
"""Discovery background job."""
from arq import ArqRedis
from mcl_pipeline.schemas.brain import AgentBrain
from mcl_pipeline.channels.registry import registry


async def run_discovery(
    ctx: dict,
    workspace_id: str,
    mode: str,  # "competitors" | "keywords" | "both"
    keywords: list[str] | None = None,
) -> dict:
    """ARQ task: run topic discovery pipeline."""
    supabase = ctx["supabase"]
    redis: ArqRedis = ctx["redis"]

    # Load brain from Supabase
    result = supabase.table("brains").select("data").eq("workspace_id", workspace_id).single().execute()
    brain = AgentBrain.model_validate(result.data["data"])

    topics = []

    if mode in ("competitors", "both"):
        for competitor in brain.competitors:
            channel_cls = registry.get_discover(competitor.platform)
            if channel_cls:
                channel = channel_cls()
                items = await channel.scrape_competitor(competitor)
                # Convert to topics via bridge
                from mcl_pipeline.recon.bridge import generate_topics_from_skeletons
                # ... scoring and topic generation logic

    if mode in ("keywords", "both"):
        kws = keywords or []
        for pillar in brain.pillars:
            kws.extend(pillar.keywords)
        # Run keyword discovery across channels
        # ... discovery logic

    # Save topics to Supabase
    for topic in topics:
        supabase.table("topics").upsert({
            "workspace_id": workspace_id,
            "external_id": topic.id,
            "title": topic.title,
            "description": topic.description,
            "source": topic.source.model_dump(mode="json"),
            "scoring": topic.scoring.model_dump(mode="json"),
            "pillars": topic.pillars,
            "status": topic.status,
        }).execute()

    return {"topics_found": len(topics)}
```

### Task 3.5: WebSocket Manager

**`/Users/yogi/mcl/packages/api/app/websocket/manager.py`**:
```python
"""WebSocket connection manager for streaming updates."""
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, workspace_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[workspace_id].append(websocket)

    def disconnect(self, workspace_id: str, websocket: WebSocket):
        self._connections[workspace_id].remove(websocket)

    async def broadcast(self, workspace_id: str, message: dict):
        for ws in self._connections[workspace_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()
```

### Task 3.6: API Test Scaffolding

Create:
- `packages/api/tests/__init__.py`
- `packages/api/tests/conftest.py` -- `TestClient` fixture using `httpx.AsyncClient(transport=ASGITransport(app=app))`, mock Supabase client, mock Redis
- `packages/api/tests/test_health.py` -- tests `GET /health` returns 200 with `{"status": "healthy"}`
- `packages/api/tests/test_auth.py` -- tests unauthenticated returns 401, invalid JWT returns 401, invalid API key returns 401
- `packages/api/tests/test_discover.py` -- tests discover endpoint with mocked pipeline returns job_id

### Task 3.7: Email Service

Implement `packages/api/app/services/email.py` using `resend` library with:
- `send_invite(email, workspace_name, invite_url)` -- workspace invitation
- `send_welcome(email, full_name)` -- post-signup welcome
- `send_job_failed(email, job_type, error, workspace_name)` -- failed job notification
- `send_connection_expired(email, platform, workspace_name)` -- expired platform connection alert

### Testing Requirements (Phase 3)
- `pytest packages/api/tests/ -v` passes (see Task 3.6 for test scaffolding)
- `curl http://localhost:8000/api/v1/health` returns `{"status": "healthy"}`
- OpenAPI spec at `/docs` shows all endpoints
- WebSocket connection to `/api/v1/workspaces/{id}/chat` opens successfully
- Email service functions are importable: `from app.services.email import send_invite` (see Task 3.7)

---

## Phase 4: Web Dashboard (Week 3-4)

### Goal
Build the React SPA with shadcn/ui, OpenAPI client auto-generation, and all pipeline UI pages.

### Dependencies
- Phase 3 (API endpoints for the client to call)

### Acceptance Criteria
- All 9 pages render and function
- Supabase Auth sign-in/sign-up flow works
- Real-time updates via Supabase Realtime subscriptions
- AI chat interface streams responses via WebSocket

### Task 4.1: OpenAPI Client Generation

```bash
cd /Users/yogi/mcl/packages/web
npx openapi-typescript-codegen --input http://localhost:8000/openapi.json --output src/api/generated --client fetch
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "generate-api": "openapi-typescript-codegen --input ../../docs/api/openapi.json --output src/api/generated --client fetch",
    "generate-api:live": "openapi-typescript-codegen --input http://localhost:8000/openapi.json --output src/api/generated --client fetch"
  }
}
```

The default `generate-api` uses the committed spec file (works offline, used in CI). The `generate-api:live` variant hits a running server for development.

**`/Users/yogi/mcl/scripts/generate-openapi.sh`**:
```bash
#!/usr/bin/env bash
set -euo pipefail
# Generate OpenAPI spec offline (no running server needed)
python -c "
from packages.api.app.main import create_app
import json
app = create_app()
print(json.dumps(app.openapi(), indent=2))
" > docs/api/openapi.json
echo "OpenAPI spec written to docs/api/openapi.json"
```

### Task 4.2: Supabase Client

**`/Users/yogi/mcl/packages/web/src/api/supabase.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**TypeScript database types:** Generate typed Supabase client from the local schema:
```bash
supabase gen types typescript --local > packages/web/src/api/database.types.ts
```

Import the `Database` type into the Supabase client initialization for type-safe Realtime subscriptions. Add to build scripts so types regenerate after migrations:
```json
{
  "scripts": {
    "generate-db-types": "supabase gen types typescript --local > src/api/database.types.ts"
  }
}
```

### Task 4.3: Pages

Each page corresponds to a pipeline stage. Build in this order:

1. **Login.tsx** -- Supabase Auth UI (email/password + Google OAuth)
2. **Onboarding.tsx** -- Multi-step wizard mapping to the 9 brain sections from `prompts/onboard.py`. Uses AI chat interface for conversational flow.
3. **Dashboard.tsx** -- Brain summary card, recent topics, job queue status, quick actions
4. **Discovery.tsx** -- Two tabs: "Discover Topics" (keyword search + results with scoring columns, status filters, bulk actions, "Discover Now" button) and "Competitor Intel" (competitor scraping, skeleton ripper results, swipe hooks). Replaces the previously separate Recon page.
5. **Angles.tsx** -- Angle cards with Contrast Formula display (common_belief -> surprising_truth). Format tabs (longform/shortform/linkedin).
6. **Scripts.tsx** -- Script editor with filming cards sidebar. Beat timeline for shortform. PDF download button.
7. **Analytics.tsx** -- Charts (views over time, hook pattern performance, pillar breakdown). Winner badges.
8. **Settings.tsx** -- Workspace name/slug, API key management, connected platforms, brain JSON editor.
9. **Chat.tsx** -- AI coaching chat. WebSocket connection to `/api/v1/workspaces/{id}/chat`. Streaming message display.

### Task 4.4: Realtime Subscriptions

Subscribe to Supabase Realtime for live table updates:
```typescript
// In Discovery.tsx
useEffect(() => {
  const channel = supabase
    .channel('topics-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'topics',
      filter: `workspace_id=eq.${workspaceId}`
    }, (payload) => {
      // Update React Query cache
      queryClient.invalidateQueries(['topics', workspaceId])
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [workspaceId])
```

### Testing Requirements (Phase 4)
- All pages render without errors
- Login flow completes (sign up -> verify email -> login -> redirect to dashboard)
- Creating a topic in the API shows up in the Discovery page in real-time
- Chat interface sends and receives messages

---

## Phase 5: CLI (Week 4)

### Goal
Build a Python CLI that mirrors the API endpoints and supports both cloud mode (API calls) and local mode (direct pipeline import).

### Dependencies
- Phase 1 (pipeline package for local mode)
- Phase 3 (API for cloud mode)

### Acceptance Criteria
- `pip install -e packages/cli` works
- `mcl onboard` runs interactive onboarding
- `mcl discover --keywords` triggers discovery
- `mcl status` shows job queue
- Local mode works without API running

### Task 5.1: CLI Commands

**`/Users/yogi/mcl/packages/cli/mcl_cli/commands/onboard.py`**:
```python
"""mcl onboard - Interactive brain setup."""
import typer
from typing import Annotated
from rich.console import Console
from rich.prompt import Prompt

console = Console()
app = typer.Typer()


@app.command()
def onboard(
    mode: Annotated[str, typer.Option(help="Execution mode")] = "cloud",
):
    """Run interactive onboarding to build your agent brain."""
    if mode == "local":
        from mcl_pipeline.prompts.onboard import get_section_prompts
        # Run locally with direct pipeline access
        sections = get_section_prompts()
        for section_name, prompt_text in sections.items():
            console.print(f"\n[bold]{prompt_text}[/bold]\n")
            response = Prompt.ask(f"[{section_name}]")
            # Process response...
    else:
        # Cloud mode: call API
        import httpx
        from mcl_cli.config import get_config
        config = get_config()
        client = httpx.Client(
            base_url=config.api_url,
            headers={"Authorization": f"Bearer {config.api_key}"},
        )
        # Interactive loop calling chat endpoint
```

**`/Users/yogi/mcl/packages/cli/mcl_cli/commands/discover.py`**:
```python
"""mcl discover - Topic discovery."""
import typer
from typing import Annotated
from rich.console import Console
from rich.table import Table

console = Console()
app = typer.Typer()


@app.command()
def discover(
    competitors: Annotated[bool, typer.Option("--competitors", help="Run competitor scrape only")] = False,
    keywords: Annotated[bool, typer.Option("--keywords", help="Run keyword search only")] = False,
    all_modes: Annotated[bool, typer.Option("--all", help="Run both")] = False,
    mode: Annotated[str, typer.Option(help="Execution mode")] = "cloud",
):
    """Discover trending content topics."""
    discovery_mode = "both" if all_modes else ("competitors" if competitors else ("keywords" if keywords else "both"))

    if mode == "local":
        from mcl_pipeline.scoring.engine import score_topic
        # Direct pipeline execution
    else:
        import httpx
        from mcl_cli.config import get_config
        config = get_config()
        client = httpx.Client(
            base_url=config.api_url,
            headers={"Authorization": f"Bearer {config.api_key}"},
        )
        response = client.post(
            f"/api/v1/workspaces/{config.workspace_id}/pipeline/discover",
            json={"mode": discovery_mode},
        )
        job = response.json()
        console.print(f"Discovery job started: {job['id']}")
```

### Task 5.2: Auth Configuration

**`/Users/yogi/mcl/packages/cli/mcl_cli/config.py`**:
```python
"""CLI configuration stored at ~/.mcl/config.toml."""
from pathlib import Path
from dataclasses import dataclass
import toml

CONFIG_DIR = Path.home() / ".mcl"
CONFIG_FILE = CONFIG_DIR / "config.toml"


@dataclass
class CLIConfig:
    api_url: str = "http://localhost:8000"
    api_key: str = ""
    workspace_id: str = ""
    mode: str = "cloud"  # cloud | local

    @classmethod
    def load(cls) -> "CLIConfig":
        if CONFIG_FILE.exists():
            data = toml.load(CONFIG_FILE)
            return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})
        return cls()

    def save(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        data = {k: getattr(self, k) for k in self.__annotations__}
        with open(CONFIG_FILE, "w") as f:
            toml.dump(data, f)
```

### Testing Requirements (Phase 5)
- `mcl --version` prints `0.1.0`
- `mcl brain show` prints current brain summary (local mode)
- `mcl discover --keywords` starts a discovery job (cloud mode)

---

## Phase 6: Platform Channels (Week 4-5)

### Goal
Implement additional platform channel plugins beyond YouTube and Instagram.

### Dependencies
- Phase 1 (channel base classes)
- Phase 3 (API for triggering channel operations)

### Acceptance Criteria
- Reddit channel discovers topics from subreddits
- TikTok channel scrapes competitor content
- Hacker News channel discovers trending tech topics
- Channel testing framework validates all plugins

### Task 6.1: Reddit Channel

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/reddit.py`**:
```python
"""Reddit channel plugin.

Uses GVB's last30days skill for Reddit research.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime
from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor
from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
from mcl_pipeline.scoring.engine import score_topic


class RedditDiscoverChannel(DiscoverChannel):
    @property
    def platform_name(self) -> str:
        return "reddit"

    async def discover_topics(
        self,
        brain: AgentBrain,
        keywords: list[str],
        max_results: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[Topic]:
        """Search Reddit for trending topics via OpenAI web search or Brave API."""
        from mcl_pipeline.skills.last30days.lib.openai_reddit import search_reddit
        # Implementation using GVB's last30days research engine
        raise NotImplementedError("Reddit discovery - implement using last30days skill")

    async def scrape_competitor(
        self,
        competitor: Competitor,
        max_items: int = 20,
        progress_callback: Optional[callable] = None,
    ) -> list[dict]:
        """Reddit competitors are subreddits or users to monitor."""
        raise NotImplementedError("Reddit scraping - implement with OpenAI web search")
```

### Task 6.2: TikTok Channel

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/tiktok.py`**:
```python
"""TikTok channel plugin. Uses yt-dlp for scraping (same as YouTube)."""
from __future__ import annotations
from typing import Optional
from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor


class TikTokDiscoverChannel(DiscoverChannel):
    @property
    def platform_name(self) -> str:
        return "tiktok"

    async def discover_topics(self, brain, keywords, max_results=20, progress_callback=None):
        raise NotImplementedError("TikTok discovery via yt-dlp search")

    async def scrape_competitor(self, competitor, max_items=20, progress_callback=None):
        """Scrape TikTok profile using yt-dlp (same approach as YouTube)."""
        import subprocess, json
        url = f"https://www.tiktok.com/@{competitor.handle.lstrip('@')}"
        result = subprocess.run(
            ["yt-dlp", "--flat-playlist", "--dump-json", "--playlist-end", str(max_items), url],
            capture_output=True, text=True, timeout=120,
        )
        videos = []
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                try:
                    data = json.loads(line)
                    videos.append({
                        "video_id": data.get("id", ""),
                        "url": data.get("url", ""),
                        "title": data.get("title", ""),
                        "views": data.get("view_count", 0) or 0,
                        "likes": data.get("like_count", 0) or 0,
                    })
                except json.JSONDecodeError:
                    continue
        return videos
```

### Task 6.3: Hacker News Channel

**`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/hackernews.py`**:
```python
"""Hacker News channel plugin. Uses HN Algolia API."""
from __future__ import annotations
from typing import Optional
import requests
from mcl_pipeline.channels.base import DiscoverChannel
from mcl_pipeline.schemas.brain import AgentBrain, Competitor


class HackerNewsDiscoverChannel(DiscoverChannel):
    HN_API = "https://hn.algolia.com/api/v1"

    @property
    def platform_name(self) -> str:
        return "hackernews"

    async def discover_topics(self, brain, keywords, max_results=20, progress_callback=None):
        """Search HN for trending stories matching keywords."""
        from mcl_pipeline.schemas.topic import Topic, TopicSource, TopicScoring
        from mcl_pipeline.scoring.engine import score_topic
        from datetime import datetime

        topics = []
        for keyword in keywords[:5]:  # Limit to 5 keyword searches
            resp = requests.get(f"{self.HN_API}/search", params={
                "query": keyword, "tags": "story", "numericFilters": "points>50",
                "hitsPerPage": max_results,
            }, timeout=15)
            if resp.status_code != 200:
                continue
            for hit in resp.json().get("hits", []):
                scores = score_topic(
                    title=hit.get("title", ""),
                    description=hit.get("title", ""),
                    brain=brain,
                    timeliness=7,
                )
                topics.append(Topic(
                    id=f"topic_hn_{hit.get('objectID', '')}",
                    title=hit.get("title", ""),
                    source=TopicSource(
                        platform="hackernews",
                        url=hit.get("url", f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"),
                        author=hit.get("author", ""),
                        engagement_signals=f"{hit.get('points', 0)} points, {hit.get('num_comments', 0)} comments",
                    ),
                    discovered_at=datetime.utcnow(),
                    scoring=TopicScoring(**scores),
                ))
        return topics[:max_results]

    async def scrape_competitor(self, competitor, max_items=20, progress_callback=None):
        raise NotImplementedError("HN does not have competitor scraping")
```

### Task 6.4: Register All Channels

Update **`/Users/yogi/mcl/packages/pipeline/mcl_pipeline/channels/registry.py`**:
```python
def register_default_channels() -> None:
    from mcl_pipeline.channels.youtube import YouTubeDiscoverChannel
    from mcl_pipeline.channels.instagram import InstagramDiscoverChannel
    from mcl_pipeline.channels.reddit import RedditDiscoverChannel
    from mcl_pipeline.channels.tiktok import TikTokDiscoverChannel
    from mcl_pipeline.channels.hackernews import HackerNewsDiscoverChannel

    registry.register_discover("youtube", YouTubeDiscoverChannel)
    registry.register_discover("instagram", InstagramDiscoverChannel)
    registry.register_discover("reddit", RedditDiscoverChannel)
    registry.register_discover("tiktok", TikTokDiscoverChannel)
    registry.register_discover("hackernews", HackerNewsDiscoverChannel)
```

### Testing Requirements (Phase 6)
- Each channel's `scrape_competitor()` returns valid data (mock tests)
- `registry.list_platforms()` returns all 5 channels
- HN channel returns scored topics from Algolia API

---

## Phase 7: Polish & Launch Prep (Week 5-6)

### Goal
Harden the system with error handling, rate limiting, observability, and security.

### Dependencies
- All previous phases

### Acceptance Criteria
- Rate limiting returns 429 when exceeded
- Sentry captures and reports errors
- PostHog tracks key events
- Feature flags control beta access
- No N+1 query patterns in API

### Task 7.1: Rate Limiting

**`/Users/yogi/mcl/packages/api/app/middleware/rate_limit.py`**:
```python
"""Token bucket rate limiting via Redis."""
from fastapi import Request, HTTPException
from redis.asyncio import Redis
import time


class RateLimiter:
    def __init__(self, redis: Redis, requests_per_minute: int = 60):
        self.redis = redis
        self.rpm = requests_per_minute

    async def check(self, key: str) -> bool:
        now = int(time.time())
        window = f"rate:{key}:{now // 60}"
        count = await self.redis.incr(window)
        if count == 1:
            await self.redis.expire(window, 60)
        return count <= self.rpm


async def rate_limit_middleware(request: Request, call_next):
    # Extract user/API key identifier
    # Check rate limit
    # Return 429 if exceeded
    response = await call_next(request)
    return response
```

### Task 7.2: Sentry Integration

Add to `packages/api/app/main.py`:
```python
import sentry_sdk
from app.config import Settings

settings = Settings()
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment=settings.environment,
    )
```

### Task 7.3: PostHog Analytics

Add to `packages/web/src/lib/analytics.ts`:
```typescript
import posthog from 'posthog-js'

export function initAnalytics() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
    })
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties)
}
```

Key events to track:
- `workspace_created`
- `brain_onboarded`
- `discovery_run` (with mode: competitors/keywords/both)
- `angle_created`
- `script_created`
- `analytics_run`
- `pdf_downloaded`

### Task 7.4: Feature Flags

Use PostHog feature flags for beta access control:
```typescript
// In App.tsx
const isBetaUser = useFeatureFlagEnabled('beta-access')
```

### Task 7.5: Error Handling

Create a global error handler in FastAPI:
```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import sentry_sdk
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": sentry_sdk.last_event_id()},
    )
```

### Task 7.6: Performance Optimization

- Add database connection pooling via Supabase pgbouncer
- Add Redis connection pooling in ARQ worker
- Implement pagination on all list endpoints (default limit=50, max limit=200)
- Add `select` parameter to list endpoints for sparse fieldsets
- Cache brain data in Redis with 5-minute TTL to avoid repeated DB reads

### Task 7.7: Security Audit Checklist

- [ ] All endpoints require authentication
- [ ] RLS policies tested with cross-workspace queries
- [ ] API keys are hashed (bcrypt) before storage
- [ ] CORS configured for production domain only
- [ ] Rate limiting active on all endpoints
- [ ] Input validation via Pydantic on all request bodies
- [ ] SQL injection impossible (using Supabase client, not raw SQL)
- [ ] Secrets not logged (filter API keys from logs)
- [ ] File uploads validated (PDF generation input sanitized)

### Task 7.6: Stripe Webhook Handler

Implement `POST /webhooks/stripe` endpoint handling:
- `customer.subscription.updated` -- sync status to `subscriptions` table
- `invoice.payment_failed` -- set subscription status to `past_due`, start 7-day grace period before downgrade
- `customer.subscription.deleted` -- set status to `canceled`, downgrade workspace to free plan

Grace period: 7 days on payment failure before automatic downgrade to free tier.

### Testing Requirements (Phase 7)
- Rate limiter returns 429 after threshold
- Sentry receives test error event
- PostHog receives test analytics event
- Security checklist 100% complete

---

## Phase 8: Beta Launch

### Goal
Ship to invite-only beta users with monitoring, feedback collection, and billing preparation.

### Dependencies
- All previous phases

### Acceptance Criteria
- 10 beta users can sign up and complete full pipeline
- Monitoring dashboards show system health
- Feedback widget captures user input
- Stripe integration points identified for future billing

### Task 8.1: Invite-Only Beta

- Use PostHog feature flag `beta-access` to gate sign-ups
- Create invite code system: `workspaces.invite_code` column
- Landing page collects email for waitlist (Framer/Webflow -- separate)

### Task 8.2: Monitoring Dashboards

Set up Sentry performance monitoring:
- API response time P50/P95/P99
- Error rate by endpoint
- Background job completion rate
- Redis queue depth

### Task 8.3: Feedback Collection

Add in-app feedback widget:
- Intercom or Canny integration
- "Report a bug" button in sidebar
- NPS survey after first pipeline completion

### Task 8.4: Terms of Service & Legal

- [ ] Draft Terms of Service with AI content IP ownership clause: "All content generated through MCL (scripts, hooks, angles, carousels, infographics) is owned by the user. MCL retains no intellectual property rights over user outputs."
- [ ] Add agency content ownership clause: content ownership follows the workspace -- agency-generated content for a creator workspace belongs to that workspace's owner (the creator), unless workspace access grants specify otherwise
- [ ] Publish TOS at `app.microcelebritylabs.com/terms`
- [ ] Add TOS acceptance checkbox to sign-up flow
- [ ] Include Instagram scraping TOS acknowledgment for CLI users
- [ ] Include data processing agreement for GDPR compliance
- [ ] Legal review of TOS document

### Task 8.5: Billing Preparation (Stripe Integration Points)

Identify where billing hooks will go (not implemented yet):

| Hook Point | Location | Trigger |
|-----------|---------|---------|
| Plan check | `middleware/tenancy.py` | Every API request checks `workspace.plan` |
| Usage metering | `jobs/*.py` | Each pipeline job increments usage counter |
| Upgrade gate | `pipeline.py` routes | Return 403 with upgrade prompt when limit hit |
| Webhook handler | `routes/billing.py` | `POST /api/v1/webhooks/stripe` |

Plan limits (for future implementation):
- **Free**: 1 workspace, 50 topics/month, 10 scripts/month, 1 competitor
- **Pro** ($29/mo): 3 workspaces, unlimited topics, unlimited scripts, 10 competitors
- **Agency** ($79/mo): 10 workspaces, unlimited everything, 25 competitors, team collaboration

### Testing Requirements (Phase 8)
- Beta user can complete: sign up -> onboard -> discover -> angle -> script -> analyze
- Monitoring dashboard shows all key metrics
- Feedback widget submits successfully

---

## Parallel Track Model (Team Execution)

The week-by-week phases above assume a solo developer. For a team of 3, execution should follow **parallel tracks** with explicit integration points:

### Track Layout

```
Week:    1       2       3       4       5       6       7       8
         |       |       |       |       |       |       |       |
Track A: [===== Pipeline + CLI (Dev 1) ======]  |       |       |
         Phase 0 + Phase 1 + Phase 5 + Phase 6  |       |       |
         Scaffold, Pydantic models, scoring,     |       |       |
         recon, channels, CLI commands            |       |       |
                                                  |       |       |
Track B: [===== FastAPI + DB + Auth (Dev 2) =====]       |       |
         Phase 0 + Phase 2 + Phase 3                     |       |
         Supabase schema, RLS, auth, REST routes,        |       |
         job dispatch, WebSocket ticket auth              |       |
                                                          |       |
Track C: [======= React Dashboard + AI Chat (Dev 3) ======]      |
         Phase 0 + Phase 4 (depends on Track B's API)             |
         Vite scaffold, auth, pages, components,                   |
         TanStack Query, Realtime subscriptions                    |
                                                                   |
All:                                     [== Integration + Polish ==]
                                         Phase 7 + Phase 8
                                         Rate limiting, monitoring,
                                         E2E tests, beta launch
```

### Track Details

| Track | Owner | Duration | Phases | Key Deliverables |
|-------|-------|----------|--------|-----------------|
| **A: Pipeline + CLI** | Dev 1 | 3-4 weeks | 0, 1, 5, 6 | `mcl-pipeline` package, Pydantic models, scoring engine, recon module, channel plugins, CLI commands |
| **B: FastAPI + DB + Auth** | Dev 2 | 3-4 weeks | 0, 2, 3 | Supabase schema + migrations, RLS policies, brain audit log, auth flows, REST routes, WebSocket ticket auth, ARQ workers |
| **C: React Dashboard + AI Chat** | Dev 3 | 4-5 weeks | 0, 4 | Vite + React scaffold, auth UI, dashboard home screen, pipeline pages, brain viewer, weight sliders, AI coaching chat |
| **Integration + Polish** | All | 2 weeks | 7, 8 | E2E flow testing, rate limiting, Sentry, PostHog, feature flags, beta launch |

### Track Dependencies

```
Track A ──(Pydantic models, Pipeline API)──> Track B (imports mcl-pipeline)
Track B ──(REST API endpoints, OpenAPI spec)──> Track C (generated TS client)
Track A ──(no dependency on B or C for core work)
Track C ──(blocked on Track B for API integration, weeks 3-4)
```

- **Track C starts API integration in week 3** when Track B has auth + core CRUD routes ready
- **Track A is independent** for most of its duration -- Dev 1 can work on pipeline package without waiting
- **Integration phase starts week 6-7** when all three tracks converge

### Beta Target: Week 7-8

By week 7, the minimum viable product should be functional:
- Full pipeline flow (discover -> angle -> script -> analyze) via web and CLI
- Multi-tenant auth with workspace isolation
- Dashboard with pipeline status board
- At least YouTube + Instagram channels working

---

## Future: v2 Offline Mode

Offline mode is deferred to v2. The v1 CLI requires an internet connection for all operations.

**v2 Approach: Option C -- Server-Wins Sync with Conflict Flagging**

- CLI caches workspace data locally for offline reads and writes
- On reconnect, local changes sync to the server using a server-wins conflict resolution strategy
- Conflicts (e.g., brain edits made on two devices while offline) are flagged for user review rather than silently overwritten
- Brain conflicts are the highest-risk scenario and will require per-section merge logic
- Sync protocol to be designed as part of the v2 planning phase

---

## Future Integrations

The following integrations are planned for Phase 2/3 of the MCL roadmap:

### 1. Zernio -- Social Media Publishing & Engagement

**What it does:** Social media posting to multiple platforms, comment management, and DM management.

**MCL Impact:**
- Powers the "publish" stage of the pipeline, replacing manual posting
- Enables direct posting from both the web dashboard and CLI (`mcl publish <script_id> --platform=youtube`)
- Comment and DM management provides engagement data that feeds back into the analytics/brain evolution loop
- Eliminates the manual "paste URL" step -- publishing through Zernio auto-links the platform content ID to the script record

**Phase:** 2 (post-beta)

### 2. Remotion -- React-Based Video & Visual Content Generation

**What it does:** React-based programmatic video editing, carousel creation, and infographic design.

**MCL Impact:**
- Powers video generation from script data (automated YouTube shorts, Instagram Reels)
- Enables carousel creation from script sections and key points (Instagram carousels, LinkedIn slides)
- Generates infographics from topic/angle data (Pinterest, LinkedIn)
- CLI users can generate visual content programmatically: `mcl design <script_id> --carousel`
- Can create YouTube thumbnails from script metadata (title, hook pattern, key visual cue)
- The carousel/infographic generation mentioned in the CLI value proposition section is powered by Remotion

**Phase:** 2/3 (carousel/infographic in Phase 2, video generation in Phase 3)

---

## V2 Roadmap -- Deferred Features

The following features are explicitly deferred from v1. Each is described with its rationale for deferral. This section serves as the canonical list of planned future work, cross-referenced with the PRD's V2 Roadmap section.

### V2.0 -- Platform Expansion & Publishing

1. **Zernio Integration** -- Direct posting to multiple social media platforms (YouTube, Instagram, TikTok, LinkedIn, X) from both web dashboard and CLI. Comment management and DM management across platforms. Replaces manual "Mark as Published" with automated publishing pipeline. *Deferred because:* Zernio API integration requires stable v1 pipeline first; publishing automation adds significant complexity to error handling and state management.

2. **Remotion Integration** -- React-based video editing within MCL. Generate videos, carousels, infographics, and YouTube thumbnails programmatically from script data. CLI users can generate visual content directly. Powers the carousel/infographic design features. *Deferred because:* Remotion integration requires mature script data structures and is a large engineering effort orthogonal to the core pipeline.

3. **LinkedIn Channel** -- Full discover + analyze via Apify integration. Complete LinkedIn content feedback loop. *Deferred because:* LinkedIn API is heavily restricted; requires Apify or similar third-party scraping, adding cost and reliability concerns.

4. **X/Twitter Channel** -- Full discover + analyze via official API or community libraries. *Deferred because:* X API pricing is prohibitive for a v1 launch; needs user validation that this channel has sufficient demand.

5. **Direct Publishing from CLI** -- `mcl publish --platform youtube --script <id>` posts directly via Zernio integration. *Deferred because:* Depends on Zernio integration (item 1).

### V2.1 -- Offline & Sync

6. **Offline Mode** -- `mcl --offline` stores data locally in `~/.mcl/data/`. Works without internet connection. *Deferred because:* Requires local storage layer, conflict detection, and sync protocol design -- significant architectural complexity.

7. **Server-Wins Sync** -- `mcl sync` pulls server state, merges local-only items (new topics, scripts) without overwriting server changes. Conflicts flagged for manual review in a sync resolution UI. *Deferred because:* Sync protocols are notoriously complex; needs v1 usage data to understand real conflict patterns.

8. **Conflict Resolution UI** -- Dashboard page showing sync conflicts with side-by-side diff and resolve buttons. *Deferred because:* Depends on offline mode and sync (items 6-7).

### V2.2 -- Accessibility & Internationalization

9. **Mobile-Responsive Dashboard** -- Full mobile responsiveness for all dashboard pages. Filming cards optimized for on-set mobile use with large text and swipe navigation. *Deferred because:* v1 focuses on desktop-first workflow; mobile optimization requires dedicated design pass.

10. **Mobile App** -- Native mobile app for analytics checking, content calendar, and filming card reference on set. *Deferred because:* Web dashboard is mobile-responsive for v1; native app not justified until user demand is validated.

11. **WCAG AA Accessibility** -- Full keyboard navigation, screen reader support, color contrast compliance, focus management across all dashboard pages. *Deferred because:* Requires dedicated accessibility audit and remediation pass after v1 UI is stable.

12. **Internationalization (i18n)** -- Multi-language UI. Non-English content generation with localized AI prompts, hook patterns, and contrast formula adaptations. *Deferred because:* v1 is English-only; localization requires translating all UI strings, re-tuning AI prompts per language, and validating hook patterns cross-culturally.

### V2.3 -- Advanced Analytics & Intelligence

13. **Cross-Creator Benchmarking** -- Agency-level analytics comparing performance across all managed creators. Industry benchmarks by niche. *Deferred because:* Requires anonymized data aggregation, privacy considerations, and sufficient multi-tenant data volume.

14. **Predictive Analytics** -- Brain uses historical data to predict which topics/hooks will perform best before publishing. *Deferred because:* Requires sufficient performance data per workspace to train meaningful predictions; needs v1 feedback loop running first.

15. **A/B Testing** -- Generate multiple hook variants, publish both, track which performs better, auto-update brain. *Deferred because:* Depends on direct publishing (item 1) and requires statistical significance calculations and experiment management UI.

### V2.4 -- Enterprise

16. **SSO (SAML/OIDC)** -- Enterprise single sign-on for agency clients. *Deferred because:* Enterprise feature; v1 uses Supabase Auth (email + OAuth). SSO requires Supabase Enterprise or custom SAML/OIDC integration.

17. **Audit Logs Dashboard** -- Full audit trail of all brain changes, content actions, and team member activities visible in dashboard. *Deferred because:* `brain_audit_log` table exists in v1 but a dedicated dashboard UI is an enterprise feature requiring design and development.

18. **White-Label** -- Agencies can white-label MCL under their own brand for their clients. *Deferred because:* Requires significant frontend customization infrastructure (dynamic theming, custom domains, branded emails).

19. **Custom AI Model Support** -- Bring your own fine-tuned model for content generation. Azure OpenAI support. *Deferred because:* Requires model adapter abstraction, Azure OpenAI SDK integration, and per-workspace model configuration UI.

---

## Appendix A: GVB File Reference Quick-Lookup

For any GVB file, find its MCL destination:

```
goviralbitch/recon/__init__.py           -> packages/pipeline/mcl_pipeline/recon/__init__.py
goviralbitch/recon/config.py             -> packages/pipeline/mcl_pipeline/recon/config.py
goviralbitch/recon/bridge.py             -> packages/pipeline/mcl_pipeline/recon/bridge.py
goviralbitch/recon/tracker.py            -> packages/pipeline/mcl_pipeline/recon/tracker.py
goviralbitch/recon/scraper/youtube.py    -> packages/pipeline/mcl_pipeline/recon/scraper/youtube.py
goviralbitch/recon/scraper/instagram.py  -> packages/pipeline/mcl_pipeline/recon/scraper/instagram.py
goviralbitch/recon/scraper/downloader.py -> packages/pipeline/mcl_pipeline/recon/scraper/downloader.py
goviralbitch/recon/skeleton_ripper/*     -> packages/pipeline/mcl_pipeline/recon/skeleton_ripper/*
goviralbitch/recon/storage/models.py     -> packages/pipeline/mcl_pipeline/recon/storage/models.py
goviralbitch/recon/storage/database.py   -> packages/pipeline/mcl_pipeline/recon/storage/database.py
goviralbitch/recon/utils/logger.py       -> packages/pipeline/mcl_pipeline/recon/utils/logger.py
goviralbitch/recon/utils/retry.py        -> packages/pipeline/mcl_pipeline/recon/utils/retry.py
goviralbitch/recon/utils/state_manager.py -> packages/pipeline/mcl_pipeline/recon/utils/state_manager.py
goviralbitch/scoring/engine.py           -> packages/pipeline/mcl_pipeline/scoring/engine.py
goviralbitch/scoring/rescore.py          -> packages/pipeline/mcl_pipeline/scoring/rescore.py
goviralbitch/skills/last30days/          -> packages/pipeline/mcl_pipeline/skills/last30days/
goviralbitch/skills/last30days/scripts/briefing.py -> packages/pipeline/mcl_pipeline/skills/last30days/briefing.py
goviralbitch/scripts/generate-pdf.py     -> packages/pipeline/mcl_pipeline/pdf/generator.py
goviralbitch/data/cta-templates.json     -> packages/pipeline/mcl_pipeline/data/cta_templates.json
goviralbitch/schemas/*.schema.json       -> packages/pipeline/mcl_pipeline/schemas/*.py
goviralbitch/.claude/commands/viral-*.md -> packages/pipeline/mcl_pipeline/prompts/*.py
```

## Appendix B: Environment Variables

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | API, Worker | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Web | Supabase anonymous key (for client-side auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | API, Worker | Supabase service role key (bypasses RLS) |
| `REDIS_URL` | Yes | API, Worker | Redis connection string |
| `OPENAI_API_KEY` | Yes | Pipeline | LLM provider for extraction, transcription |
| `ANTHROPIC_API_KEY` | No | Pipeline | Fallback LLM provider |
| `YOUTUBE_DATA_API_KEY` | No | Pipeline | YouTube Data API v3 — only for local/CLI mode. In SaaS mode, keys are stored encrypted per-workspace in `channel_credentials` (BYOK for free tier, MCL-managed for paid tier). Rate limiting is per-key. |
| `SENTRY_DSN` | No | API, Worker | Error tracking |
| `POSTHOG_API_KEY` | No | Web | Product analytics |
| `VITE_SUPABASE_URL` | Yes | Web | Client-side Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Web | Client-side Supabase key |
| `VITE_API_URL` | Yes | Web | API base URL. Dev: `http://localhost:8000`, Prod: `https://api.microcelebritylabs.com` |
| `VITE_POSTHOG_KEY` | No | Web | Client-side PostHog key |
| `RESEND_API_KEY` | No | API | Resend transactional email API key |

## Appendix C: Commands Quick Reference

```bash
# Development setup
cd /Users/yogi/mcl
python3 -m venv .venv && source .venv/bin/activate
pip install -e "packages/pipeline[dev]"
pip install -e packages/api
pip install -e packages/cli
cd packages/web && npm install

# Run everything locally
docker compose -f infra/docker-compose.yml up redis -d
cd infra/supabase && npx supabase start
cd /Users/yogi/mcl && uvicorn apps.api.app.main:app --reload --port 8000
cd packages/web && npm run dev
arq apps.worker.worker.main.WorkerSettings

# Run tests
pytest packages/pipeline/tests/ -v --cov
pytest packages/api/tests/ -v
cd packages/web && npm test

# Supabase migrations
cd infra/supabase && npx supabase db reset
cd infra/supabase && npx supabase gen types typescript --local > ../../packages/web/src/api/database.types.ts

# CLI
mcl onboard
mcl discover --all
mcl angle <topic_id>
mcl script <angle_id> --longform
mcl publish --script <id> --url <url>
mcl analyze
mcl brain show
```

---

## Revision History

| Date | Changes | Resolution |
|------|---------|-----------|
| 2026-03-24 | Initial draft | -- |
| 2026-03-24 | **Appendix B (Environment Variables)**: Updated `YOUTUBE_DATA_API_KEY` description to reflect BYOK/MCL-managed model. Updated `.env.example` comment. | Resolution 2: YouTube API -- BYOK + Paid Fallback |
| 2026-03-24 | **Phase 1**: Added Task 1.0 (PipelineConfig Dependency Injection) as first Phase 1 task. Lists all 14 GVB files and ~30 path constants requiring refactor. Includes `PipelineConfig` dataclass with `BrainLoader`, `CacheBackend`, `StorageBackend` protocol interfaces. | Resolution 4: Hardcoded Paths -> PipelineConfig |
| 2026-03-24 | **All sections**: Standardized monorepo structure from mixed `apps/` + `packages/` to `packages/` only. `apps/api` -> `packages/api`, `apps/web` -> `packages/web`, `apps/cli` -> `packages/cli`, `apps/worker` -> `packages/worker`. Updated architecture diagram, directory tree, Dockerfiles, CI config, and all code references. | Resolution 5: Monorepo Structure -- Standardize on packages/ |
| 2026-03-24 | **Phase 2 (Task 2.1)**: Added `brain_audit_log` table, `updated_by` column to `brains`, changed `version` from TEXT semver to INTEGER for optimistic locking. | Resolution 6: Brain Optimistic Locking |
| 2026-03-24 | **GVB Source Mapping**: Added `fetch-yt-analytics.py` -> `mcl_pipeline/analytics/youtube_analytics.py` and `fetch-ig-insights.py` -> `mcl_pipeline/analytics/instagram_insights.py`. | Resolution 8: Analytics Collector |
| 2026-03-24 | **Phase 2 (Task 2.1)**: Added CHECK constraints on topics.status and scripts.status generated from TopicStatus/ScriptStatus enums. | Resolution 9: Status Enum Single Source of Truth |
| 2026-03-24 | **New section**: Parallel Track Model for team execution. Track A (Pipeline + CLI, 3-4 weeks), Track B (FastAPI + DB + Auth, 3-4 weeks), Track C (React + AI Chat, 4-5 weeks), Integration (2 weeks). Beta target week 7-8. | Resolution 15: Timeline Parallel Track Model |
| 2026-03-24 | **Phase 2 (Task 2.1)**: Added `dead_letter_jobs` table to database migrations with auto-retry status tracking. | Resolution 16: Dead Letter Queue with Auto-Retry |
| 2026-03-24 | **New sections**: "Future: v2 Offline Mode" (server-wins sync with conflict flagging) and "Future Integrations" (Zernio for publishing/engagement, Remotion for video/carousel/infographic generation). | Resolution 17: Offline Mode -- v1 Online Only; Resolution 24: Future Integrations |
| 2026-03-24 | **Phase 2 (Task 2.1)**: Added `is_system BOOLEAN DEFAULT false` to `swipe_hooks` table. ~50 seed hooks copied to every new workspace. | Resolution 19: Swipe Hooks -- Seed Library + Auto Recon |
| 2026-03-24 | **Task 3.3**: Added `PATCH /scripts/{id}/publish` endpoint to route table. | Resolution 21: Mark as Published Flow |
| 2026-03-24 | **Phase 0**: Added `GET /health` endpoint and Docker HEALTHCHECK to acceptance criteria. | Resolution 23: Health Check Endpoint |
| 2026-03-24 | **Phase 2 (Task 2.1)**: Added `plans` and `workspace_usage` tables to database migrations. Added `updated_at` triggers and RLS policies for both tables. | Resolution 24: Admin-Configurable Plan Limits |
| 2026-03-24 | **GVB Source Mapping**: Updated `recon/tracker.py` entry with `recon_tracker_state` table details (workspace_id, platform, handle, seen_urls, duplicate prevention via `source.url` check). | Resolution 25: Port tracker.py -- Duplicate Prevention |
| 2026-03-24 | **GVB Source Mapping**: Updated `recon/utils/state_manager.py` entry -- replace Redis hash storage with `jobs.progress` JSONB column. Checkpoint stages (SCRAPING -> TRANSCRIBING -> EXTRACTING -> AGGREGATING -> SYNTHESIZING). On DLQ auto-retry, resume from last completed stage. | Resolution 26: Port state_manager.py -- Job Checkpoints |
| 2026-03-24 | **Phase 8**: New Task 8.4 (Terms of Service & Legal) -- draft TOS with AI content IP ownership clause, agency content ownership, TOS acceptance in sign-up flow, Instagram CLI TOS acknowledgment, GDPR DPA, legal review. Existing Task 8.4 renumbered to Task 8.5. | Resolution 32: User Owns All AI-Generated Content IP |
| 2026-03-24 | **Fixes 41-59**: (1) Added `bcrypt>=4.0`, `resend>=2.0`, `structlog>=23.0` to API deps. (2) Added Worker Dockerfile. (3) Added `scripts/generate-openapi.sh` for offline spec generation, committed `docs/api/openapi.json`, updated TS client generation to use committed spec as default. (4) Added Task 3.6 (API test scaffolding) and Task 3.7 (email service). (5) Added `anthropic>=0.18`, `google-generativeai>=0.4`, `openai>=1.12` to pipeline deps. (6) Added ESLint setup to web scaffold. (7) Added `mypy`, `pytest packages/api/tests/`, `npm test`, `npm run lint` to CI. (8) Added `VITE_API_URL`, `RESEND_API_KEY` to env vars; updated vite proxy to use `VITE_API_URL`. (9) Added `workspace_connections` and `subscriptions` tables with RLS. (10) Added TypeScript database types generation task. (11) Added Stripe webhook handler task (Phase 7). (12) Expanded last30days directory structure to match actual GVB source. | Fixes 41-59 |
| 2026-03-24 | **Task 0.6**: Replaced `click>=8.0` with `typer[all]>=0.9` in CLI pyproject.toml. Rewrote `__main__.py`, `onboard.py`, `discover.py` examples from Click decorator syntax to Typer type-annotated function syntax. Added note about Click plugin compatibility. | Resolution 38: Typer for CLI Framework |
| 2026-03-24 | **GVB Source Mapping**: Added `skills/last30days/scripts/briefing.py` -> `packages/pipeline/mcl_pipeline/skills/last30days/briefing.py` (direct port). Updated Monorepo Structure directory tree and Appendix A quick-lookup. | Resolution 39: Port briefing.py |
| 2026-03-24 | **New section**: V2 Roadmap -- Deferred Features. 19 items across 4 milestone groups (V2.0 Platform Expansion & Publishing, V2.1 Offline & Sync, V2.2 Accessibility & i18n, V2.3 Advanced Analytics, V2.4 Enterprise). Each item includes description and deferral rationale. | V2 Roadmap |
| 2026-03-24 | Final consistency fixes -- 17 issues resolved from post-resolution review. Renamed `agent_brains` to `brains` everywhere, standardized `agency` plan tier (was `team`), added `deleted_at` to workspaces, added `workspace_access_grants` to migration SQL and RLS, added `UNIQUE(workspace_id)` to subscriptions, standardized Dockerfile CMD to `mcl_api.main:create_app --factory`, standardized health check status to `healthy` (was `ok` in some places), standardized WebSocket paths to `/ws/pipeline/{job_id}`. | Post-Resolution Review Fixes 1-17 |
