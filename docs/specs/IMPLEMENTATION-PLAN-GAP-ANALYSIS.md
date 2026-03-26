# Implementation Plan Gap Analysis Report

| Field | Value |
|-------|-------|
| **Review Date** | 2026-03-24 |
| **Source Document** | `/Users/yogi/mcl/docs/specs/IMPLEMENTATION-PLAN.md` |
| **Cross-Referenced** | PRD.md, DESIGN.md, GVB source at `/Users/yogi/content-scale/goviralbitch/` |
| **Total Gaps** | 35 |

---

## Implementation Plan Gap Analysis: Microcelebrity Labs (MCL)

**Review Scope:** `/Users/yogi/mcl/docs/specs/IMPLEMENTATION-PLAN.md` cross-referenced against `/Users/yogi/mcl/docs/specs/PRD.md`, `/Users/yogi/mcl/docs/specs/DESIGN.md`, and `/Users/yogi/content-scale/goviralbitch/`

---

### CRITICAL (Blocks Development Entirely)

---

**GAP-001**
**Severity:** Critical
**Category:** Missing Phase Dependency / Environment Setup
**Description:** Phase 0 acceptance criteria lists `supabase start` as a requirement, but Task 0.8 only runs `supabase init` and creates a stub `config.toml`. There is no step to install the Supabase CLI, no `supabase link` to a remote project, no explanation of whether this is local-only or cloud Supabase, and no step to run the actual migrations after `init`. A developer who has never used Supabase will create the directory structure and then be immediately blocked when trying to use it.
**Recommended Fix:** Add a prerequisite task before 0.8: install Supabase CLI (`brew install supabase/tap/supabase`), create the cloud project at `supabase.com` (or confirm local-only), run `supabase db start`, then run `supabase migration new initial_schema` to scaffold migration files. Add an explicit `supabase db push` or `supabase db reset` step after Task 2.1-2.3 to verify migrations apply.

---

**GAP-002**
**Severity:** Critical
**Category:** Monorepo Structure Contradiction
**Description:** The Implementation Plan (IP) places all packages under `apps/` (e.g., `apps/api/`, `apps/web/`, `apps/cli/`) with the pipeline at `packages/pipeline/`. The Design Spec (DESIGN.md) places all packages under `packages/` (e.g., `packages/api/`, `packages/web/`, `packages/cli/`, `packages/pipeline/`). These are incompatible. IP Task 0.3 writes `apps/api/pyproject.toml`. DESIGN Section 2 writes `packages/api/pyproject.toml`. The Dockerfile in IP references `apps/api/Dockerfile`. The `generate-client.sh` in DESIGN references `packages/web/src/api/generated`. The CI workflow in IP runs `cd apps/web && npm ci`. A developer following one document will break the other.
**Recommended Fix:** Resolve the directory convention before any code is written. Standardize on one structure (DESIGN's `packages/` layout is more conventional for monorepos) and update all references in both documents.

---

**GAP-003**
**Severity:** Critical
**Category:** Missing Phase Dependency — Storage Backend Protocol
**Description:** DESIGN Section 3.11 defines a `StorageBackend` protocol (with `LocalStorageBackend` and `SupabaseStorageBackend` implementations) that all pipeline functions depend on for persistence. This is referenced in DESIGN's `LocalRunner` and `CloudRunner` (`mcl_pipeline.storage.LocalStorageBackend`). The IP never creates this file. There is no `packages/pipeline/mcl_pipeline/storage.py` in any task list. Without it, Phase 5 CLI local mode cannot run, and Phase 3 ARQ workers have no persistence layer.
**Recommended Fix:** Add Task 1.9: Implement `mcl_pipeline/storage.py` with the `StorageBackend` protocol, `LocalStorageBackend` (JSON/JSONL), and stub `SupabaseStorageBackend`. This is a prerequisite for Phase 3 workers and Phase 5 CLI local mode.

---

**GAP-004**
**Severity:** Critical
**Category:** Missing GVB Files Not Ported
**Description:** GVB contains two analytics scripts that are the primary mechanism for actually collecting real performance data: `scripts/fetch-yt-analytics.py` (YouTube Analytics API OAuth flow) and `scripts/fetch-ig-insights.py` (Instagram Graph API insights). Neither is listed in the GVB Source Mapping table, the Appendix A quick-lookup, or any phase task. The PRD Section 5.6 describes collecting CTR, retention_30s, avg_view_duration, and subscribers_gained from the YouTube Analytics API — metrics that require these scripts' OAuth token management. Without porting these, the analyze phase can only collect public Data API metrics (views, likes, comments) and the brain evolution feedback loop is severely degraded.
**Recommended Fix:** Add to GVB Source Mapping: `scripts/fetch-yt-analytics.py` -> `mcl_pipeline/analytics/youtube_analytics.py` (refactor: remove OAuth file I/O, accept token as parameter) and `scripts/fetch-ig-insights.py` -> `mcl_pipeline/analytics/instagram_insights.py`. Port in Phase 1 Task 1.4.

---

**GAP-005**
**Severity:** Critical
**Category:** Missing Phase Dependency — Pydantic Model Inconsistency
**Description:** DESIGN Section 3.3 defines `AgentBrain` using `mcl_pipeline.models.brain` (under a `models/` subpackage). The IP defines the same class in `mcl_pipeline.schemas.brain` (under a `schemas/` subpackage). These two paths appear throughout all phases: IP Phase 1 imports from `mcl_pipeline.schemas`, DESIGN Sections 3.5-3.8 import from `mcl_pipeline.models`. Every ARQ job in Phase 3 uses `from mcl_pipeline.schemas.brain import AgentBrain`. Every channel plugin in DESIGN uses `from mcl_pipeline.models.brain import AgentBrain`. A developer implementing one will get `ModuleNotFoundError` from the other.
**Recommended Fix:** Standardize on one location. The IP's `schemas/` naming is confusing (schemas typically mean JSON Schema definitions, not Python models). Adopt DESIGN's `models/` convention and update all IP references.

---

**GAP-006**
**Severity:** Critical
**Category:** Missing File — `viral-setup.md` Port
**Description:** PRD Section 5.1 documents `viral-setup.md` as one of the 7 GVB commands with explicit API endpoints (`/connections`, OAuth flows, platform verification). GVB source at `.claude/commands/viral-setup.md` exists (listed as 732 lines in DESIGN Section 3.9). The IP GVB Source Mapping table omits it entirely. The prompt template table in DESIGN Section 3.9 includes `setup_v1.yaml` but no corresponding `mcl_pipeline/prompts/setup.py` module is in any task. More critically, the `workspace_connections` table (or equivalent) is absent from the database schema in Task 2.1 — the schema has no table for storing OAuth tokens or platform credentials.
**Recommended Fix:** Add to Task 2.1 a `workspace_connections` table with columns for `platform`, `oauth_token`, `refresh_token`, `expires_at`, `status`. Add `prompts/setup.py` to Task 1.6. Add connection endpoints to Phase 3.

---

**GAP-007**
**Severity:** Critical
**Category:** Missing Migration Strategy — JSONL to Postgres
**Description:** The IP has zero guidance on migrating existing GVB users' data (topics.jsonl, angles.jsonl, hooks.jsonl, scripts.jsonl, analytics.jsonl, swipe-hooks.jsonl, insights.json, competitor-reels.jsonl, agent-brain.json) to Postgres. A developer shipping to real GVB users will have no migration path. The seed data migration (Task 2.3) is a commented-out placeholder that does nothing.
**Recommended Fix:** Add a Phase 0 or Phase 1 task for a `mcl migrate` CLI command that reads GVB `data/` directory JSONL files, validates them against Pydantic models, and upserts into Supabase. Include workspace creation for the migrating user.

---

### HIGH (Blocks Specific Phase Completion)

---

**GAP-008**
**Severity:** High
**Category:** Missing Phase Dependency — `bcrypt` Not in Dependencies
**Description:** Task 3.2 auth middleware uses `import bcrypt` for API key verification. `bcrypt` is not listed in `apps/api/pyproject.toml` dependencies (Task 0.3). The dev will get an `ImportError` when first testing auth.
**Recommended Fix:** Add `bcrypt>=4.0` to `apps/api/pyproject.toml` dependencies.

---

**GAP-009**
**Severity:** High
**Category:** Missing Phase Dependency — Worker Dockerfile
**Description:** `infra/docker-compose.yml` (Task 0.7) references `apps/worker/Dockerfile`. Task 0.5 creates the worker `pyproject.toml` and `main.py` but never creates a `Dockerfile`. The compose file will fail to build.
**Recommended Fix:** Add Task 0.5b: create `apps/worker/Dockerfile` mirroring the API Dockerfile with `CMD ["arq", "worker.main.WorkerSettings"]`.

---

**GAP-010**
**Severity:** High
**Category:** Missing Phase Dependency — OpenAPI Client Generation
**Description:** Phase 4 Task 4.1 requires the FastAPI server to be running at `http://localhost:8000` to generate the TypeScript client (`npx openapi-typescript-codegen --input http://localhost:8000/openapi.json`). But Phase 4 depends on Phase 3 being "complete," which requires all routes registered. If the server isn't running during Phase 4 setup, client generation fails. There is no step to generate the spec from the app object without a live server, and no committed `openapi.json` to fall back on.
**Recommended Fix:** Add a script `scripts/generate-openapi.sh` that imports the FastAPI app and dumps the spec to `docs/api/openapi.json` without starting a server (as shown in DESIGN Section 5.5). Commit this spec to source control so Phase 4 can proceed without a running server.

---

**GAP-011**
**Severity:** High
**Category:** Missing Test Infrastructure — API Tests
**Description:** Phase 3 testing requires `pytest apps/api/tests/ -v` to pass, but no test files are created for the API. The IP creates test files only for `packages/pipeline/tests/`. `apps/api/tests/conftest.py`, `test_routes.py`, `test_auth.py`, and `test_workers.py` are listed in DESIGN's file tree but none are scaffolded in any IP task.
**Recommended Fix:** Add Task 3.6: scaffold `apps/api/tests/conftest.py` with a `TestClient` fixture using `httpx.AsyncClient(app=app)` and mock Supabase/Redis dependencies. Add at least `test_health.py` and `test_auth.py` stubs.

---

**GAP-012**
**Severity:** High
**Category:** Missing File — `recon/web/app.py` Not Addressed
**Description:** GVB has a Flask dashboard at `recon/web/app.py` that the current GVB users rely on (`bash scripts/run-recon-ui.sh`). This file and the `recon/web/` directory are completely absent from the GVB Source Mapping and all phase tasks. If MCL replaces this functionality with the React dashboard, that needs to be stated explicitly. If it's being deprecated, GVB users running `run-recon-ui.sh` will break after migration.
**Recommended Fix:** Explicitly acknowledge `recon/web/` as deprecated-in-MCL in the GVB Source Mapping. Note which MCL web pages replace it (Recon.tsx covers the skeleton ripper UI).

---

**GAP-013**
**Severity:** High
**Category:** Missing Phase Dependency — YouTube OAuth Credential Storage
**Description:** GVB's `scripts/setup-yt-oauth.py` creates `data/yt-token.json` on disk. The IP says OAuth flows are "server-managed" but never shows where OAuth tokens are stored in Supabase. The `workspace_connections` table (see GAP-006) is absent. The `AnalyticsCollector` in DESIGN Section 3.8 accepts `platform_credentials: dict` but no task creates the credential loading/decryption logic. The DESIGN Section 3 mentions "Supabase vault" for encrypted credential storage but no task calls `supabase.vault.create_secret()` or equivalent.
**Recommended Fix:** Add a task in Phase 2 to implement credential storage using Supabase Vault (`vault.secrets` table). Document the encryption/decryption pattern for OAuth tokens. Add the `workspace_connections` table migration.

---

**GAP-014**
**Severity:** High
**Category:** Missing Test Strategy — Integration and E2E Tests
**Description:** The testing requirements at the end of each phase are smoke tests (does the server start, does a basic import work). There are no integration tests verifying that a full pipeline run (discover -> angle -> script) produces valid output. There are no E2E tests for the web UI. There is no mention of test databases, Supabase test project setup, or how to run tests in CI without real API keys.
**Recommended Fix:** Add a Phase 7 task for integration tests using a dedicated test Supabase project. Add a CI secret for `SUPABASE_TEST_URL`. Mock LLM calls using `respx` or `pytest-httpx`. Add at least one E2E test using Playwright for the login -> onboarding -> dashboard flow.

---

**GAP-015**
**Severity:** High
**Category:** Missing Dependency — `google-generativeai` in Pipeline but Not in API
**Description:** DESIGN Section 3.1 lists `google-generativeai>=0.4` as a pipeline dependency. The IP's `pyproject.toml` for `packages/pipeline` (Task 0.2) omits it. DESIGN's `pyproject.toml` for the same package includes it. The `LLMClient` in `skeleton_ripper/llm_client.py` supports a Google provider. The mismatch will cause silent failures when users configure Google as their LLM provider.
**Recommended Fix:** Add `google-generativeai>=0.4` and `anthropic>=0.18` to the pipeline `pyproject.toml` in Task 0.2. The IP's version only includes `anthropic` under the implicit assumption it's added, but it's not listed.

---

**GAP-016**
**Severity:** High
**Category:** Phase Timeline — Unrealistic
**Description:** Phase 1 (Week 1-2) requires porting ~9,050 lines of `skills/last30days/` (Task 1.4 step 10 doesn't even list this), converting 9 JSON schemas to Pydantic models with full field fidelity, porting and refactoring 16 Python modules from GVB, implementing a Redis-backed cache, and writing prompt modules for 6 commands. This is 4-6 weeks of work for a single developer, not 1 week. Phase 3 (Week 2-3) requires implementing 35+ REST endpoints, ARQ workers, WebSocket manager, auth middleware, tenancy middleware, and rate limiting. Also 4-6 weeks minimum.
**Recommended Fix:** Revise timeline to Phase 1: 3 weeks, Phase 2: 1 week, Phase 3: 3 weeks, Phase 4: 3 weeks. Beta launch realistically targets Week 14-16, not Week 5-6.

---

**GAP-017**
**Severity:** High
**Category:** Missing GVB Files — `skills/last30days/` Structure Mismatch
**Description:** The IP (Task 1.4 and monorepo structure) shows `skills/last30days/` containing `research.py` and `lib/`. The actual GVB source at `/Users/yogi/content-scale/goviralbitch/skills/last30days/scripts/` contains `last30days.py`, `briefing.py`, `store.py`, `watchlist.py`, and `lib/` with 16 modules including `xai_x.py`, `youtube_yt.py`, `openrouter_search.py`, `dates.py`, `http.py`, `schema.py`, `score.py`, and `env.py` — none of which appear in the IP's file listing. The DESIGN Section 3.10 is more accurate but calls the main file `last30days.py` inside `scripts/`. The IP flattens this incorrectly into `research.py`.
**Recommended Fix:** Copy the actual GVB `skills/last30days/` directory structure verbatim (preserving the `scripts/` subdirectory) and add an `__init__.py` at the top level that wraps `last30days.py::main()` as the `research_topic()` function.

---

**GAP-018**
**Severity:** High
**Category:** Missing Rollback Plans
**Description:** No phase has a rollback plan. Phase 2 applies irreversible database migrations. Phase 3 deploys a FastAPI server. Phase 8 launches to beta users. If Phase 2 migrations corrupt the Supabase schema, there is no documented recovery path. If Phase 8 has a critical bug, there is no rollback strategy.
**Recommended Fix:** Add a rollback section to each phase: for Phase 2, document `supabase db reset` for local and Supabase migration rollback commands for production. For Phase 3-8, add a "previous working commit" tag policy.

---

**GAP-019**
**Severity:** High
**Category:** Missing API Versioning Strategy
**Description:** All endpoints are `/api/v1/...` but there is no versioning strategy. When breaking changes are required (e.g., changing the brain schema), there is no guidance on v2 routing, deprecation headers, or sunset timelines. This will be a blocker the first time a schema field changes post-launch.
**Recommended Fix:** Add a versioning section to Phase 7 or the Architecture Overview: document that breaking changes require a new version prefix, that v1 will be supported for 6 months after v2 ships, and that deprecation warnings (`Deprecation` header) will be added to sunset endpoints.

---

### MEDIUM (Causes Significant Developer Confusion)

---

**GAP-020**
**Severity:** Medium
**Category:** CLI Framework Contradiction
**Description:** IP Task 0.6 and Phase 5 use `click` as the CLI framework. DESIGN Section 6.1 and 6.2 use `typer`. These are incompatible. The IP's `__main__.py` uses `@click.group()`. DESIGN's `main.py` uses `typer.Typer()`. A developer must pick one at the start and will find conflicts when merging both documents.
**Recommended Fix:** Standardize on `typer` (it uses Click internally but has better type annotation support). Update IP Task 0.6 and all Phase 5 command examples.

---

**GAP-021**
**Severity:** Medium
**Category:** Missing Dependency — Workspace Member Bootstrap
**Description:** The RLS policy for `workspaces` (Task 2.2) requires `is_workspace_member(id)` to return true for a SELECT. But `is_workspace_member` checks `workspace_members` where `accepted_at IS NOT NULL`. When a user first creates a workspace via `POST /api/v1/workspaces`, they are the owner — but they won't be in `workspace_members` yet. The workspace creation endpoint must also insert a `workspace_members` row for the owner. This is not mentioned in any route implementation.
**Recommended Fix:** Add to the workspace creation handler: after inserting into `workspaces`, immediately insert into `workspace_members` with `role='owner'` and `accepted_at=now()`. Without this, the owner cannot read their own workspace via RLS.

---

**GAP-022**
**Severity:** Medium
**Category:** Missing Environment Variable — `VITE_API_URL`
**Description:** Appendix B lists `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the web app but omits `VITE_API_URL` (the FastAPI backend URL). The generated TypeScript client needs to know the API base URL. In production this is `https://api.microcelebritylabs.com`, in development it's `http://localhost:8000`. Without this env var, all API calls in the web app will fail in production.
**Recommended Fix:** Add `VITE_API_URL` to `.env.example` and Appendix B. Update `vite.config.ts` to use it as the proxy target.

---

**GAP-023**
**Severity:** Medium
**Category:** Missing Performance Testing
**Description:** There is no mention of load testing. The skeleton ripper can take 10+ minutes per run (video downloads + transcription + LLM calls). The ARQ worker `job_timeout` is set to 600 seconds (10 minutes). If a recon job for 5 competitors × 20 videos processes sequentially, it will time out. No benchmarks, no stress testing plan, no guidance on worker concurrency tuning.
**Recommended Fix:** Add a Phase 7 task for performance testing: use `locust` or `k6` to test API under load. Document expected job durations per pipeline stage. Add a `max_jobs` guidance note for ARQ based on available RAM and CPU.

---

**GAP-024**
**Severity:** Medium
**Category:** Missing Security Hardening — Instagram Credentials
**Description:** `InstagramDiscoverChannel` takes `username` and `password` as constructor arguments. The IP and DESIGN never address how Instagram credentials are stored securely in MCL SaaS mode. They cannot go in `.env` (per-user credentials), cannot go in the `workspace_connections` table without encryption, and Instaloader sessions are file-based by default. Instagram also aggressively blocks automation — there is no mention of rate limiting, proxy support, or session rotation strategy.
**Recommended Fix:** Add a Phase 7 security task specifically for Instagram credentials: use Supabase Vault for credential storage, document the Instaloader session file upload/download path (Supabase Storage), add a rate limiting wrapper around `InstaClient`.

---

**GAP-025**
**Severity:** Medium
**Category:** Missing Security Hardening — Service Role Key Exposure
**Description:** Task 3.1 `get_supabase()` uses `supabase_service_role_key` to create the client for all API operations. The service role key bypasses RLS entirely. If this leaks (e.g., logged in an error trace, exposed in an exception handler), any user could access any workspace's data. The auth middleware passes the service role key to every route handler, defeating the purpose of RLS.
**Recommended Fix:** Use the anon key + user JWT for client-facing operations (RLS enforced). Reserve the service role key only for background workers (ARQ jobs) that need cross-workspace access. Document this pattern explicitly.

---

**GAP-026**
**Severity:** Medium
**Category:** Unclear Acceptance Criteria — Phase 4
**Description:** Phase 4 acceptance criteria states "All 10 pages render and function." There is no definition of "function." No test list specifying what each page must do to pass. The login flow criteria says "sign up -> verify email -> login -> redirect to dashboard" but there is no step in Phase 0 or 2 to configure Supabase's email templates or SMTP provider, and local Supabase uses an email testing tool (Inbucket) that requires separate setup.
**Recommended Fix:** Add to Phase 0 Task 0.8: document Inbucket access for local email testing (`http://localhost:54324`). Add explicit acceptance criteria per page (e.g., "Discovery page: clicking 'Discover Now' creates a job and shows a progress indicator").

---

**GAP-027**
**Severity:** Medium
**Category:** Missing Dependency — `briefing.py` Not in Port Plan
**Description:** GVB `skills/last30days/scripts/briefing.py` exists in the source but is not listed in DESIGN's skills directory tree (Section 3.10) or any IP task. This file likely provides the output formatting for the research briefing. Omitting it may silently break the `research_topic()` wrapper function.
**Recommended Fix:** Audit `briefing.py` to determine if it's a standalone command or imported by `last30days.py`. If imported, add it to the skills port. If standalone, mark it as deprecated.

---

**GAP-028**
**Severity:** Medium
**Category:** Missing CI Step — mypy Not Run on API
**Description:** The CI workflow (Task 0.9) runs `ruff check` and `ruff format` on `packages/` and `apps/`, but only runs `pytest` on `packages/pipeline/tests/`. There is no mypy type check for `apps/api/` in CI, no pytest step for `apps/api/tests/`, and no `npm test` step for the web app. Type errors in the API will only be caught locally, not in CI.
**Recommended Fix:** Add CI steps: `mypy apps/api/` with the same strict config, `pytest apps/api/tests/ -v`, and `cd apps/web && npm test` (once web tests are added in Phase 4).

---

**GAP-029**
**Severity:** Medium
**Category:** Missing Dependency — `resend` Package Not in API Dependencies
**Description:** DESIGN Section 4.2 lists `resend_api_key` in `Settings` and DESIGN Section 2 includes a `services/email.py` file for transactional email. `resend` is not in `apps/api/pyproject.toml` (Task 0.3). The email service is referenced for beta invitations and workspace invites (Phase 8 Task 8.1) but has no implementation path.
**Recommended Fix:** Add `resend>=2.0` to `apps/api/pyproject.toml`. Add Task 3.7: implement `app/services/email.py` with `send_invite()` and `send_welcome()` functions.

---

### LOW (Nitpicks and Future-Proofing Gaps)

---

**GAP-030**
**Severity:** Low
**Category:** Missing Dependency — `pydantic-settings` Not in API pyproject.toml
**Description:** Task 0.3's `apps/api/pyproject.toml` lists `pydantic-settings>=2.0` but the file created in Task 0.3 does not include it. The import `from pydantic_settings import BaseSettings` in `app/config.py` (Task 0.3) will fail. (Minor because it's an obvious add, but will block the first `uvicorn` start.)
**Recommended Fix:** Verify that `pydantic-settings>=2.0` is in `apps/api/pyproject.toml`. It appears to be listed but confirm.

---

**GAP-031**
**Severity:** Low
**Category:** Missing Step — `npm run lint` Script
**Description:** CI Task 0.9 runs `npm run lint` but the web scaffold from `npm create vite` does not include a `lint` script by default. ESLint must be separately configured. No `eslint.config.js` or `.eslintrc` is created in any task.
**Recommended Fix:** Add to Task 0.4: `npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react`. Add `"lint": "eslint src --ext .ts,.tsx"` to `package.json` scripts.

---

**GAP-032**
**Severity:** Low
**Category:** Missing Phase — MCP Server Has No Implementation Phase
**Description:** The MCP server (`apps/mcp/`) appears in the monorepo structure and DESIGN Section 7 has substantial interface design. The IP has no phase for it. PRD Section 12 describes it as a "first-class client." It is missing entirely from the phase-by-phase plan. Developers will note it in the file tree, start implementing it, and find no guidance.
**Recommended Fix:** Either add Phase 9: MCP Server (post-beta), or explicitly mark it as "future scope" in the monorepo structure and DESIGN document with a placeholder that raises `NotImplementedError`.

---

**GAP-033**
**Severity:** Low
**Category:** Missing Step — TypeScript Database Types
**Description:** Appendix C shows `supabase gen types typescript --local > apps/web/src/api/database.types.ts` but this file path is never imported in any component. The web app API client uses the OpenAPI-generated client, but Supabase Realtime subscriptions need the database types for type safety. No task wires this into the build process.
**Recommended Fix:** Add to Phase 4: import `database.types.ts` into the Supabase client initialization and type the `supabase.channel()` calls using the generated types.

---

**GAP-034**
**Severity:** Low
**Category:** Missing Guidance — YouTube API Quota Management
**Description:** PRD Section 5.3 notes "YouTube Data API v3 has a 10,000 unit daily quota (each search = 100 units)." With multiple workspaces potentially triggering discovery jobs simultaneously, a shared `YOUTUBE_DATA_API_KEY` will exhaust the quota in 100 searches. The IP mentions "per-workspace limits for paid tiers" but provides no implementation guidance and no quota tracking table in the database schema.
**Recommended Fix:** Add a `youtube_api_quota` table (or use Redis counters) to track daily usage per API key. Add a quota check before each YouTube Data API call. Document in Phase 6 or 7.

---

**GAP-035**
**Severity:** Low
**Category:** Phase Ordering Issue — Channel Plugins Deferred Too Late
**Description:** Phase 6 (Week 4-5) implements Reddit, TikTok, HackerNews, LinkedIn, and X channels. But Phase 3's `run_discovery` ARQ job (Task 3.4) already calls `registry.get_discover(competitor.platform)` and iterates over competitors. If a user's brain has `reddit` competitors, Phase 3 workers will silently return empty results because Reddit channel isn't registered until Phase 6. This creates a "working but wrong" state that is hard to debug.
**Recommended Fix:** Move at minimum the Reddit channel (Phase 6 Task 6.1) to Phase 3, since Reddit is a core discovery platform per the PRD. Or add a guard in Phase 3 jobs that raises a clear error when a channel is not registered rather than silently returning empty.

---