# MCL Gap Analysis: GVB Source Code vs. MCL Specifications

**Version:** 1.0.0
**Date:** 2026-03-24
**Scope:** All code-level and implementation logic gaps between GVB source and MCL specs (PRD, DESIGN, IMPLEMENTATION-PLAN)

---

## 1. GVB Code Portability Gaps

### GAP-PORT-01: Hardcoded Path Constants
**Severity:** Critical
**Category:** Code Portability

**Description:** GVB uses `Path(__file__).parent` chains to derive all directory paths. These break when the code is extracted into an installable package (`mcl-pipeline`) because `__file__` resolves differently in a site-packages installation.

**Every instance:**

| File | Line(s) | Constant | Value |
|------|---------|----------|-------|
| `recon/config.py` | 13-17 | `PIPELINE_DIR`, `DATA_DIR`, `RECON_DATA_DIR`, `CREDENTIALS_FILE`, `BRAIN_FILE` | `Path(__file__).parent.parent` chain |
| `recon/bridge.py` | 23-26 | `PIPELINE_DIR`, `DATA_DIR`, `RECON_DATA_DIR`, `TOPICS_DIR` | `Path(__file__).parent.parent` chain |
| `recon/tracker.py` | 13-15 | `PIPELINE_DIR`, `STATE_FILE`, `BRAIN_FILE` | `Path(__file__).parent.parent` chain |
| `recon/scraper/youtube.py` | 23 | `DATA_DIR` | `Path(__file__).parent.parent.parent / "data" / "recon"` |
| `recon/scraper/instagram.py` | 25 | `DATA_DIR` | `Path(__file__).parent.parent.parent / "data" / "recon"` |
| `recon/scraper/downloader.py` | 19 | `DATA_DIR` | `Path(__file__).parent.parent.parent / "data" / "recon"` |
| `recon/skeleton_ripper/pipeline.py` | 37 | `RECON_DATA_DIR` | `Path(__file__).parent.parent.parent / "data" / "recon"` |
| `recon/skeleton_ripper/cache.py` | 13 | `CACHE_DIR` | `Path(__file__).parent.parent.parent / "data" / "recon" / "cache"` |
| `recon/storage/database.py` | 10 | `DATABASE_PATH` | `Path(__file__).parent.parent.parent / 'data' / 'recon' / 'recon.db'` |
| `recon/utils/logger.py` | 46 | `self.log_dir` default | `Path(__file__).parent.parent.parent / "data" / "recon" / "logs"` |
| `scoring/engine.py` | 13 | `BRAIN_FILE` | `Path(__file__).parent.parent / "data" / "agent-brain.json"` |
| `scoring/rescore.py` | 16-17 | `PROJECT_ROOT` | `Path(__file__).parent.parent` |
| `scripts/generate-pdf.py` | 281 | `base_dir` | `os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` |
| `recon/web/app.py` | 36-39 | `BASE_DIR`, `PIPELINE_DIR`, `DATA_DIR`, `RECON_DATA_DIR` | `Path(__file__).parent` chains |

**Code Impact:** 14 files, ~30 path constants. Every single one must be replaced with constructor injection or configuration objects.

**Recommended Fix:** The DESIGN spec correctly identifies this (Section 3.2, principle 3) but the IMPLEMENTATION-PLAN's per-file migration notes miss `recon/web/app.py` entirely (this file has 5 hardcoded path constants). The `recon/tracker.py` migration notes also don't mention that `BRAIN_FILE` on line 15 needs removal. Add a `PathConfig` dataclass that all modules receive via constructor injection.

---

### GAP-PORT-02: Config Source Mismatch (Local Files vs. Supabase)
**Severity:** Critical
**Category:** Code Portability

**Description:** GVB's `config.py` reads from three local sources: (1) `.env` file via `os.environ`, (2) `.credentials` file via custom parser (lines 63-78), (3) `agent-brain.json` via `json.load()` (lines 42-60). In MCL, all three become Supabase queries.

**Specific function-level changes required:**

| GVB Function | GVB Source | MCL Replacement | Gap in Spec |
|-------------|-----------|-----------------|-------------|
| `load_competitors()` | `config.py:42` reads `BRAIN_FILE` JSON | DB query: `SELECT * FROM brain_competitors WHERE workspace_id = ?` | Covered in IMPL-PLAN |
| `load_credentials()` | `config.py:63` reads `.credentials` file + env vars | DB query: `SELECT * FROM workspace_connections WHERE workspace_id = ?` | **Gap: no mention of credential encryption at rest** |
| `save_credentials()` | `config.py:96` writes `.credentials` file | DB write: `INSERT INTO workspace_connections` with encrypted values | **Gap: encryption column type not specified in migration SQL** |
| `load_config()` | `config.py:105` composes from all sources | `ReconConfig.from_workspace()` classmethod | Covered in DESIGN |
| `get_ig_competitors()` | `config.py:122` filters by platform | Postgres query with `WHERE platform = 'instagram'` | Covered |
| `get_yt_competitors()` | `config.py:128` filters by platform | Same pattern | Covered |

**Gap in Specs:** The IMPLEMENTATION-PLAN lists `config.py` as "refactor" but does not specify:
1. How Instagram session files (`.session_{username}` at `instagram.py:57`) are stored in a multi-tenant server environment. Instaloader session files are binary data tied to a specific machine. They cannot be stored in Postgres.
2. The `.credentials` file parser accepts freeform `key=value` pairs (line 76). The MCL equivalent needs a defined schema for what keys exist per workspace connection.

**Recommended Fix:** Add a `workspace_credentials` table with columns: `workspace_id`, `platform`, `credential_type`, `encrypted_value`, `expires_at`. For Instaloader sessions, use Redis or ephemeral temp storage on the worker node (sessions must be re-created per worker).

---

### GAP-PORT-03: Bridge JSONL File I/O -> Postgres Rows
**Severity:** High
**Category:** Code Portability

**Description:** `bridge.py` has 4 functions that perform file I/O. Every one needs a different adaptation:

| GVB Function | Line(s) | File Operation | MCL Replacement |
|-------------|---------|----------------|-----------------|
| `load_brain_pillars()` | 29-35 | Reads `BRAIN_FILE`, extracts `pillars[].name` | Accept `brain: AgentBrain` parameter, extract `[p.name for p in brain.pillars]` |
| `load_brain_learning_weights()` | 38-47 | Reads `BRAIN_FILE`, extracts `learning_weights` | Accept `brain: AgentBrain` parameter, use `brain.learning_weights.model_dump()` |
| `save_topics_jsonl()` | 192-227 | Appends to date-stamped JSONL file, deduplicates by ID | Batch `INSERT INTO topics ... ON CONFLICT (id) DO NOTHING` |
| `load_latest_skeletons()` | 230-244 | Glob-searches report directories, reads most recent `skeletons.json` | `SELECT * FROM recon_skeletons WHERE workspace_id = ? ORDER BY created_at DESC LIMIT N` |

**Gap in Specs:** The DESIGN spec correctly shows the refactored `generate_topics_from_skeletons(skeletons, brain: AgentBrain) -> list[Topic]` signature, but:
1. `save_topics_jsonl()` has deduplication logic (lines 207-217: reads existing IDs, skips duplicates). The Postgres replacement needs `ON CONFLICT` handling but the migration SQL in the IMPLEMENTATION-PLAN does not define a unique constraint on `topics.id` or a composite unique on `(workspace_id, title)`.
2. `load_latest_skeletons()` uses filesystem directory ordering for recency. The MCL `recon_skeletons` table needs a `created_at` index, which is not in the migration schema.

**Recommended Fix:** Add `UNIQUE(workspace_id, id)` constraint on topics table. Add `CREATE INDEX idx_recon_skeletons_workspace_created ON recon_skeletons(workspace_id, created_at DESC)`.

---

### GAP-PORT-04: SQLite -> Supabase Postgres Migration
**Severity:** High
**Category:** Code Portability

**Description:** `storage/database.py` defines a SQLite schema with 3 tables + FTS + triggers. `storage/models.py` has full CRUD with raw SQL. The MCL migration is tagged "rewrite" but key differences are unaddressed:

| SQLite Feature | GVB Lines | Postgres Equivalent | Status in Spec |
|---------------|-----------|--------------------|----|
| `CREATE VIRTUAL TABLE assets_fts USING fts5` | `database.py:44-48` | Postgres `tsvector` + `GIN` index | **Not specified.** The IMPL-PLAN says "Remove FTS -- use Supabase full-text search" but doesn't define the `tsvector` column or trigger. |
| `PRAGMA foreign_keys = ON` | `database.py:89` | Postgres has FKs on by default | N/A |
| `sqlite3.Row` row factory | `database.py:88` | Supabase Python client returns dicts | Models need adaptation |
| `Asset.search()` with `MATCH` | `models.py:79-86` | Supabase `.textSearch()` method | Interface change not documented |
| `db_transaction()` context manager | `database.py:93-104` | Supabase has no native transaction support in the Python client | **Critical gap: Supabase client doesn't support multi-statement transactions.** Must use Supabase RPC (stored procedures) or accept eventual consistency. |

**Recommended Fix:** (1) Define a `tsvector` column on `assets` with a `GIN` index in the migration SQL. (2) For transactions, use Supabase RPC functions or Postgres functions. Document that `db_transaction()` will use `supabase.rpc('transactional_upsert', {...})`. (3) Map every `Asset` classmethod to its Supabase equivalent.

---

### GAP-PORT-05: File-Based Cache -> Redis Cache
**Severity:** Medium
**Category:** Code Portability

**Description:** `skeleton_ripper/cache.py` stores transcripts as individual `.txt` files. The interface is clean but the MCL Redis version needs different semantics:

| GVB Method | GVB Behavior | Redis Equivalent | Gap |
|-----------|-------------|------------------|-----|
| `get(platform, username, video_id)` | File read: `{platform}_{username}_{video_id}.txt` | `redis.get(f"transcript:{platform}:{username}:{video_id}")` | Key namespace needs workspace isolation |
| `set(platform, username, video_id, text)` | File write | `redis.set(key, text, ex=TTL)` | **No TTL in GVB. Redis needs one.** What TTL? Not specified. |
| `clear_for_username()` | Glob `{platform}_{username}_*.txt` then delete | `redis.delete(*redis.keys(pattern))` | `KEYS` command is O(N) and blocks Redis. Must use `SCAN`. |
| `get_stats()` | Counts files, sums sizes | Redis `DBSIZE` or custom counter | Approximate only |

**Gap in Specs:** The IMPL-PLAN says "Redis-backed implementation" but:
1. No TTL specified for cached transcripts. Transcripts don't change, so a long TTL (30 days) makes sense. But Redis memory is finite.
2. No workspace-scoped key prefix. If two workspaces scrape the same competitor video, should they share the cache? The spec is silent. Recommendation: share cache (transcript is identical regardless of workspace) but prefix with `transcript:global:`.
3. The `is_valid_transcript()` function (lines 87-91) is pure and needs no change. This is correctly identified.

**Recommended Fix:** Define cache key format as `mcl:cache:transcript:{video_id}` (global, not workspace-scoped -- transcripts are objective data). Set TTL to 30 days. Replace `KEYS` with `SCAN` for `clear_for_username`.

---

### GAP-PORT-06: Logger Local Files -> Sentry + Structured Logging
**Severity:** Medium
**Category:** Code Portability

**Description:** `utils/logger.py` is a 198-line singleton logger that writes to local files with rotation. It needs these changes for MCL:

| GVB Feature | Lines | MCL Requirement | Gap |
|------------|-------|-----------------|-----|
| File rotation (`_rotate_if_needed`) | 69-84 | Not needed in production (stdout + Sentry) | Remove or make optional |
| Console output with ANSI colors | 108-121 | Keep for CLI/local dev. Disable for API workers (stdout is captured by container runtime). | **No conditional logic specified.** |
| Error registry (in-memory dict) | 152-157 | Replace with Sentry breadcrumbs | Not specified in detail |
| Singleton via `__new__` | 34-39 | Problematic in multi-worker environment (each worker gets its own instance). | **Fine for process-isolated workers but the spec should acknowledge this.** |

**Gap in Specs:** The IMPL-PLAN says "Add optional Sentry integration" but:
1. No mention of switching from file-based to `structlog` or `python-json-logger` for structured JSON output compatible with log aggregation (Datadog, CloudWatch, etc.).
2. The `error()` method returns an `error_code` string (line 146). In MCL, this should return a Sentry event ID instead. The caller (`web/app.py:196`, `pipeline.py:191`) uses this for user-facing messages.
3. No log level configuration per environment (DEBUG for dev, WARNING for production).

**Recommended Fix:** Add `structlog` to pipeline dependencies. Keep `ReconLogger` interface but delegate to `structlog` internally. Add `sentry_sdk.init()` in API/worker startup. Pass `sentry_dsn` via config. Configure log level from environment variable.

---

## 2. Concurrency & Race Condition Gaps

### GAP-CONC-01: Concurrent Brain Updates (Read-Modify-Write)
**Severity:** Critical
**Category:** Concurrency

**Description:** Brain evolution (`/viral:update-brain`) and analytics-driven updates perform read-modify-write on the brain. In GVB, this is single-user so no conflict is possible. In MCL:

1. Two ARQ workers processing analytics for the same workspace simultaneously could both read the brain, compute weight updates, and write back -- last write wins, first update lost.
2. A user editing their brain via the dashboard while an analytics job updates `learning_weights` could overwrite the job's changes.
3. The GVB scoring engine calls `load_brain_context()` (`engine.py:29-85`) which reads the entire brain JSON. If the brain is being updated while a scoring run is in progress, the scoring could use stale data.

**Gap in Specs:** The DESIGN spec mentions RLS for workspace isolation but never mentions optimistic locking, pessimistic locking, or version columns. The brain table has `updated_at` but no `version` integer for CAS (compare-and-swap).

**Recommended Fix:** Add `version INT NOT NULL DEFAULT 1` to the brain tables. All brain updates must include `WHERE version = {expected_version}` and increment version. Return 409 Conflict if version mismatch. The API layer retries with fresh data. For the dashboard, use Supabase Realtime to detect concurrent edits.

---

### GAP-CONC-02: Duplicate Job Prevention
**Severity:** High
**Category:** Concurrency

**Description:** GVB's `web/app.py` tracks active jobs in a Python dict (`active_jobs = {}` at line 53). This is process-local. In MCL with multiple API replicas + multiple workers:

1. Nothing prevents a user from triggering two discovery jobs for the same workspace simultaneously.
2. The `active_jobs` dict pattern doesn't scale to multi-process.
3. ARQ has no built-in deduplication by job arguments.

**Gap in Specs:** The DESIGN spec shows job dispatch flow but does not specify:
1. A `jobs` table with `workspace_id` + `job_type` + `status` that prevents duplicate active jobs.
2. An idempotency key on the `POST /discover` endpoint.

**Recommended Fix:** Add a `jobs` table: `(id UUID, workspace_id UUID, job_type TEXT, status TEXT, created_at, completed_at, result JSONB)`. Before enqueuing, check `SELECT 1 FROM jobs WHERE workspace_id = ? AND job_type = ? AND status IN ('pending', 'running')`. Return 409 if exists. Add `idempotency_key` header support on job-creating endpoints.

---

### GAP-CONC-03: Redis Cache Key Isolation
**Severity:** Medium
**Category:** Concurrency

**Description:** If two workspaces monitor the same competitor (e.g., both watch `@mkbhd`), the transcript cache should be shared (transcript content is identical). But workspace-specific analysis results (skeletons, synthesis) must NOT be shared.

**Gap in Specs:** No cache key schema is defined anywhere. The IMPL-PLAN says "Redis-backed" but doesn't distinguish between shared (transcript) and workspace-scoped (analysis) caches.

**Recommended Fix:** Define key namespaces:
- Shared: `mcl:transcript:{platform}:{video_id}` (no workspace prefix)
- Workspace-scoped: `mcl:ws:{workspace_id}:skeleton:{job_id}`
- Rate limit: `mcl:ratelimit:{workspace_id}:{endpoint}`

---

## 3. Data Model Gaps

### GAP-DATA-01: JSONL Append-Only -> Postgres Row-Based Query Patterns
**Severity:** High
**Category:** Data Model

**Description:** GVB uses JSONL files for topics, angles, hooks, scripts, and analytics. The access patterns are fundamentally different:

| GVB Pattern | Frequency | Postgres Equivalent | Missing from Spec |
|------------|-----------|--------------------|----|
| Append a new topic line | Every discovery run | `INSERT INTO topics` | Covered |
| Read all topics for today | On display | `SELECT * FROM topics WHERE workspace_id = ? AND DATE(discovered_at) = ?` | **No index on `discovered_at` in migration SQL** |
| Read entire brain JSON | Every scoring call (`engine.py:52`) | Multiple JOINs across 13+ brain tables or single JSONB column | **The brain split into 13+ tables makes `load_brain_context()` require 5+ queries.** This is a performance regression. |
| Rescore in-place (`rescore.py:95`) | After brain updates | `UPDATE topics SET scoring = ? WHERE workspace_id = ?` (batch) | No batch update mechanism specified |
| Filter topics by status | Dashboard kanban | `SELECT * FROM topics WHERE status = ? AND workspace_id = ?` | **No index on `(workspace_id, status)`** |

**Gap in Specs:** The brain is split into 13+ tables per PRD Section 13 Data Model. This means loading the full brain context (needed by `score_topic()`, `bridge.py`, every pipeline stage) requires joining or querying all 13 tables. Alternative: store brain as a single JSONB column in a `brains` table with one row per workspace. The spec should decide. Currently it says both (13 tables in PRD, single `AgentBrain` Pydantic model in DESIGN).

**Recommended Fix:** Use a single `brains` table with `(workspace_id UUID PRIMARY KEY, data JSONB NOT NULL, version INT, updated_at TIMESTAMPTZ)`. The 13-table approach is normalized but creates a join nightmare for reads that happen on every pipeline call. JSONB gives atomic reads/writes. Use Postgres JSONB operators for partial updates: `UPDATE brains SET data = jsonb_set(data, '{learning_weights,icp_relevance}', '1.5')`.

---

### GAP-DATA-02: Atomic Brain Updates
**Severity:** High
**Category:** Data Model

**Description:** In GVB, `agent-brain.json` is read and written atomically (single file). In the 13-table approach, updating `learning_weights` + `hook_preferences` + `performance_patterns` (all in the same brain evolution cycle) requires 3 separate `UPDATE` statements. If one fails, the brain is partially updated.

**Gap in Specs:** No transaction strategy for multi-table brain updates. Supabase Python client does not support multi-statement transactions natively.

**Recommended Fix:** If using JSONB approach (GAP-DATA-01 fix), this becomes a single `UPDATE`. If keeping 13 tables, wrap in a Postgres function: `CREATE FUNCTION evolve_brain(workspace_id UUID, weight_updates JSONB, hook_updates JSONB, pattern_updates JSONB)` and call via `supabase.rpc()`.

---

### GAP-DATA-03: Scoring Engine Brain Context Loading
**Severity:** High
**Category:** Data Model

**Description:** `scoring/engine.py:load_brain_context()` (lines 29-85) reads the entire brain JSON and extracts 4 sub-structures: `icp_keywords`, `pillar_keywords`, `learning_weights`, `competitor_handles`. This function is called by `score_topic()` which is called for EVERY topic scored. In GVB, that's ~15 topics per run. In MCL, it could be 100+ topics across multiple workspaces.

**Gap in Specs:** The DESIGN spec correctly shows `score_topic(title, description, brain: AgentBrain, ...)` but:
1. The `AgentBrain` Pydantic model must be loaded once per scoring batch, not once per topic.
2. No caching strategy for brain data within a single pipeline run.
3. `build_brain_context(brain: AgentBrain) -> dict` is specified but there's no spec for memoization.

**Recommended Fix:** Load `AgentBrain` once at job start, pass as parameter. The `build_brain_context()` function should be called once and the result reused for all topics in the batch. Add `@functools.lru_cache` or explicit cache parameter.

---

## 4. API Design Gaps

### GAP-API-01: Missing Pagination, Filtering, Sorting Specs
**Severity:** High
**Category:** API Design

**Description:** The PRD lists endpoints like `GET /workspaces/{id}/topics` as "list all topics (paginated, filterable)" but:

1. No pagination format specified (cursor-based vs. offset/limit? `Link` headers vs. response envelope?)
2. No filter parameter names (e.g., `?status=new&pillar=ai&min_score=25`)
3. No sort parameter (e.g., `?sort=-weighted_total`)
4. No max page size defined

**Gap in Specs:** Every list endpoint is underspecified. GVB doesn't have this problem because it reads entire JSONL files.

**Recommended Fix:** Standardize across all list endpoints:
```
?limit=25&offset=0           # Offset pagination (simple, sufficient for v1)
?sort=-weighted_total         # Prefix - for descending
?status=new,developing        # Comma-separated multi-value filter
?q=automation                 # Full-text search
```
Max page size: 100. Default: 25. Response format: `{ data: [...], total: N, limit: N, offset: N }`.

---

### GAP-API-02: File Upload/Download Strategy
**Severity:** Medium
**Category:** API Design

**Description:** PDF export (`GET /scripts/{script_id}/pdf`) and potential transcript upload need file handling:

1. PDF generation can be slow (reportlab). Should it be synchronous or async (job)?
2. Max PDF size? Script PDFs are small (~100KB) but not specified.
3. The `generate-pdf.py` script writes to disk (`scripts/generate-pdf.py:199`). MCL must return bytes or upload to Supabase Storage.
4. No mention of `Content-Disposition` headers for PDF downloads.

**Gap in Specs:** The DESIGN spec mentions Supabase Storage for files but doesn't specify:
- Upload flow (direct to Supabase Storage via signed URL, or through API?)
- File size limits
- MIME type validation

**Recommended Fix:** PDF generation is synchronous (fast, under 2 seconds). Return as streaming response with `Content-Disposition: attachment; filename="{script_id}.pdf"`. Store a copy in Supabase Storage for later retrieval. Max upload size: 50MB (covers video transcripts).

---

### GAP-API-03: Long-Running Operation Polling vs. WebSocket
**Severity:** Medium
**Category:** API Design

**Description:** Discovery and analytics jobs are long-running (minutes). The spec provides WebSocket endpoints for real-time progress but:

1. What if the client can't use WebSockets (CLI via HTTP, some corporate proxies)? No REST polling endpoint for job status.
2. Actually -- `GET /discover/jobs/{job_id}` IS listed. But there's no spec for the response shape (progress percentage, current phase, ETA).
3. No spec for job timeout from the client's perspective. How long should the client wait before considering a job failed?

**Gap in Specs:** The WebSocket message format (PRD Section 10) is minimal. Missing: `estimated_remaining_seconds`, `can_cancel`, `partial_results_available`.

**Recommended Fix:** All job-creating endpoints return `{ job_id, status: "pending", poll_url: "/jobs/{id}" }`. The poll endpoint returns `{ status, progress_pct, phase, message, started_at, estimated_completion }`. Add `DELETE /jobs/{job_id}` for cancellation (sets status to `cancelled`, ARQ worker checks flag).

---

### GAP-API-04: API Versioning Not Specified
**Severity:** Medium
**Category:** API Design

**Description:** The PRD shows `/api/v1/` prefix on all endpoints. But:
1. No strategy for introducing `/api/v2/` (when? what triggers a version bump?)
2. No sunset policy for old versions
3. No versioning for WebSocket protocol

**Recommended Fix:** Document versioning policy: URL-based (`/api/v1/`), breaking changes require new version, old versions supported for 6 months after deprecation.

---

### GAP-API-05: Rate Limiting Bypass via Multiple API Keys
**Severity:** Medium
**Category:** Security/API

**Description:** PRD Section 10 defines rate limits per tier (Free: 60 req/min, Pro: 300, Agency: 1000). But:
1. Rate limits are per-workspace (confirmed by DESIGN: "sliding window per-workspace"). But if a user creates multiple API keys for the same workspace, are they aggregated?
2. What HTTP headers indicate remaining quota? (`X-RateLimit-Remaining`, `Retry-After`)
3. What response body for 429?

**Recommended Fix:** Rate limit by `workspace_id`, not by API key. Multiple keys for one workspace share the same quota. Return standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. 429 body matches error format from PRD Section 10.

---

## 5. Background Job Gaps

### GAP-JOB-01: Partial Failure Handling
**Severity:** Critical
**Category:** Background Jobs

**Description:** GVB's `pipeline.py` (lines 126-198) wraps the entire pipeline in a try/except. If stage 3 (extraction) fails, stages 1-2 results (scraped videos, transcripts) are lost. In MCL at scale, this is wasteful.

**Gap in Specs:** The DESIGN spec shows the pipeline phases but:
1. No partial result saving between stages.
2. No job resumability (if worker crashes mid-transcription, the entire job restarts).
3. `_save_outputs()` (pipeline.py:366-401) only runs at the end. If synthesis fails, skeletons are lost.

**Recommended Fix:** Save intermediate results after each stage:
- After scraping: save raw video metadata to `recon_scrape_results`
- After transcription: save transcripts to Redis cache (already planned) AND `recon_transcripts` table
- After extraction: save skeletons to `recon_skeletons`
- After synthesis: save to `recon_reports`
Each stage reads from the previous stage's persisted output. Jobs can resume from the last completed stage.

---

### GAP-JOB-02: ARQ Job Timeout Configuration
**Severity:** High
**Category:** Background Jobs

**Description:** The IMPLEMENTATION-PLAN sets `job_timeout = 600` (10 minutes) in `WorkerSettings`. But GVB's pipeline can take significantly longer:

- YouTube yt-dlp subprocess: 120s timeout per video (`youtube.py:68`)
- Video download: 300s timeout per video (`youtube.py:149`)
- Whisper transcription: unbounded (no timeout in `downloader.py:144`)
- LLM extraction: 120s per batch (`llm_client.py:75`)

For a job scraping 5 competitors x 3 videos each = 15 videos: worst case is 15 x (120s scrape + 300s download + 300s transcribe + 120s extract) = 12,600 seconds = 210 minutes.

**Gap in Specs:** The 10-minute timeout is far too short for the full pipeline. The spec needs per-stage timeouts and overall job timeout.

**Recommended Fix:** Set `job_timeout = 3600` (1 hour) as the ARQ default. Add per-stage timeouts: scrape (5 min), download (10 min per video), transcribe (5 min per video), extract (5 min per batch), synthesize (3 min). If a stage exceeds its timeout, mark it failed but save partial results (see GAP-JOB-01).

---

### GAP-JOB-03: Job Cancellation Not Supported
**Severity:** Medium
**Category:** Background Jobs

**Description:** ARQ doesn't natively support job cancellation. GVB has no cancellation either (the Flask UI just polls `active_jobs` dict).

**Gap in Specs:** The PRD mentions no cancellation mechanism. But users will want to cancel stuck discovery jobs.

**Recommended Fix:** Add a `cancelled` status to the `jobs` table. Workers check `SELECT status FROM jobs WHERE id = ?` before each stage. If `cancelled`, the worker aborts gracefully. Add `DELETE /jobs/{job_id}` or `POST /jobs/{job_id}/cancel` endpoint.

---

### GAP-JOB-04: Job Queue Fairness
**Severity:** Medium
**Category:** Background Jobs

**Description:** If 100 users trigger discovery simultaneously, all jobs enter a single ARQ queue. A workspace with 10 competitors takes 10x longer than one with 1 competitor, potentially starving other workspaces.

**Gap in Specs:** No queue priority, no per-workspace concurrency limit, no fairness mechanism.

**Recommended Fix:** Use ARQ queue names per job type (`recon`, `discover`, `analytics`). Set `max_jobs = 10` per worker (already in IMPL-PLAN). Add per-workspace concurrency limit: max 2 concurrent jobs per workspace (stored in Redis).

---

### GAP-JOB-05: Dead Letter Queue
**Severity:** Low
**Category:** Background Jobs

**Description:** Failed jobs need debugging. ARQ retries up to `max_tries` then drops the job.

**Gap in Specs:** No mention of DLQ, failed job inspection, or retry policies.

**Recommended Fix:** Set `max_tries = 3` with exponential backoff. On final failure, write to `jobs` table with `status = 'failed'`, `error_detail = JSONB` (traceback, stage, partial results). Expose failed jobs via `GET /jobs?status=failed`.

---

## 6. Security Gaps

### GAP-SEC-01: API Key Generation and Storage
**Severity:** High
**Category:** Security

**Description:** PRD Section 14 mentions API keys for CLI auth but:
1. No key generation algorithm specified (UUID? crypto random? HMAC?)
2. No key format (prefix for identification? e.g., `mcl_live_...`, `mcl_test_...`)
3. Storage: full key or hash? If hashed, what algorithm?
4. No rotation mechanism (create new, revoke old).
5. No key scoping (read-only? workspace-specific? endpoint-specific?)

**Recommended Fix:** Generate keys as `mcl_{env}_{32_char_crypto_random}` (e.g., `mcl_live_a1b2c3...`). Store SHA-256 hash in DB. Show full key only once at creation. Allow multiple keys per workspace. Add `POST /auth/api-keys` (create), `GET /auth/api-keys` (list, masked), `DELETE /auth/api-keys/{id}` (revoke).

---

### GAP-SEC-02: Platform Credential Encryption
**Severity:** High
**Category:** Security

**Description:** User-provided YouTube API keys, Instagram credentials, and OAuth tokens are stored in MCL's database. GVB stores these in `.credentials` (plaintext) and `.env` files. MCL must encrypt them.

**Gap in Specs:** The PRD says "encrypted Supabase vault" but:
1. Supabase Vault is a separate feature that requires `vault.secrets` schema. Not mentioned in migration SQL.
2. No key management strategy (who holds the encryption key? Application-level or Supabase-managed?)
3. Instagram passwords are stored in plaintext in GVB (`config.py:77`). In MCL, they MUST be encrypted at rest.

**Recommended Fix:** Use Supabase Vault (`vault.create_secret()`) for all platform credentials. Application never sees plaintext keys in query results. Workers retrieve credentials via `vault.get_secret()` at job execution time. Alternative: application-level encryption with `Fernet` using a key from environment variable.

---

### GAP-SEC-03: CORS Configuration
**Severity:** Medium
**Category:** Security

**Description:** The IMPL-PLAN shows CORS config in `main.py`:
```python
allow_origins=["http://localhost:5173"],  # Vite dev server
```
This is dev-only. Production needs:
1. `https://app.microcelebritylabs.com` (production SPA)
2. `https://api-staging.microcelebritylabs.com` (staging)
3. No wildcard `*` for credentialed requests

**Gap in Specs:** No production CORS configuration defined.

**Recommended Fix:** Make `CORS_ORIGINS` an environment variable. Default to `["http://localhost:5173"]` in dev. Set to `["https://app.microcelebritylabs.com"]` in production. Add as comma-separated env var in `.env.example`.

---

## 7. Testing Gaps

### GAP-TEST-01: No Test Strategy Defined
**Severity:** High
**Category:** Testing

**Description:** GVB has zero tests. The IMPLEMENTATION-PLAN lists test files in the monorepo structure but:
1. No testing strategy document (unit vs. integration vs. e2e boundaries)
2. No mock strategy for external services (YouTube API, Instagram, LLM providers)
3. No test database strategy (local Postgres? Supabase test project? In-memory SQLite?)
4. No fixture strategy (sample brain, sample topics, sample skeletons)

**Gap in Specs:** CI runs `pytest packages/pipeline/tests/ -v --cov=mcl_pipeline` but:
1. Pipeline tests need Redis (CI has it) but NOT Supabase (CI doesn't provision it).
2. How do you test `score_topic()` without a real brain? Need factory fixtures.
3. How do you test `SkeletonRipperPipeline` without real YouTube/Instagram/LLM APIs? Need comprehensive mocks.
4. Frontend tests not mentioned at all (no Playwright, Vitest, or React Testing Library).

**Recommended Fix:** Define four test layers:
1. **Unit** (pipeline package): Pure function tests with factory fixtures. Mock all I/O. Target: 80% coverage.
2. **Integration** (API): Test against local Supabase + Redis. Use `testcontainers` or `supabase start`.
3. **E2E** (frontend): Playwright against local stack.
4. **Fixtures**: Create `tests/factories/` with `BrainFactory`, `TopicFactory`, `SkeletonFactory` that produce valid Pydantic models.

---

## 8. Performance Gaps

### GAP-PERF-01: Memory Profile of yt-dlp Subprocesses
**Severity:** High
**Category:** Performance

**Description:** GVB's `youtube.py` spawns `subprocess.run(["yt-dlp", ...])` (lines 56-68, 138-150). In MCL with 10 concurrent workers each scraping, that's 10+ yt-dlp subprocesses. Each yt-dlp process uses 50-200MB RAM.

**Gap in Specs:** No memory limits per worker. No subprocess pool. ARQ's `max_jobs = 10` means 10 concurrent pipeline executions, each potentially spawning multiple yt-dlp processes.

**Recommended Fix:** Set `max_jobs = 3` per worker for recon jobs (separate queue from lightweight jobs). Use a semaphore in the worker to limit concurrent subprocess spawns to 2 per worker. Monitor worker memory via Sentry performance.

---

### GAP-PERF-02: LLM Cost Optimization
**Severity:** High
**Category:** Performance

**Description:** GVB's `llm_client.py` makes individual API calls per batch. At MCL scale:

1. Skeleton extraction: 4 transcripts per batch x N batches per job x M concurrent jobs = potentially hundreds of LLM calls per minute.
2. No request batching across workspaces (e.g., if two workspaces scrape the same competitor, the LLM extraction is run twice).
3. No cost tracking per workspace.
4. PRD Section 8.4 estimates costs but no enforcement mechanism.

**Gap in Specs:** The `ai_usage` table is mentioned but:
1. No trigger to enforce usage limits (what happens at 80%? 100%?)
2. No alerting for cost spikes
3. No caching of LLM extraction results per video (only transcript caching exists)

**Recommended Fix:** Cache LLM extraction results by `hash(transcript_text)` in Redis (TTL 7 days). Track tokens per workspace in `ai_usage` table. Check budget before each LLM call. Return 429 with `retry_after` when budget exceeded.

---

### GAP-PERF-03: Brain Loading Performance
**Severity:** Medium
**Category:** Performance

**Description:** If brain is split into 13 tables (per PRD Section 13), loading the full brain requires 13 queries or a complex JOIN. `score_topic()` needs the full brain context. In GVB, this is a single `json.load()` (~1ms). In MCL with 13 tables, it could be 13 x 5ms = 65ms per load.

**Gap in Specs:** No query optimization strategy for brain loading. No caching layer between DB and pipeline.

**Recommended Fix:** (Reiterating GAP-DATA-01) Use single JSONB column for brain. If 13 tables are kept, add a materialized view or cached JSONB column that's rebuilt on brain update.

---

## 9. Missing GVB Feature Gaps

### GAP-FEAT-01: Recon Web UI (Flask App) -> React Dashboard
**Severity:** Medium
**Category:** Missing Features

**Description:** GVB's `recon/web/app.py` is a full Flask dashboard (383 lines) with:
- Competitor listing with scrape status (`api_list_competitors`, lines 88-126)
- Individual competitor scraping with background threads (`api_scrape_competitor`, lines 129-199)
- Scrape-all functionality (`api_scrape_all`, lines 202-223)
- Skeleton ripper execution (`api_run_analysis`, lines 239-301)
- Push-to-discover bridge (`api_push_to_discover`, lines 304-324)
- Settings management (`api_get_settings`, `api_save_settings`, lines 331-358)
- Job status polling (`api_job_status`, lines 226-232)

**Gap in Specs:** The MCL React dashboard `Recon.tsx` page is listed but:
1. The Flask API routes map 1:1 to MCL API routes, which IS covered.
2. BUT the Flask app uses Python threads for background jobs (`Thread(target=run_scrape, daemon=True).start()` at line 198). MCL replaces this with ARQ. The thread-to-ARQ migration for the recon workflow is not explicitly documented.
3. The `active_jobs` in-memory dict (line 53) for job tracking is not mapped to the MCL `jobs` table.

**Recommended Fix:** Document the Flask-to-FastAPI route mapping explicitly. Ensure every Flask endpoint has a corresponding FastAPI route + ARQ job.

---

### GAP-FEAT-02: PDF Generation
**Severity:** Low
**Category:** Missing Features

**Description:** `scripts/generate-pdf.py` (310 lines) is listed in the IMPL-PLAN as mapping to `mcl_pipeline/pdf/generator.py`. The DESIGN spec shows `generate_pdf(script: Script, brain: AgentBrain) -> bytes`. This is well-covered.

**Remaining gap:** The CLI path `scripts/generate-pdf.py:281` uses `os.path.dirname(os.path.dirname(os.path.abspath(__file__)))` for path resolution. The MCL version must accept all data as parameters (script + brain objects), not file paths.

**Status:** Adequately covered in specs. Low risk.

---

### GAP-FEAT-03: YouTube OAuth in SaaS Context
**Severity:** High
**Category:** Missing Features

**Description:** GVB has `scripts/setup-yt-oauth.py` for local OAuth setup. MCL needs server-managed OAuth:

1. OAuth redirect URI must be server-controlled (`app.microcelebritylabs.com/oauth/callback/youtube`)
2. Refresh tokens must be stored encrypted and auto-refreshed
3. YouTube Data API quota (10,000 units/day) must be tracked per workspace

**Gap in Specs:** PRD Section 5.1 mentions OAuth flows and token refresh via ARQ. BUT:
1. No OAuth scope specification (which YouTube scopes are needed? `youtube.readonly`? `youtube.force-ssl`? `yt-analytics.readonly`?)
2. No token refresh job specification (how often? what triggers it? what happens on refresh failure?)
3. The PRD mentions shared 10,000 units/day across all workspaces. This is insufficient at scale. No plan for per-workspace quota or requesting quota increase.

**Recommended Fix:** Specify OAuth scopes per platform. Add `workspace_oauth_tokens` table with `token_encrypted`, `refresh_token_encrypted`, `expires_at`, `scopes`. Add ARQ cron job to refresh tokens expiring in under 1 hour. Track API usage in `platform_quota_usage` table.

---

### GAP-FEAT-04: Instagram Token Refresh Automation
**Severity:** Medium
**Category:** Missing Features

**Description:** GVB has `scripts/refresh-ig-token.sh` for manual Instagram token refresh. MCL needs automatic refresh.

**Gap in Specs:** PRD mentions "Token refresh handled by background jobs" but:
1. Instagram Graph API long-lived tokens expire in 60 days. Refresh must happen before expiry.
2. Instaloader sessions (used for scraping) are separate from Graph API tokens. They expire on password change or Instagram security events. No automated recovery.
3. If Instagram blocks the scraping account (common with Instaloader), the workspace is stuck. No fallback strategy.

**Recommended Fix:** ARQ cron job runs daily, checks `workspace_connections WHERE platform = 'instagram' AND expires_at < now() + interval '7 days'`. Refreshes tokens via Graph API. For Instaloader session failures, mark connection as `needs_reauth` and notify user.

---

### GAP-FEAT-05: CTA Templates Seed Data
**Severity:** Low
**Category:** Missing Features

**Description:** `data/cta-templates.json` is bundled as package data in the IMPL-PLAN. The migration SQL includes a `cta_templates` table but:
1. No `seed.sql` content shown for CTA templates
2. No migration strategy for updating templates (are they system-level or per-workspace overridable?)

**Status:** Low risk. Add `INSERT INTO cta_templates` statements in `20260324000003_seed_data.sql`.

---

### GAP-FEAT-06: last30days Skill Port
**Severity:** Medium
**Category:** Missing Features

**Description:** The `skills/last30days/` directory is mentioned in the IMPL-PLAN monorepo structure but:
1. No detail on what changes are needed
2. The skill uses OpenAI API directly -- does it go through MCL's LLM client or keep its own?
3. The skill's file-based I/O needs the same refactoring as all other modules

**Gap in Specs:** Tagged as "refactor" in the source mapping table with one sentence: "Port full directory. Replace file-based storage with return values." No function-level migration guide like other modules have.

**Recommended Fix:** Provide the same function-level mapping as done for `bridge.py`, `config.py`, etc. Key function: `research_topic(topic: str, config: ResearchConfig) -> ResearchResult` with all file I/O removed.

---

### GAP-FEAT-07: Tracker State Migration
**Severity:** Medium
**Category:** Missing Features

**Description:** `tracker.py` maintains a JSON file (`tracker-state.json`) tracking which competitor content has been processed. Functions:

| Function | Lines | Purpose | MCL Table |
|----------|-------|---------|-----------|
| `load_state()` | 18-29 | Read JSON state file | `SELECT * FROM tracker_state WHERE workspace_id = ?` |
| `save_state()` | 32-36 | Write JSON state file | `UPSERT INTO tracker_state` |
| `filter_new_content()` | 39-73 | Dedup content items | Query + insert in single transaction |
| `get_stale_competitors()` | 76-116 | Find competitors needing refresh | Query with timestamp comparison |
| `cleanup_old_entries()` | 119-141 | Prune old entries | `DELETE FROM tracker_state WHERE seen_at < ?` |

**Gap in Specs:** The IMPL-PLAN says "Replace STATE_FILE JSON reads/writes with Supabase tracker_state table" but:
1. No table schema defined for `tracker_state`
2. `filter_new_content()` mutates the state dict in-place (line 50-71). In Postgres, this is a `SELECT + INSERT` which needs atomicity.
3. `cleanup_old_entries()` returns a cleaned dict. In Postgres, it's a `DELETE WHERE` query. Return value changes.

**Recommended Fix:** Define table: `tracker_state (id SERIAL, workspace_id UUID, competitor_handle TEXT, content_id TEXT, first_seen_at TIMESTAMPTZ, UNIQUE(workspace_id, competitor_handle, content_id))`. Rewrite `filter_new_content` as: `INSERT INTO tracker_state ... ON CONFLICT DO NOTHING RETURNING *` to atomically detect and record new content.

---

## Summary

| Severity | Count | Categories |
|----------|-------|-----------|
| Critical | 5 | Port paths, brain concurrency, partial failure, config source, duplicate jobs |
| High | 14 | JSONL-to-Postgres, SQLite migration, pagination, API keys, testing, memory, LLM costs, YouTube OAuth, brain loading, job timeout, scoring engine |
| Medium | 14 | Redis cache, logger, cache isolation, file upload, API versioning, rate limiting, CORS, job cancellation, fairness, DLQ, IG refresh, last30days, tracker, recon UI |
| Low | 3 | CTA seed data, PDF generation, dead letter queue |
| **Total** | **36** | |

### Top 5 Risks Requiring Immediate Resolution

1. **GAP-CONC-01 (Critical):** Brain concurrency -- add version column for optimistic locking before any code is written.
2. **GAP-DATA-01 (High):** Decide brain storage strategy (JSONB vs. 13 tables) NOW -- it affects every module.
3. **GAP-JOB-01 (Critical):** Partial failure handling -- design stage-based persistence before porting pipeline.py.
4. **GAP-PORT-01 (Critical):** Path constants -- establish the dependency injection pattern in a single module first, then replicate.
5. **GAP-JOB-02 (High):** Job timeouts -- the 10-minute default will cause silent failures in production.
