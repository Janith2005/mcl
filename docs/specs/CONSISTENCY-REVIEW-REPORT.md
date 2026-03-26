# MCL Spec Documents -- Consistency & Completeness Review Report

**Date:** 2026-03-24
**Reviewer:** Senior Code Reviewer (Claude Opus 4.6)
**Documents Reviewed:**
- PRD.md (Sections 1-21 + Revision History)
- DESIGN.md (Sections 1-20 + Revision History)
- IMPLEMENTATION-PLAN.md (Phases 0-8 + V2 Roadmap + Revision History)
- GAP-RESOLUTION-TRACKER.md (Resolutions 1-59)

---

## Executive Summary

The three spec documents are broadly well-aligned after the 59 gap resolutions. The major architectural decisions (monorepo under `packages/`, FastAPI, Vite+React, Supabase, ARQ+Redis, Typer CLI) are consistent across all docs. All 59 resolutions from the tracker appear to be reflected in at least one spec document.

However, the review found **2 critical**, **5 high**, **8 medium**, and **4 low** severity issues. The critical issues (plan tier name mismatch across all three docs, and duplicate table definition in DESIGN.md) would confuse developers and cause schema conflicts if used as-is.

---

## Issues

### CRITICAL-001: Plan Tier Name Mismatch Across All Three Documents

**Category:** Consistency
**Location:** PRD.md Section 15, DESIGN.md Section 9.1 (line 4453), IMPLEMENTATION-PLAN.md Phase 2 Task 2.1 (line 2513)

**Issue:** The third plan tier has three different names across the three documents:
- **PRD.md** uses `free | pro | agency` (Section 15 feature table, line 1705)
- **DESIGN.md** uses `free | pro | enterprise` in the `workspaces` table CHECK constraint (line 4453: `CHECK (plan IN ('free', 'pro', 'enterprise'))`)
- **DESIGN.md** `plans` table uses `free | pro | agency` (line 4781: `name TEXT -- 'free', 'pro', 'agency'`)
- **IMPLEMENTATION-PLAN.md** uses `free | pro | team` in the `workspaces` table comment (line 2513: `-- free | pro | team`)

This means even within DESIGN.md itself, the `workspaces.plan` CHECK constraint contradicts the `plans.name` values. A developer implementing the schema would encounter a foreign key or validation failure.

**Recommended Fix:** Standardize on `agency` (the PRD term) across all three documents. Update:
1. DESIGN.md line 4453: `CHECK (plan IN ('free', 'pro', 'agency'))`
2. IMPLEMENTATION-PLAN.md line 2513: `-- free | pro | agency`

---

### CRITICAL-002: Duplicate `dead_letter_jobs` Table Definition in DESIGN.md

**Category:** Duplication
**Location:** DESIGN.md Section 9.1 (line 4690) AND Section 11.3 (line 5324)

**Issue:** The `CREATE TABLE public.dead_letter_jobs` statement appears identically in two places:
1. Section 9 (Data Model) at line 4690 -- as part of the comprehensive schema
2. Section 11.3 (Dead Letter Queue) at line 5324 -- as part of the DLQ feature description

Both include identical `CREATE INDEX` statements. Running this migration SQL as-is would produce a "relation already exists" error.

**Recommended Fix:** Keep the canonical definition in Section 9.1 (the schema section). In Section 11.3, replace the duplicate CREATE TABLE block with a reference: "See Section 9.1 for the `dead_letter_jobs` table schema." Keep the surrounding DLQ flow description and code examples.

---

### HIGH-001: API URL Structure Disagreement Between DESIGN.md and PRD/IMPL-PLAN

**Category:** Consistency
**Location:** DESIGN.md Section 4.1 (line 2415-2428) vs. PRD.md Section 5.x endpoints and IMPLEMENTATION-PLAN.md Phase 3 route table

**Issue:** The DESIGN.md FastAPI `include_router` calls use flat prefixes without workspace nesting:
```
prefix="/api/v1/brain"     -> GET /api/v1/brain
prefix="/api/v1/topics"    -> GET /api/v1/topics
prefix="/api/v1/scripts"   -> GET /api/v1/scripts
```

But the PRD.md and IMPLEMENTATION-PLAN.md consistently nest resources under workspaces:
```
GET /api/v1/workspaces/{id}/brain
GET /api/v1/workspaces/{ws_id}/topics
GET /api/v1/workspaces/{ws_id}/scripts
```

These are fundamentally different URL structures. The DESIGN.md approach extracts workspace_id from JWT/middleware (via `Depends(get_workspace)`), while the PRD/IMPL approach has it explicitly in the URL path. A developer following the DESIGN.md router registration would create different URLs than what the PRD describes.

**Recommended Fix:** Align the DESIGN.md `include_router` calls to match the workspace-nested pattern used by PRD and IMPLEMENTATION-PLAN. Either nest all routers under a workspace parent router, or update the prefixes to `/api/v1/workspaces/{workspace_id}/brain`, etc.

---

### HIGH-002: PRD REST Endpoint Summary Missing `/api/v1/` Prefix

**Category:** Consistency (internal)
**Location:** PRD.md Section 10, lines 1070-1124 ("REST Endpoint Summary")

**Issue:** The consolidated endpoint summary section omits the `/api/v1/` prefix on all endpoints:
```
POST   /auth/signup
GET    /workspaces
GET    /workspaces/{id}/brain
POST   /workspaces/{id}/discover
```

But the per-feature endpoint lists in Section 5.x all include the prefix:
```
POST   /api/v1/workspaces/{id}/connections
GET    /api/v1/workspaces/{id}/brain
POST   /api/v1/workspaces/{id}/discover
```

A developer using the Section 10 summary as a reference would build endpoints without the versioning prefix.

**Recommended Fix:** Add `/api/v1/` prefix to all endpoints in the Section 10 REST Endpoint Summary.

---

### HIGH-003: Pipeline Diagram Inconsistency Between DESIGN.md and PRD.md

**Category:** Consistency
**Location:** DESIGN.md Section 5.3 (line 3597) vs. PRD.md Section 1 (line 47)

**Issue:** The pipeline diagrams differ:
- **PRD.md**: `DISCOVER -> ANGLE -> SCRIPT -> PUBLISH (manual) -> ANALYZE`
- **DESIGN.md**: `DISCOVER -> ANGLE -> HOOKS -> SCRIPT -> PUBLISH -> ANALYZE`

The DESIGN.md version includes a separate `HOOKS` stage between ANGLE and SCRIPT. While HookGenie is indeed a distinct step in the script generation flow, the PRD and the original GVB pipeline both treat hooks as part of the Script stage (it is Phase B-E of `viral-script.md`).

**Recommended Fix:** Use the PRD 5-stage diagram as canonical (DISCOVER -> ANGLE -> SCRIPT -> PUBLISH -> ANALYZE). The hooks step is an internal sub-step within the SCRIPT stage. If DESIGN.md wants to show the expanded view, label it as "Detailed internal flow" and keep the top-level diagram consistent with the PRD.

---

### HIGH-004: IMPLEMENTATION-PLAN Missing `recon/web/` Deprecation in GVB Source Mapping

**Category:** Completeness
**Location:** IMPLEMENTATION-PLAN.md Section "GVB Source Mapping" (lines 332-397)

**Issue:** The GVB `recon/web/` directory (Flask dashboard: `app.py`, `templates/`, `static/`) is not mentioned in the IMPLEMENTATION-PLAN's GVB Source Mapping table. PRD.md (line 2123) and DESIGN.md (line 6444) both explicitly note `recon/web/` as "Not ported / Replaced by React dashboard". The IMPLEMENTATION-PLAN omission means a developer cross-referencing the mapping table would wonder if these files were missed.

**Recommended Fix:** Add a row to the GVB Source Mapping table:
```
| recon/web/ (app.py, templates/, static/) | Not ported | -- | Replaced entirely by React dashboard (packages/web) |
```

---

### HIGH-005: IMPLEMENTATION-PLAN Missing `last30days` Files in Source Mapping

**Category:** Completeness
**Location:** IMPLEMENTATION-PLAN.md Section "GVB Source Mapping" (lines 332-397)

**Issue:** The source mapping table lists `skills/last30days/` as a single entry ("Port full directory"), but the actual last30days directory contains several important files not mentioned in the per-file migration table:
- `store.py` (654 lines -- SQLite research accumulator, needs Supabase rewrite)
- `watchlist.py` (296 lines -- topic watchlist management)
- `scripts/lib/cache.py` (response caching)
- `scripts/lib/dedupe.py` (deduplication)
- `scripts/lib/parallel_search.py` (concurrent source fetching)
- `scripts/sync.sh` (sync script)

The DESIGN.md monorepo structure (lines 2283-2296) does mention `store.py`, `watchlist.py`, `parallel_search.py`, and `dedupe.py`. But the IMPLEMENTATION-PLAN's source mapping table doesn't have migration-type and change notes for these individual files, which means developers won't know that `store.py` needs a significant rewrite (SQLite -> Supabase/return values).

**Recommended Fix:** Expand the `skills/last30days/` entry in the source mapping table to include per-file migration notes for at least `store.py` (rewrite -- remove SQLite), `watchlist.py` (refactor), and `parallel_search.py` (as-is).

---

### MEDIUM-001: DESIGN.md Internal Inconsistency -- `workspaces.plan` CHECK vs. `plans.name`

**Category:** Consistency (internal)
**Location:** DESIGN.md lines 4453 and 4781

**Issue:** Within DESIGN.md itself, the `workspaces` table has:
```sql
plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise'))
```
But the `plans` table has:
```sql
name TEXT UNIQUE NOT NULL  -- 'free', 'pro', 'agency'
```

These are in the same document and would cause issues if `workspaces.plan` is a foreign key to `plans.name` (or if both are used for validation).

**Recommended Fix:** This is a subset of CRITICAL-001. Fixing CRITICAL-001 resolves this.

---

### MEDIUM-002: IMPLEMENTATION-PLAN Route Table Uses Different Endpoint Paths Than PRD

**Category:** Consistency
**Location:** IMPLEMENTATION-PLAN.md Phase 3 route table (lines 3264-3271) vs. PRD.md Section 5.3

**Issue:** Discovery/pipeline trigger endpoints differ:
- **PRD.md**: `POST /api/v1/workspaces/{id}/discover` (DiscoverRequest)
- **IMPL-PLAN**: `POST /api/v1/workspaces/{ws_id}/pipeline/discover`

The IMPL-PLAN nests discovery, angle generation, script generation, analytics, and rescore under a `/pipeline/` sub-path, while PRD puts them directly under the workspace. Similarly:
- PRD: `POST /workspaces/{id}/analyze`
- IMPL-PLAN: `POST /workspaces/{ws_id}/pipeline/analyze`

**Recommended Fix:** Decide whether pipeline operations live under `/pipeline/` or directly under workspace. Both are reasonable, but they must agree. The PRD pattern (direct under workspace) is simpler and more RESTful.

---

### MEDIUM-003: IMPLEMENTATION-PLAN `workspaces` Table Missing `updated_by` Column

**Category:** Completeness
**Location:** IMPLEMENTATION-PLAN.md Task 2.1 (line 2508-2516)

**Issue:** The DESIGN.md `brains` table includes `updated_by UUID` (added by Resolution 6 for optimistic locking), and the DESIGN.md revision history confirms this. However, the IMPLEMENTATION-PLAN's `workspaces` table (and likely the `brains` table equivalent -- the `agent_brains` table is not shown in the IMPL-PLAN schema excerpt I reviewed) may be missing the `version INTEGER` and `updated_by UUID` columns that Resolution 6 requires.

**Recommended Fix:** Verify the IMPLEMENTATION-PLAN's brain table includes `version INTEGER DEFAULT 1` and `updated_by UUID` columns. Cross-check with DESIGN.md Section 9.1.

---

### MEDIUM-004: PRD WebSocket Endpoint Paths Don't Match DESIGN.md

**Category:** Consistency
**Location:** PRD.md lines 1131-1133 vs. DESIGN.md Section 4.5

**Issue:** PRD WebSocket paths:
```
WS /ws/workspaces/{id}/discover/{job_id}
WS /ws/workspaces/{id}/analyze/{job_id}
```

DESIGN.md WebSocket paths (from route definitions):
```
/ws/pipeline/{job_id}
/ws/chat
```

IMPLEMENTATION-PLAN WebSocket paths:
```
WS /api/v1/workspaces/{ws_id}/jobs/{id}/stream
WS /api/v1/workspaces/{ws_id}/chat
```

All three documents define different WebSocket endpoint paths.

**Recommended Fix:** Standardize on one WebSocket URL pattern. The IMPLEMENTATION-PLAN pattern (`/api/v1/workspaces/{ws_id}/jobs/{id}/stream`) is most consistent with the REST API structure.

---

### MEDIUM-005: DESIGN.md Monorepo Structure Differs from IMPLEMENTATION-PLAN

**Category:** Consistency
**Location:** DESIGN.md Section 2 vs. IMPLEMENTATION-PLAN.md Section "Monorepo Structure"

**Issue:** Several structural differences:
1. DESIGN.md places pipeline under `packages/pipeline/src/mcl_pipeline/` (with `src/` layout). IMPLEMENTATION-PLAN places it under `packages/pipeline/mcl_pipeline/` (flat layout).
2. DESIGN.md places API under `packages/api/src/mcl_api/`. IMPLEMENTATION-PLAN places it under `packages/api/app/`.
3. DESIGN.md uses `docker/Dockerfile.api`, `docker/Dockerfile.worker`. IMPLEMENTATION-PLAN uses `packages/api/Dockerfile`, `packages/worker/Dockerfile`.
4. DESIGN.md puts Supabase config at `supabase/`. IMPLEMENTATION-PLAN puts it at `infra/supabase/`.

These are different project structures that would produce different import paths and Docker build contexts.

**Recommended Fix:** Pick one structure and update the other. The IMPLEMENTATION-PLAN structure (flat layout, no `src/`, API under `app/`, infra under `infra/`) appears to be the more implementation-ready version since it includes concrete file contents. Update DESIGN.md Section 2 to match.

---

### MEDIUM-006: Missing `workspace_access_grants` Table in IMPLEMENTATION-PLAN Schema

**Category:** Completeness
**Location:** IMPLEMENTATION-PLAN.md Phase 2 Task 2.1

**Issue:** The `workspace_access_grants` table (Resolution 11: Creator-Controlled Agency Permissions) is defined in DESIGN.md Section 9.2 (line 4983) and referenced in PRD.md Section 9. However, it does not appear in the IMPLEMENTATION-PLAN's initial schema migration SQL. A developer following the IMPL-PLAN migrations would miss this table entirely.

**Recommended Fix:** Add the `workspace_access_grants` CREATE TABLE to the IMPLEMENTATION-PLAN's Phase 2 Task 2.1 migration SQL.

---

### MEDIUM-007: Missing `plans` and `subscriptions` Tables in IMPLEMENTATION-PLAN Migration Order

**Category:** Completeness
**Location:** IMPLEMENTATION-PLAN.md Phase 2 Task 2.1

**Issue:** While `plans` and `subscriptions` tables exist in the IMPLEMENTATION-PLAN (lines 2903 and a `subscriptions` definition), they appear to be in a separate section rather than in the main initial migration. The `workspaces.plan` column references plan names, so `plans` should be created first. The migration order should be verified.

**Recommended Fix:** Ensure the migration file lists tables in dependency order with `plans` before `workspaces`.

---

### MEDIUM-008: DESIGN.md `AgentBrain` Model Missing `audience_blockers` and `content_jobs`

**Category:** Completeness
**Location:** DESIGN.md Section 3.3.1, `AgentBrain` class definition (line 660-681)

**Issue:** The `AgentBrain` Pydantic model in DESIGN.md Section 3.3.1 does not include `audience_blockers` or `content_jobs` fields, even though:
- PRD.md Section 5.2 lists both as user-managed brain sections (lines 261-262)
- The brain route in DESIGN.md (line 2599) allows updating these sections
- GAP-RESOLUTION-TRACKER Fix 50 explicitly added these

The `AgentBrain` model class stops at `metadata` (line 679) and does not have `audience_blockers: Optional[list[AudienceBlocker]]` or `content_jobs: Optional[ContentJobs]`.

**Recommended Fix:** Add `audience_blockers` and `content_jobs` fields to the `AgentBrain` class in DESIGN.md Section 3.3.1, along with their supporting Pydantic models (`AudienceBlocker`, `ContentJobs`).

---

### LOW-001: PRD.md Section Numbering After Competitive Landscape Insert

**Category:** Consistency (internal)
**Location:** PRD.md Sections 19-21

**Issue:** Resolution 31 added a Competitive Landscape section and the revision history states "Existing Section 19 (Risks) renumbered to Section 20." The Table of Contents shows:
- 19. Risks & Mitigations
- 20. Out of Scope (v1)
- 21. V2 Roadmap

But the actual competitive landscape section is listed as Section 19 in the revision note, which would push Risks to 20, Out of Scope to 21, and V2 Roadmap to a new Section 22. The current Table of Contents at lines 29-32 does not include a Competitive Landscape section entry.

**Recommended Fix:** Verify the actual section numbering in the body matches the Table of Contents. Add "19. Competitive Landscape" to the ToC and renumber subsequent sections.

---

### LOW-002: GVB `recon/web/` Flask App Has Unmentioned Scripts

**Category:** Completeness
**Location:** GVB Source Mapping across all docs

**Issue:** The GVB `scripts/` directory contains utility scripts not mentioned in any porting plan:
- `init-data.sh` (data directory initialization)
- `refresh-ig-token.sh` (Instagram token refresh)
- `setup-yt-oauth.py` (YouTube OAuth setup)
- `setup-ig-token.py` (Instagram token setup)
- `run-recon-ui.sh` (launches Flask dashboard)

These are replaced by MCL's server-side functionality (OAuth flows, token refresh jobs, React dashboard), but they are not explicitly listed in any "not ported" table.

**Recommended Fix:** Add a "Scripts Not Ported" section to the IMPLEMENTATION-PLAN source mapping noting these scripts and their MCL equivalents.

---

### LOW-003: DESIGN.md `PlatformConfig` Class Definition Placement

**Category:** Consistency (internal)
**Location:** DESIGN.md Section 3.3.1, line 682-685

**Issue:** The `PlatformConfig` class is defined AFTER the `AgentBrain` class that references it (line 672: `platforms: PlatformConfig`). While Python's `from __future__ import annotations` (present at line 531) makes this work via forward references, it is confusing for a spec document reader to see the model referenced before it's defined.

**Recommended Fix:** Move `PlatformConfig` definition above `AgentBrain` in the spec.

---

### LOW-004: Inconsistent Health Check Response Format

**Category:** Consistency
**Location:** IMPLEMENTATION-PLAN.md line 414 vs. line 3415

**Issue:** Two different health check response formats in the same document:
- Line 414 (acceptance criteria): `{"status": "healthy", "checks": {"postgres": true, "redis": true}, "version": "0.1.0", "timestamp": "..."}`
- Line 3415 (test description): `tests GET /health returns 200 with {"status": "ok"}`

The status field value differs: `"healthy"` vs. `"ok"`.

**Recommended Fix:** Standardize on one value. `"healthy"` is more descriptive and matches the acceptance criteria.

---

## Completeness Verification: All 59 Resolutions

| Resolution | PRD | DESIGN | IMPL-PLAN | Status |
|-----------|-----|--------|-----------|--------|
| 1. Pydantic Models | -- | Yes (3.3.1) | Yes (schemas) | OK |
| 2. YouTube BYOK | Yes (5.3) | Yes (8, 9) | Yes (mapping) | OK |
| 3. CLI Paid Value | Yes (11) | -- | -- | OK (PRD-only) |
| 4. PipelineConfig | -- | Yes (3.2) | Yes (Task 1.0) | OK |
| 5. Monorepo packages/ | -- | Yes (2) | Yes (2) | OK |
| 6. Brain Optimistic Locking | -- | Yes (9.1, 9.3) | Yes (Task 2.1) | OK |
| 7. WebSocket Ticket Auth | -- | Yes (4.5) | Yes (mentioned) | OK |
| 8. Analytics Collector | -- | Yes (3.8) | Yes (mapping) | OK |
| 9. Status Enum SSOT | -- | Yes (3.3.2) | -- | OK |
| 10. Instagram Split Model | Yes (5.3) | Yes (8) | Yes (mapping) | OK |
| 11. Agency Permissions | Yes (9) | Yes (9.2) | **Missing table in schema** | MEDIUM-006 |
| 12. Onboarding Hybrid | Yes (5.2) | Yes (3.6, 5.3a) | -- | OK |
| 13. Dashboard Home | Yes (5.0) | Yes (5.3a) | -- | OK |
| 14. WeightSliders | -- | Yes (5.3) | -- | OK |
| 15. Timeline Parallel | -- | -- | Yes (Phase 8) | OK |
| 16. Dead Letter Queue | -- | Yes (9, 11.3) | Yes (Task 2.1) | OK (but CRITICAL-002: duplicate) |
| 17. Offline Mode v2 | Yes (11, 20) | Yes | Yes | OK |
| 18. GDPR Export/Deletion | Yes (10, 17) | Yes (4.3.2) | -- | OK |
| 19. Swipe Hooks Seed | Yes (5.5, 13) | Yes (9) | Yes (Task 2.1) | OK |
| 20. Request Schemas | Yes (5.3, 5.6, 5.7) | Yes (4.3) | -- | OK |
| 21. Mark as Published | Yes (7.3, 10) | Yes (4.3.7) | Yes (route table) | OK |
| 22. Brain Hybrid JSONB | -- | Yes (9) | -- | OK |
| 23. Health Check | Yes (17) | Yes (4.3.15) | Yes (Phase 0) | OK |
| 24. Admin Plans | Yes (15) | Yes (9.1, 4.4) | Yes (Task 2.1) | OK |
| 25. Port tracker.py | -- | Yes (9.1, 20.1) | Yes (mapping) | OK |
| 26. Port state_manager.py | -- | Yes (11.3) | Yes (mapping) | OK |
| 27. Configurable AI Models | -- | Yes (3.5, 12.3) | -- | OK |
| 28. Request ID Propagation | -- | Yes (4.4, 16) | -- | OK |
| 29. Script Gen UX | Yes (7.3) | Yes (5.3, 5.4a) | -- | OK |
| 30. Long-Running Job UX | Yes (7.3, 7.4) | Yes (5.4a, 6.2) | -- | OK |
| 31. Competitive Landscape | Yes (19) | -- | -- | OK (PRD-only) |
| 32. AI Content IP | Yes (TOS) | -- | Yes (Phase 8) | OK |
| 33-40. Quick Decisions | Mixed | Mixed | Mixed | OK |
| 41-59. Batch Fixes | Mixed | Yes (Fix 50) | Mixed | OK |

All 59 resolutions are reflected. The gaps are in detail consistency, not missing resolutions.

---

## GVB Source Mapping Completeness

### 9 JSON Schemas: ALL PRESENT
All 9 GVB schemas are mapped in all three docs:
agent-brain, topic, angle, hook, script, analytics-entry, insight, swipe-hook, competitor-reel

### 7 Command Prompts: ALL PRESENT
All 7 GVB commands mapped:
viral-setup, viral-onboard, viral-discover, viral-angle, viral-script, viral-analyze, viral-update-brain

### Python Files: MOSTLY COMPLETE
Missing explicit mapping for:
- `recon/web/` directory (HIGH-004)
- `skills/last30days/` individual files: `store.py`, `watchlist.py`, `cache.py`, `dedupe.py`, `parallel_search.py` (HIGH-005)
- `scripts/` utility scripts: `init-data.sh`, `refresh-ig-token.sh`, `setup-yt-oauth.py`, `setup-ig-token.py`, `run-recon-ui.sh` (LOW-002)

---

## Summary of Required Fixes

| Priority | Count | Key Actions |
|----------|-------|-------------|
| Critical | 2 | Fix plan tier names to `agency` everywhere; remove duplicate DLQ table |
| High | 5 | Align API URL structure, add /api/v1/ prefix to PRD summary, fix pipeline diagram, add missing GVB source mapping entries |
| Medium | 8 | Fix WebSocket paths, align monorepo structure, add missing tables to IMPL-PLAN schema, add brain model fields |
| Low | 4 | Section numbering, minor format inconsistencies |

---

*Review completed 2026-03-24. All findings are based on document content as of this date.*
