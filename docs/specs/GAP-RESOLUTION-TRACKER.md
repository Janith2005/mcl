# MCL Gap Resolution Tracker

**Date:** 2026-03-24

## Summary

- **Total gaps identified:** 210 across 6 review dimensions
- **Critical/High gaps resolved through discussion:** ~59
- **Remaining Medium/Low gaps:** ~151 (to be addressed during implementation)

## Review Sources

| Review | File | Gaps |
|--------|------|------|
| PRD Review | PRD-GAP-ANALYSIS.md | 23 |
| Design Spec Review | DESIGN-GAP-ANALYSIS.md | 36 |
| Implementation Plan Review | IMPLEMENTATION-PLAN-GAP-ANALYSIS.md | 35 |
| Code/Implementation Review | GAP-ANALYSIS.md | 36 |
| Business Logic Review | BUSINESS-LOGIC-GAPS.md | 33 |
| UI/UX Review | UX-GAP-ANALYSIS.md | 47 |

---

## Resolved Gaps (Organized by Resolution)

### Resolution 1: Pydantic Models — Extend, Don't Replace

- **Gaps addressed:** DESIGN-GAP-005, 006, 007, 021, 022
- **Decision:** Preserve all GVB schema fields, add MCL extensions on top
- **Updated:** DESIGN.md Section 3.3.1

### Resolution 2: YouTube API — BYOK + Paid Fallback

- **Gaps addressed:** PRD-GAP-002, BUSINESS-GAP-22
- **Decision:** Free tier = BYOK required. Paid tier = MCL provides key, metered per call. Keys encrypted in workspace_connections.
- **Updated:** PRD.md, DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 3: CLI Paid Value Proposition

- **Gaps addressed:** BUSINESS-GAP-01, 07
- **Decision:** CLI users pay for additional platforms (LinkedIn, TikTok, Reddit, HN, X), direct posting, carousel/infographic generation (Remotion), cloud brain sync, team collaboration
- **Updated:** PRD.md Section 11

### Resolution 4: Hardcoded Paths -> PipelineConfig

- **Gaps addressed:** CODE-GAP-PORT-01, IP-GAP-005
- **Decision:** PipelineConfig dataclass injected everywhere. 14 GVB files with ~30 path constants refactored.
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 5: Monorepo Structure — packages/

- **Gaps addressed:** IP-GAP-002
- **Decision:** Standardize on packages/ directory for all apps
- **Updated:** IMPLEMENTATION-PLAN.md

### Resolution 6: Brain Optimistic Locking (Enterprise Grade)

- **Gaps addressed:** CODE-GAP-CONC-01
- **Decision:** version column + brain_audit_log + section-level JSON merge patch + exponential backoff retry (max 3)
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 7: WebSocket Ticket Auth (Enterprise Grade)

- **Gaps addressed:** PRD-GAP-014, DESIGN-GAP-014
- **Decision:** 30-second single-use Redis tickets (not JWT in URL). Connection limits (10/workspace). Heartbeat. Workspace revalidation per message.
- **Updated:** DESIGN.md

### Resolution 8: Analytics Collector (Enterprise Grade)

- **Gaps addressed:** IP-GAP-004, CODE-GAP related to fetch scripts
- **Decision:** Port fetch-yt-analytics.py and fetch-ig-insights.py. Supabase Vault for credentials. Auto token refresh. Per-video resilience. Rate limit backoff.
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 9: Status Enum Single Source of Truth

- **Gaps addressed:** DESIGN-GAP-017, 018
- **Decision:** Python enums (TopicStatus, ScriptStatus) generate both Pydantic validation and DB CHECK constraints
- **Updated:** DESIGN.md

### Resolution 10: Instagram Scraping — Split Model (A+C)

- **Gaps addressed:** PRD-GAP-005
- **Decision:** Web dashboard uses Apify API. CLI users run instaloader locally with TOS acknowledgment.
- **Updated:** PRD.md, DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 11: Creator-Controlled Agency Permissions

- **Gaps addressed:** DESIGN-GAP-008, PRD-GAP-009
- **Decision:** workspace_access_grants table with 9 granular boolean permissions. Creator controls what agency sees. RLS policy checks grants.
- **Updated:** DESIGN.md, PRD.md

### Resolution 12: Onboarding UX — Hybrid (Quick Form + AI Chat)

- **Gaps addressed:** UX-GAP-001, 002
- **Decision:** Quick form for basics (2 min) -> optional AI coaching chat for depth. Minimum viable brain defined.
- **Updated:** PRD.md, DESIGN.md

### Resolution 13: Dashboard Home — Pipeline Status Board

- **Gaps addressed:** UX-GAP-006
- **Decision:** Brain health score, pipeline funnel counts, recent activity, quick actions, top performer
- **Updated:** PRD.md, DESIGN.md

### Resolution 14: WeightSliders — Advanced Override with Reset

- **Gaps addressed:** UX-GAP-008
- **Decision:** Advanced settings feature. Manual override + "Reset to AI-recommended" button. Changes logged in audit.
- **Updated:** DESIGN.md

### Resolution 15: Timeline — Parallel Track Model

- **Gaps addressed:** IP-GAP-016
- **Decision:** 3 parallel tracks (Pipeline+CLI / API+DB / Frontend). Beta at week 7-8 with 3 devs.
- **Updated:** IMPLEMENTATION-PLAN.md

### Resolution 16: Dead Letter Queue with Auto-Retry

- **Gaps addressed:** DESIGN-GAP-003, CODE-GAP-JOB related
- **Decision:** dead_letter_jobs table. Auto-retry: 15min -> 1hr -> permanent_failure + Sentry + email. Manual requeue from dashboard.
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 17: Offline Mode — v1 removed, v2 planned

- **Gaps addressed:** PRD-GAP-004, 007
- **Decision:** v1 CLI always online. v2 adds offline mode with server-wins sync.
- **Updated:** PRD.md, IMPLEMENTATION-PLAN.md

### Resolution 18: GDPR Export/Deletion

- **Gaps addressed:** PRD-GAP-016
- **Decision:** GET /export (ZIP), DELETE /workspace (30-day soft delete), POST /account/delete, nightly purge job
- **Updated:** DESIGN.md, PRD.md

### Resolution 19: Swipe Hooks — Seed Library + Auto Recon

- **Gaps addressed:** PRD-GAP-012
- **Decision:** 50 curated seed hooks on workspace creation + auto recon job after onboarding
- **Updated:** DESIGN.md, PRD.md

### Resolution 20: Discover Request Schema

- **Gaps addressed:** PRD-GAP-011, 018
- **Decision:** Full DiscoverRequest, AnalyzeRequest, EvolveRequest schemas defined
- **Updated:** DESIGN.md, PRD.md

### Resolution 21: Mark as Published Flow

- **Gaps addressed:** PRD-GAP-020, 021
- **Decision:** PATCH /scripts/{id}/publish + CLI mcl publish + auto-schedule analytics at 48hr
- **Updated:** All three docs

### Resolution 22: Brain Storage — Hybrid JSONB

- **Gaps addressed:** CODE-GAP-DATA-01
- **Decision:** Single JSONB column + materialized generated columns for search. Section-level writes.
- **Updated:** DESIGN.md

### Resolution 23: Health Check Endpoint

- **Gaps addressed:** DESIGN-GAP-027
- **Decision:** GET /health with postgres + redis checks, 200/503, version + timestamp
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 24: Admin-Configurable Plan Limits

- **Gaps addressed:** PRD-GAP-017, BUSINESS-GAP-04
- **Decision:** plans table + workspace_usage table. Admin dashboard edits limits. Enforcement via middleware. No code deploy needed.
- **Updated:** DESIGN.md, PRD.md, IMPLEMENTATION-PLAN.md

### Resolution 25: Port tracker.py — Duplicate Prevention

- **Gaps addressed:** DESIGN-GAP-016
- **Decision:** Port to pipeline package. Cloud mode uses recon_tracker_state Postgres table.
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 26: Port state_manager.py — Job Checkpoints

- **Gaps addressed:** DESIGN-GAP-001
- **Decision:** Port to pipeline package. Checkpoints write to jobs.progress JSONB. Resume from last stage on retry.
- **Updated:** DESIGN.md, IMPLEMENTATION-PLAN.md

### Resolution 27: Configurable AI Model IDs

- **Gaps addressed:** DESIGN-GAP-032
- **Decision:** No hardcoded model IDs. Configurable via workspace settings + plan defaults. Current defaults: claude-sonnet-4-6, claude-haiku-4-5.
- **Updated:** DESIGN.md

### Resolution 28: Request ID Propagation

- **Gaps addressed:** DESIGN-GAP-035
- **Decision:** UUID request_id on every request. Passed to ARQ jobs. In all logs + Sentry. Returned in error responses.
- **Updated:** DESIGN.md

### Resolution 29: Script Generation UX — Web + CLI

- **Gaps addressed:** UX-GAP-014
- **Decision:** Web = 4-step wizard. CLI = sequential interactive prompts + non-interactive flag mode.
- **Updated:** DESIGN.md, PRD.md

### Resolution 30: Long-Running Job UX — Web + CLI

- **Gaps addressed:** UX-GAP related to loading states
- **Decision:** Web = toast + nav indicator + job drawer. CLI = foreground with [q] to background + mcl jobs commands.
- **Updated:** DESIGN.md, PRD.md

### Resolution 31: Competitive Analysis

- **Gaps addressed:** BUSINESS-GAP-14
- **Decision:** Taplio, VidIQ, Castmagic, Lately.ai, ContentStudio mapped. MCL moat = evolving brain + contrast formula + HookGenie + skeleton ripping feedback loop.
- **Updated:** PRD.md

### Resolution 32: User Owns All AI Content IP

- **Gaps addressed:** BUSINESS-GAP-16
- **Decision:** User owns all outputs. MCL retains no IP rights. Must be in TOS before launch.
- **Updated:** PRD.md, IMPLEMENTATION-PLAN.md

---

### Resolutions 33-40: Quick Decisions

| # | Decision |
|---|----------|
| 33 | **API versioning** — /api/v1/ prefix + 6-month sunset policy |
| 34 | **CORS** — whitelist app domain + localhost:5173 |
| 35 | **Mobile responsive** — v2 |
| 36 | **WCAG** — v2 |
| 37 | **English only v1**, i18n in v2 |
| 38 | **Typer for CLI** (not Click) |
| 39 | **Port briefing.py** |
| 40 | **Service role key** only for workers, anon key + JWT for user-facing |

---

### Resolutions 41-59: Batch Technical Fixes

19 technical implementation fixes applied:

- Missing dependencies: bcrypt, google-generativeai, resend, pydantic-settings
- Worker Dockerfile
- OpenAPI offline spec
- API test scaffolding
- CI steps
- Environment variables
- workspace_connections table
- Brain evolution preview/apply endpoints
- audience_blockers + content_jobs in brain routes
- Structured logging
- TypeScript DB types
- subscriptions table
- Recon/Discovery page merge
- last30days full directory structure

---

## V2 Roadmap (Deferred Features)

All deferred items documented in PRD and IMPLEMENTATION-PLAN:

| Version | Features |
|---------|----------|
| **V2.0** | Zernio integration, Remotion integration, LinkedIn channel, X/Twitter channel, direct publishing |
| **V2.1** | Offline mode, server-wins sync, conflict resolution UI |
| **V2.2** | Mobile responsive, mobile app, WCAG AA, internationalization |
| **V2.3** | Cross-creator benchmarking, predictive analytics, A/B testing |
| **V2.4** | SSO, audit log dashboard, white-label, custom AI models |

---

## Remaining Medium/Low Gaps

~151 gaps remain at Medium/Low severity. These are implementation-time fixes (missing indexes, minor doc inconsistencies, edge case handling). Developers should reference the individual gap analysis files during implementation:

| File | Description |
|------|-------------|
| PRD-GAP-ANALYSIS.md | Product requirements gaps |
| DESIGN-GAP-ANALYSIS.md | Design specification gaps |
| IMPLEMENTATION-PLAN-GAP-ANALYSIS.md | Implementation planning gaps |
| GAP-ANALYSIS.md | Code and implementation gaps |
| BUSINESS-LOGIC-GAPS.md | Business logic and monetization gaps |
| UX-GAP-ANALYSIS.md | UI/UX and accessibility gaps |

---

*Generated during MCL brainstorming session on 2026-03-24. This document is the single source of truth for gap resolution status.*
