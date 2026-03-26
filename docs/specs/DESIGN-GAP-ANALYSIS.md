# Design Spec Gap Analysis Report

| Field | Value |
|-------|-------|
| **Review Date** | 2026-03-24 |
| **Source Document** | `/Users/yogi/mcl/docs/specs/DESIGN.md` (v0.1.0-draft) |
| **Cross-Referenced** | PRD.md v1.0.0, GVB source at `/Users/yogi/content-scale/goviralbitch/` |
| **Total Gaps** | 36 |

---

# DESIGN.md Gap Analysis Report

**Reviewer:** Claude Sonnet 4.6 (devil's advocate mode)
**Date:** 2026-03-24
**Scope:** DESIGN.md v0.1.0-draft vs PRD.md v1.0.0 vs GVB source at `/Users/yogi/content-scale/goviralbitch/`

---

## CRITICAL Gaps

---

**GAP-001**
**Severity:** Critical
**Category:** GVB Code Reuse — Missing Module
**Description:** `recon/utils/state_manager.py` exists in GVB (`StateManager` class, `JobPhase` enum, `save_job_state`, `load_job_state`, `list_jobs`) but is completely absent from the DESIGN.md reuse map (Section 20.1, 20.2) and the monorepo structure (Section 2). The `StateManager` is the persistence layer for job phase tracking used by the recon pipeline. If it is not ported, the pipeline will have no in-process checkpoint recovery — a failed job mid-transcription loses all progress and has no way to resume from the last phase. The `jobs` Postgres table covers high-level status but not the fine-grained phase checkpoints (`JobPhase.SCRAPING/TRANSCRIBING/EXTRACTING/SYNTHESIZING`) that `StateManager` tracks.
**Recommended Fix:** Add `recon/utils/state_manager.py` to Section 20.1 as a direct port. In cloud mode, `StateManager` should write phase checkpoints to the `jobs.progress` JSONB column rather than a local JSON file.

---

**GAP-002**
**Severity:** Critical
**Category:** Database Schema — Missing Constraint, RLS Leak
**Description:** `workspace_members` table (Section 9.1) defines `role CHECK (role IN ('admin', 'editor', 'viewer'))` but the PRD Section 14 and DESIGN Section 9.2's `user_workspace_role()` helper also returns `'admin'` for the workspace owner via the `workspaces` table `owner_id` field. This means the workspace owner is never in `workspace_members` by this schema — they get their role from `workspaces.owner_id`. However, the RLS INSERT policy on `topics` uses `user_workspace_role(workspace_id) IN ('admin', 'editor')`. If the owner creates the workspace and is NOT inserted into `workspace_members`, the `user_workspace_role` function's COALESCE returns `'admin'` from the `workspaces` branch — but there is no test that BOTH code paths return consistently. More critically, when an owner is also added as a member via the invite endpoint (`POST /workspaces/{id}/members`), the `workspace_members.role` CHECK constraint does not include `'owner'` as a valid value, but the DESIGN's authorization matrix (Section 10.4) lists `owner` as a distinct role above `admin`. This is a contradicted constraint: a user cannot be stored with role `'owner'` in `workspace_members` but the `workspaces` table stores them as owner. The `'owner'` role in the permission matrix has different capabilities (billing, delete workspace) from `admin`, but the code has no way to distinguish them at the API layer since the middleware only reads `workspace_members.role`.
**Recommended Fix:** Either (a) add `'owner'` to the `workspace_members` role CHECK constraint and auto-insert the owner as `'owner'` on workspace creation, or (b) explicitly document that owner capabilities are checked via `workspaces.owner_id = auth.uid()` separately from the role check, and add a helper function `user_is_workspace_owner(ws_id UUID)` to the RLS policies.

---

**GAP-003**
**Severity:** Critical
**Category:** Background Job — Dead Letter Queue / Retry Logic Incomplete
**Description:** Section 11.1 sets `max_tries = 3` globally for all job types, but Section 11.2 shows per-job retry counts (e.g., `recon` has 2 retries, `discover_keyword` has 3). ARQ's `WorkerSettings.max_tries` is a global setting — per-function retry configuration requires decorating each function with `@job(max_retries=2)` or equivalent. The spec never shows this decorator usage per worker function. Additionally, there is no dead letter queue (DLQ) definition: after 3 failures, what happens? The `jobs` table gets status `'failed'` but there is no notification, no admin alert, no DLQ table, and no mechanism to requeue manually. The PRD Section 17 states "Job completion: 99.5% — ARQ retry with exponential backoff, dead letter queue" but the DESIGN never specifies the DLQ implementation.
**Recommended Fix:** Define a `dead_letter_jobs` table or a `jobs.dlq_at` column. Add an ARQ `on_job_abort` hook that writes to the DLQ and fires a Sentry alert. Show the per-function `@job(max_retries=N)` decorator pattern in the worker examples.

---

**GAP-004**
**Severity:** Critical
**Category:** Authentication — Token Refresh Not Implemented
**Description:** Section 10.1 mentions "JWT tokens with refresh token rotation" and Section 14 lists `POST /auth/refresh`. However, the `AuthMiddleware` (Section 4.4) only handles `Bearer` JWT and `X-API-Key` — there is no middleware logic for detecting a near-expired JWT and transparently refreshing it. The CLI `CloudRunner` uses a long-lived `httpx.Client` but never refreshes the token. Supabase JWTs expire in 1 hour — any CLI session running a long recon job (up to 10 minutes per Section 11.1) risks mid-job 401s when the token expires. The web frontend's Supabase JS client handles refresh automatically, but the CLI `CloudRunner` has no equivalent.
**Recommended Fix:** Add token refresh logic to `CloudRunner.client` as an `httpx` auth handler that intercepts 401 responses and calls `/auth/refresh`. Document the refresh token storage location in `~/.mcl/auth.json` (the spec only mentions storing the JWT, not the refresh token).

---

**GAP-005**
**Severity:** Critical
**Category:** Pydantic Model vs GVB Schema — `HookPreferences` Field Mismatch
**Description:** The GVB `agent-brain.schema.json` defines `hook_preferences` as an object with 6 numeric fields, one per pattern (`contradiction`, `specificity`, `timeframe_tension`, `pov_as_advice`, `vulnerable_confession`, `pattern_interrupt`), all floats defaulting to 0. The DESIGN's `HookPreferences` Pydantic model (Section 3.3.1) replaces these 6 fields with `preferred_patterns: Optional[list[str]]`, `avoid_patterns: Optional[list[str]]`, and `best_performing: Optional[str]`. This is a structural contradiction: the GVB schema is machine-readable numeric scores per pattern used by `brain/evolution.py`'s `compute_hook_preferences()` for weighted scoring, while the DESIGN model converts them to human-readable string lists. The `BrainEvolution.compute_hook_preferences()` function (Section 3.6) expects to write back float scores per pattern, but the Pydantic model cannot store them. This will break the core feedback loop.
**Recommended Fix:** Align `HookPreferences` with the GVB schema: 6 float fields, one per pattern name, defaulting to 0. The DESIGN's qualitative fields could be computed properties.

---

**GAP-006**
**Severity:** Critical
**Category:** Pydantic Model vs GVB Schema — `Monetization.cta_strategy` Missing Structure
**Description:** The GVB `agent-brain.schema.json` defines `monetization.cta_strategy` as a structured object with `default_cta`, `lead_magnet_url`, `community_url`, `newsletter_url`, `website_url`. The DESIGN's `Monetization` Pydantic model (Section 3.3.1) collapses `cta_strategy` to a single `Optional[str]`. The CTA template system (`data/cta-templates.json`) and the angle generation pipeline both reference these URL fields for CTA direction. Collapsing to a string means the angle generation can no longer automatically populate correct CTAs from the brain.
**Recommended Fix:** Define a `CTAStrategy` sub-model in `models/brain.py` matching the GVB schema's `cta_strategy` structure.

---

**GAP-007**
**Severity:** Critical
**Category:** Pydantic Model vs GVB Schema — `Cadence.weekly_schedule` Missing Structure
**Description:** The GVB schema defines `cadence.weekly_schedule` as an object with `shorts_per_day` (integer), `shorts_days` (array of day enums), `longform_per_week` (integer), `longform_days` (array of day enums). The DESIGN's `Cadence` Pydantic model uses `Optional[dict[str, list[str]]]` for `weekly_schedule`, losing type safety, validation, and the integer fields. The `discover.py` ranking logic uses cadence data for content pipeline scheduling.
**Recommended Fix:** Define a `WeeklySchedule` sub-model with the explicit fields from the GVB schema.

---

**GAP-008**
**Severity:** Critical
**Category:** RLS Policy — Agency Parent/Child Data Leak
**Description:** Section 9.2 defines `CREATE POLICY "Parent workspace can read children"` that allows any user with access to the parent workspace to read all child workspace rows in the `workspaces` table. But there are no equivalent policies on the pipeline data tables (`topics`, `angles`, `hooks`, `scripts`, `analytics_entries`, etc.) that extend this parent-read permission to child workspace data. An agency owner can see child workspace metadata but cannot read the actual content — making the "aggregate metrics across all children" feature described in Section 7.5 and the PRD Section 9 impossible to implement. Conversely, if such policies were added later without careful scoping, a member of one child workspace could potentially read another child's data if both share the same parent.
**Recommended Fix:** Define explicit cross-workspace read policies for aggregate analytics (parent can read children's `analytics_entries` and `topics` for dashboard rollup). Explicitly document that these policies are scoped to `parent_id` membership checks, not just `user_has_workspace_access`.

---

## HIGH Gaps

---

**GAP-009**
**Severity:** High
**Category:** API Endpoint — Inconsistency Between Feature Sections and Route Summary
**Description:** Section 5.3 (Topic Discovery) defines `WS /api/v1/ws/workspaces/{id}/discover/{job_id}` but Section 4.5 (WebSocket Endpoints) and the PRD Section 10 define `WS /ws/workspaces/{id}/discover/{job_id}` without the `/api/v1` prefix. The `websocket/pipeline.py` code example (Section 4.5) uses `@router.websocket("/ws/pipeline/{job_id}")` — neither of these three URLs match each other. This will cause the generated TypeScript client to reference incorrect WebSocket URLs.
**Recommended Fix:** Canonicalize all WebSocket paths to a single format. The FastAPI router registration in `main.py` (Section 4.1) shows `hub.router` registered without a prefix, implying bare `/ws/...` paths, so drop the `/api/v1` prefix from feature-section WebSocket URLs.

---

**GAP-010**
**Severity:** High
**Category:** Background Job — No Job Cancellation Mechanism
**Description:** Section 4.3.11 defines `POST /api/v1/jobs/{id}/cancel`. ARQ does not natively support job cancellation of running jobs — only queued jobs can be aborted. There is no design for how a running recon pipeline (which could be mid-transcription) is interrupted. The `SkeletonRipperPipeline.run()` signature (Section 3.4.1) has no cancellation token or cooperative stop mechanism.
**Recommended Fix:** Add a `cancel_token: Optional[asyncio.Event]` parameter to `SkeletonRipperPipeline.run()` and check it between pipeline phases. The cancel endpoint writes a flag to Redis (`job:{job_id}:cancel = 1`) that the worker checks via the `on_progress` callback.

---

**GAP-011**
**Severity:** High
**Category:** File Storage — No Cleanup Strategy for Temporary Video Files
**Description:** Section 14 defines a `videos` bucket for downloaded video/audio files marked as "temporary." The ARQ worker `run_recon_pipeline` (Section 11.3) uses `/tmp/mcl/{workspace_id}/recon` as `base_dir`. There is no TTL, cleanup job, or lifecycle policy defined for either the `/tmp` directory or the `videos` Supabase Storage bucket. Recon jobs download potentially large video files (competitor YouTube/Instagram videos). Without cleanup, disk usage grows unbounded on the worker host and storage costs accumulate in Supabase.
**Recommended Fix:** Add a `cleanup_after_job` flag to `WorkerSettings`. After each successful recon job, delete temp files. Add a nightly ARQ scheduled job `cleanup_old_videos` that purges files older than 7 days from the `videos` bucket. Define max file size limits in the recon pipeline config.

---

**GAP-012**
**Severity:** High
**Category:** Channel Plugin Interface — Missing Credential Injection
**Description:** The `DiscoverChannel.scrape_competitor()` abstract method signature (Section 8.1) does not include a `credentials: dict` parameter, unlike `AnalyzeChannel.collect_analytics()` which does. The `InstagramDiscoverChannel` implementation (Section 8.3) works around this by caching credentials in `self._client`, which means the channel instance is stateful and credential-bound at construction — but `ChannelRegistry.get_discover()` instantiates via `channel_cls()` with no arguments. There is no path to pass Instagram credentials through the registry to a fresh channel instance.
**Recommended Fix:** Add `credentials: dict` to `DiscoverChannel.scrape_competitor()` and `DiscoverChannel.discover_topics()` signatures. Update the registry's `get_discover()` to accept and pass credentials, or use a factory pattern.

---

**GAP-013**
**Severity:** High
**Category:** Caching — No Invalidation Strategy on Brain Update
**Description:** Section 17.1 caches `brain:{workspace_id}` in Redis with a 5-minute TTL. Section 11.3's worker reads the brain from Postgres to score topics. If a user updates their brain via `PATCH /workspaces/{id}/brain` (Section 4.3.3) and immediately triggers a discovery job, the worker may use a stale cached brain for topic scoring for up to 5 minutes. There is no cache invalidation call in the brain update route.
**Recommended Fix:** Add an explicit `redis.delete(f"brain:{workspace_id}")` call in the brain update route handler before returning. Document this as the required pattern for all write routes that modify brain data.

---

**GAP-014**
**Severity:** High
**Category:** WebSocket — No Authentication Validation on Connection
**Description:** Section 4.5 notes "Auth: JWT passed as query param `?token=xxx`" for WebSocket connections, but the `AuthMiddleware` (Section 4.4) only processes HTTP headers, not query params. The WebSocket handler examples do not show any JWT validation code. A connection to `/ws/pipeline/{job_id}?token=xxx` with a valid token for workspace A could subscribe to progress events for a job belonging to workspace B, since the `job_id` is the only scoping parameter shown.
**Recommended Fix:** Add explicit JWT validation in each WebSocket handler before `websocket.accept()`. Verify that the `job_id` belongs to a workspace the authenticated user has access to. Show this validation in the `websocket/pipeline.py` code example.

---

**GAP-015**
**Severity:** High
**Category:** API Key — No Rotation / Expiry Enforcement
**Description:** The `api_keys` table has `expires_at TIMESTAMPTZ` but the `AuthMiddleware._verify_api_key()` logic is not shown checking this field. The PRD Section 14 states "API key rotation" as a security requirement but the DESIGN only documents key generation and revocation (`DELETE /api/v1/auth/api-key/{id}`), not rotation (generate new key + revoke old atomically). A compromised key cannot be rotated without service interruption.
**Recommended Fix:** Add `POST /api/v1/auth/api-key/{id}/rotate` that atomically creates a replacement key and marks the old one as revoked with a 24-hour grace period. Add `expires_at` check to `_verify_api_key()`.

---

**GAP-016**
**Severity:** High
**Category:** Missing GVB Module — `recon/tracker.py` Not Addressed
**Description:** `recon/tracker.py` (`filter_new_content`, `load_state`, `save_state`) tracks which competitor content has already been processed to prevent duplicate topic creation across discovery runs. This is a functional deduplication layer. Section 20 (GVB Code Reuse Map) does not include it in any category — not in 20.1 (direct ports), 20.2 (refactors), or 20.5 (not ported). Without it, every discovery run re-discovers and re-saves all competitor content as new topics.
**Recommended Fix:** Port `tracker.py` to `mcl_pipeline/recon/tracker.py`. In cloud mode, the tracker state should be persisted to a `recon_tracker_state` Postgres table (workspace-scoped) rather than a local JSON file.

---

**GAP-017**
**Severity:** High
**Category:** Topic Status — Schema Contradiction
**Description:** The `topics` Pydantic `Topic` model (Section 3.3.2) defines `status: Literal["new", "developing", "ready", "used", "archived"]`. The Postgres `topics` table (Section 9.1) defines a `CHECK (status IN ('new', 'developing', 'scripted', 'passed'))`. These are different value sets. The PRD Section 5.3 and the web UI description also use "New -> Developing -> Scripted -> Passed" as the kanban states. The Pydantic model's `"ready"` and `"archived"` do not exist in the DB check constraint, and the DB's `"scripted"` and `"passed"` do not appear in the Pydantic model.
**Recommended Fix:** Reconcile to a single canonical status set. Based on the PRD's kanban description, the correct values are `new`, `developing`, `scripted`, `passed`. Update the Pydantic model.

---

**GAP-018**
**Severity:** High
**Category:** Script Status — Schema Contradiction
**Description:** The `Script` Pydantic model (Section 3.3.5) defines `status: Literal["draft", "review", "approved", "filming", "published", "archived"]`. The Postgres `scripts` table (Section 9.1) defines `CHECK (status IN ('draft', 'filming', 'published', 'analyzed'))`. The Pydantic model has `"review"`, `"approved"`, `"archived"` not in the DB. The DB has `"analyzed"` not in the Pydantic model. Any attempt to write `status="approved"` will fail the DB constraint.
**Recommended Fix:** Canonicalize to one status set. The `"analyzed"` DB state maps to a meaningful pipeline state (post-analytics collection) that should be in the Pydantic model.

---

**GAP-019**
**Severity:** High
**Category:** Background Job — Worker Uses `/tmp` in Production
**Description:** Section 11.3's `run_recon_pipeline` hardcodes `base_dir=Path(f"/tmp/mcl/{workspace_id}/recon")`. In containerized deployments (Docker on Railway/Render), `/tmp` is ephemeral and shared across container restarts. If a worker pod restarts mid-job, all partially downloaded videos and transcripts are lost. Additionally, if multiple worker replicas run on the same host, they share the same `/tmp` path prefix leading to potential race conditions if two workers process the same workspace simultaneously.
**Recommended Fix:** Use a configurable `MCL_WORKER_TEMP_DIR` env var with a per-job-ID subdirectory: `Path(f"{settings.worker_temp_dir}/{job_id}")`. Mount a persistent volume for this path in production Docker config.

---

**GAP-020**
**Severity:** High
**Category:** Rate Limiting — No Per-Endpoint Granularity
**Description:** Section 18.3 defines per-tier request rates (60/300/1000 req/min) and a job-weight system (recon=5, discovery=3). But Section 4.4's `RateLimitMiddleware` applies a single counter per workspace with no endpoint-specific differentiation. A user on the Free tier (60 req/min) running a dashboard with 10 concurrent TanStack Query fetches plus a discovery job will be rate-limited on basic reads. There is also no rate limiting on external API calls (YouTube Data API quota is per-workspace but the spec only mentions tracking it, not enforcing it at the rate limiter level).
**Recommended Fix:** Define read vs write endpoint rate limit buckets separately. Add explicit YouTube quota tracking as a first-class rate limit counter (not just analytics). Define the endpoint weighting table exhaustively, not just for job types.

---

## MEDIUM Gaps

---

**GAP-021**
**Severity:** Medium
**Category:** Pydantic Model vs GVB Schema — `VisualPatterns` Stripped
**Description:** The DESIGN's `VisualPatterns` model (Section 3.3.1) has only `thumbnail_style: Optional[str]` and `text_overlay_style: Optional[str]`. The GVB `agent-brain.schema.json` defines `visual_patterns` with rich nested structure: `top_visual_types[]` (each with `type` enum, `avg_engagement`, `sample_count`, `trend` enum), `top_pattern_interrupts[]`, `text_overlay_colors{}`, `pacing_performance{}`. The `BrainEvolution` class (Section 3.6) is supposed to compute visual pattern aggregation, but the model cannot store it.
**Recommended Fix:** Expand `VisualPatterns` to match the GVB schema's full structure.

---

**GAP-022**
**Severity:** Medium
**Category:** Pydantic Model vs GVB Schema — `PerformancePatterns` Missing Fields
**Description:** The DESIGN's `PerformancePatterns` model (Section 3.3.1) is missing GVB fields: `top_performing_formats`, `audience_growth_drivers`, `avg_ctr`, `view_to_follower_ratio`, `avg_saves`, `avg_shares`. These fields are documented in the PRD Section 5.2 and used by `BrainEvolution.compute_performance_patterns()`.
**Recommended Fix:** Add all missing fields to `PerformancePatterns`.

---

**GAP-023**
**Severity:** Medium
**Category:** Missing API Endpoint — `audience_blockers` and `content_jobs` Brain Sections
**Description:** Section 4.3.3's brain routes include `PATCH /sections/{section}` for updating brain sections with `section: str # identity | icp | pillars | platforms | competitors | cadence | monetization`. The sections `audience_blockers` and `content_jobs` are listed in the PRD as user-managed sections (Section 5.2) but are omitted from the section update route's comment. If not handled, these two critical sections (which the angle generation pipeline uses) cannot be updated via the API.
**Recommended Fix:** Add `audience_blockers` and `content_jobs` to the allowed section names in the route, and handle them in `brain/engine.py`'s `merge_brain_sections()`.

---

**GAP-024**
**Severity:** Medium
**Category:** PRD vs DESIGN Contradiction — Pricing Tier Name
**Description:** The PRD Section 15 uses tiers `Free / Pro / Agency`. The DESIGN Section 9.1 adds `enterprise` to the `workspaces.plan CHECK` constraint (`CHECK (plan IN ('free', 'pro', 'enterprise'))`). The PRD never mentions an `enterprise` tier — it uses `agency` as the top tier. The DESIGN's feature flag table (Section 4.2 Settings area is not shown, but Section 15 has `FEATURE_FLAGS` with `"free"`, `"pro"`, `"agency"` keys). These are inconsistent.
**Recommended Fix:** Align on `agency` or `enterprise` as the top tier name. Apply consistently to the `workspaces.plan` constraint, `FEATURE_FLAGS`, and all rate limit tables.

---

**GAP-025**
**Severity:** Medium
**Category:** OpenAPI Client Generation — Breaking CI Dependency
**Description:** Section 5.5's `generate-client.sh` starts the FastAPI app in a subprocess to extract the OpenAPI spec: `python -c "from mcl_api.main import create_app; ..."`. This requires all API dependencies (Supabase, Redis, etc.) to be importable at CI time without a running server. If any dependency's import fails (e.g., `supabase` client errors on missing env vars), the script fails. Additionally, `openapi-typescript-codegen` is listed but this package is deprecated; the current tool is `openapi-ts` or `hey-api/openapi-ts`.
**Recommended Fix:** Use FastAPI's built-in `app.openapi()` export without starting a server (possible with `Settings` having defaults or test overrides). Switch to `@hey-api/openapi-ts` for client generation.

---

**GAP-026**
**Severity:** Medium
**Category:** Logging — No Structured Log Format Defined
**Description:** Section 16 preserves GVB's `ReconLogger` singleton with file rotation and error codes. But in a containerized production environment (Railway, Render), file rotation is irrelevant — logs go to stdout and are captured by the platform. The `ReconLogger` singleton pattern is problematic in async FastAPI context (multiple coroutines sharing one logger instance without async locks). There is no definition of the structured log fields (request_id, workspace_id, job_id, duration_ms) that would make logs queryable in a log aggregator.
**Recommended Fix:** In cloud mode, replace `ReconLogger` file output with structured JSON stdout logging (using `structlog` or Python's `logging` with JSON formatter). Define mandatory log fields per event type. The singleton pattern needs an async-safe lock.

---

**GAP-027**
**Severity:** Medium
**Category:** Deployment — No Health Check Endpoint Specification
**Description:** The PRD Section 17 mentions "API health endpoint: `GET /health`" but the DESIGN never defines what this endpoint returns, what it checks (DB connectivity? Redis? Supabase?), or what HTTP status codes it uses. The Docker Compose file (Section 19.2) has no `healthcheck` directive. Railway/Render health checks need a defined response format.
**Recommended Fix:** Define `GET /health` response schema: `{"status": "ok|degraded|down", "checks": {"postgres": bool, "redis": bool, "supabase_auth": bool}, "version": str}`. Add `HEALTHCHECK` to Dockerfiles with appropriate intervals.

---

**GAP-028**
**Severity:** Medium
**Category:** Missing API Endpoint — `POST /api/v1/auth/refresh` Behavior
**Description:** Section 14 defines JWT flow step "Supabase returns access_token (JWT, 1hr TTL) + refresh_token (30d TTL)" but the DESIGN's `POST /auth/refresh` endpoint is listed with no request/response schema. It is unclear whether this is a thin proxy to Supabase Auth's refresh endpoint or a custom implementation. The CLI `auth.json` description says it stores a "JWT" but not whether the refresh token is also persisted.
**Recommended Fix:** Document `POST /auth/refresh` request body (`{refresh_token: str}`) and response (`{access_token: str, expires_in: int}`). Confirm this is a Supabase proxy and show the Supabase SDK call. Document that `~/.mcl/auth.json` stores both access token and refresh token.

---

**GAP-029**
**Severity:** Medium
**Category:** Missing API Endpoint — Brain Evolution Preview/Apply Split
**Description:** Section 5.7 defines `GET /workspaces/{id}/brain/evolve/preview` and `POST /workspaces/{id}/brain/evolve/apply`, but Section 4.3.3's brain routes only show `POST /brain/evolve` (which triggers a job and returns a job_id). There is no route for `evolve/preview` or `evolve/apply` in the route code block. This preview/apply workflow (show diff, user approves specific changes) is described as a key UX feature in both the PRD and DESIGN.
**Recommended Fix:** Add `GET /api/v1/brain/evolve/preview` and `POST /api/v1/brain/evolve/apply` to Section 4.3.3's brain routes with request/response schemas showing the diff format.

---

**GAP-030**
**Severity:** Medium
**Category:** Deployment — Missing Secrets Management for Encrypted Credentials
**Description:** Section 18.2 states platform credentials are "encrypted at rest via Supabase Vault (Postgres TDE)". Supabase Vault is a separate feature from TDE — it uses `pgsodium` for column-level encryption with a Key Management Service. The spec treats them as equivalent, but they require different setup. Column-level Vault encryption requires: creating vault secrets, using `vault.create_secret()`, and reading via `vault.decrypted_secrets`. The DESIGN never shows how the API worker decrypts credentials at job time — it only shows `supabase.table("channel_credentials").select("*")` which would return the encrypted JSONB blob, not the plaintext credentials.
**Recommended Fix:** Document the Supabase Vault setup steps in the migrations. Show the decryption call pattern in the worker credential loading code. Add `MCL_SUPABASE_VAULT_KEY_ID` to `.env.example`.

---

**GAP-031**
**Severity:** Medium
**Category:** CLI — `mcl sync` Not Defined
**Description:** Section 6.3 mentions offline mode and `mcl sync` for syncing local data to cloud, but `mcl sync` is not in the command structure (Section 6.2), has no design for conflict resolution (local and remote data both modified), and no API endpoint is defined to receive a batch sync upload.
**Recommended Fix:** Either remove the offline/sync claim from the spec, or add `mcl sync` to the command tree and define a `POST /api/v1/workspaces/{id}/sync` endpoint with conflict resolution semantics (last-write-wins, or server-wins).

---

**GAP-032**
**Severity:** Medium
**Category:** PRD vs DESIGN Contradiction — AI Model References Outdated
**Description:** The DESIGN Section 12.3 workspace AI config references `"claude-sonnet-4-20250514"` and Section 3.4.2's `PROVIDERS` dict lists `"claude-3-haiku-20240307"` and `"claude-3-sonnet-20240229"` (released 2024). As of March 2026, these model IDs are outdated. The LLM client will fail API calls using deprecated model identifiers. The PRD makes no specific model commitments, leaving the DESIGN to specify models that are already superseded.
**Recommended Fix:** Replace hardcoded model IDs with configurable defaults in `Settings`. Use `claude-haiku-4-5` and `claude-sonnet-4-5` as current-generation defaults and document that workspace configs can override them.

---

## LOW Gaps

---

**GAP-033**
**Severity:** Low
**Category:** Missing Index — `jobs` Table Query Patterns
**Description:** The `jobs` table (Section 9.1) has `idx_jobs_workspace` and `idx_jobs_status` but no index on `created_at`. The scheduled analytics job pattern requires finding jobs by `(workspace_id, type, created_at DESC)` to determine the last analytics collection time. Without a `created_at` index, this query scans all workspace jobs.
**Recommended Fix:** Add `CREATE INDEX idx_jobs_type_workspace ON public.jobs(workspace_id, type, created_at DESC)`.

---

**GAP-034**
**Severity:** Low
**Category:** Missing Table — `subscriptions` / Billing
**Description:** The PRD Section 15 references "Stripe webhooks update `subscriptions` table in Supabase" but there is no `subscriptions` table in the DESIGN's schema (Section 9.1). The `workspaces.plan` column is the only billing state, which is insufficient for tracking subscription start/end dates, Stripe customer IDs, and upgrade/downgrade history.
**Recommended Fix:** Add a `subscriptions` table with `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end`, and a Stripe webhook handler endpoint.

---

**GAP-035**
**Severity:** Low
**Category:** Missing Observability — No Request ID Propagation
**Description:** The `LoggingMiddleware` (referenced in Section 4.1) is listed but never defined. There is no specification for request ID generation and propagation (`X-Request-Id` header) from the API through to ARQ workers for end-to-end trace correlation. Without this, correlating a frontend error to a specific API call to a specific job in Sentry is manual.
**Recommended Fix:** Define `LoggingMiddleware` to generate and attach a UUID request ID to each request via `request.state.request_id`. Return it as `X-Request-Id` response header. Pass it as a parameter to ARQ job dispatch so worker logs reference the originating request.

---

**GAP-036**
**Severity:** Low
**Category:** PRD vs DESIGN — Onboarding Section Count Contradiction
**Description:** The PRD Section 5.2 and user flow (Section 7.1) consistently describe 9 onboarding sections. The DESIGN Section 3.9's prompt template mapping table notes `viral-onboard.md` as "270 lines" and `onboard_v1.yaml` but lists only 7 sections in its description comment. Section 2's monorepo also shows `onboard_v1.yaml` implying a single template for all 9 sections. This discrepancy in section counts could cause incomplete brain initialization.
**Recommended Fix:** Verify the onboard prompt template covers all 9 sections (identity, ICP, pillars, platforms, competitors, cadence, monetization, audience_blockers, content_jobs). Update any comments that cite the section count.

---

**Summary:** 36 gaps identified. 8 Critical (will block correct implementation or cause data integrity failures), 12 High (will cause runtime failures or security issues in production), 12 Medium (will cause incorrect behavior or PRD/DESIGN contradictions), 4 Low (quality/observability improvements). The most structurally dangerous issues are the Pydantic model mismatches with GVB schemas (GAP-005, GAP-006, GAP-007, GAP-021, GAP-022) which will silently corrupt the brain feedback loop — the core value proposition of the product.