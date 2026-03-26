# PRD Gap Analysis Report

| Field | Value |
|-------|-------|
| **Review Date** | 2026-03-24 |
| **Source Document** | `/Users/yogi/mcl/docs/specs/PRD.md` (v1.0.0) |
| **Cross-Referenced** | GVB source at `/Users/yogi/content-scale/goviralbitch/` |
| **Total Gaps** | 23 |
| **Severity Breakdown** | 8 Critical, 15 High |

---

## PRD Gap Analysis Report — Microcelebrity Labs v1.0

**Reviewed:** /Users/yogi/mcl/docs/specs/PRD.md
**Cross-referenced against:** /Users/yogi/content-scale/goviralbitch/

---

### CRITICAL

**GAP-001 | GVB Onboard Has 7 Sections, PRD Claims 9**
Category: GVB Feature Parity / Data Migration

The PRD states the onboarding wizard has 9 sections and lists them repeatedly (Section 5.2, Section 7.1, Section 7.2). The actual `viral-onboard.md` source defines exactly 7 sections (Identity, ICP, Pillars, Platforms, Competitors, Cadence, Monetization). Audience Blockers and Content Jobs do exist in the GVB `agent-brain.schema.json` but `viral-onboard.md` explicitly numbers only 7 sections and the command file confirms it with "walk you through 7 areas." The PRD's 9-section count is correct based on the schema, but the GVB command only covers 7 interactively -- Sections 8 (Audience Blockers) and 9 (Content Jobs) are present in onboard but the command stops at Section 7 in its summary phrase. This discrepancy will confuse every developer implementing the web wizard and CLI port.

Recommended Fix: Audit `viral-onboard.md` fully to confirm whether sections 8-9 are covered, then make the PRD's section count definitive and consistent across all references.

---

**GAP-002 | YouTube API Quota Is Per-Project, Not Per-Workspace**
Category: Scalability / Technical Correctness

Section 5.3 states "YouTube API quota tracking per workspace (10,000 units/day shared across all workspaces, or per-workspace limits for paid tiers)." This is contradictory. The YouTube Data API v3 quota is tied to a Google Cloud project (API key), not to individual users. With a shared MCL API key, all 10,000 units are consumed across the entire platform, not per workspace. At even 100 active users running competitor discovery (each search = 100 units), the quota exhausts in minutes. The PRD does not specify whether MCL intends to use one shared GCP project, per-workspace GCP projects, or requires users to bring their own YouTube API keys.

Recommended Fix: Decide and document the quota architecture. If shared, specify the quota pooling/throttling strategy at the platform level. If per-user API keys are required, document the onboarding flow for collecting them and how they are stored.

---

**GAP-003 | No Data Migration Path for Existing GVB Users**
Category: Data Migration

Section 13 describes the GVB-to-MCL schema mapping but never specifies how an existing GVB user with populated `data/` files migrates to MCL. There is no `mcl import` command, no migration script specification, and no documented mapping of GVB's date-partitioned JSONL files (e.g., `data/topics/topics_20260304.jsonl`) to the `external_id` column in Postgres. The `external_id` column exists in the schema but the import procedure is completely absent.

Recommended Fix: Specify a `mcl migrate --from-gvb /path/to/goviralbitch` command. Document the JSONL-to-Postgres mapping, deduplication strategy, and how to handle GVB analytics entries that reference local script IDs that don't exist in MCL yet.

---

**GAP-004 | Offline Mode Sync Conflict Resolution Unspecified**
Category: Offline / Degraded Mode

Section 11 defines offline mode (`mcl --offline`) where data is stored locally in `~/.mcl/data/` and synced later with `mcl sync`. No conflict resolution strategy is defined. If a user runs offline discovery, generates hooks, then syncs -- but meanwhile another device (or collaborator) has modified the same workspace's brain or topics -- there is no specification for how conflicts are detected or resolved. JSONL append-only files in GVB avoided this problem; a cloud Postgres model does not.

Recommended Fix: Define the sync protocol. Specify whether offline mode uses last-write-wins, timestamps, or requires manual conflict resolution. Document which entities can conflict (brain updates are most dangerous) and how they are handled.

---

**GAP-005 | Instagram Scraping via Instaloader Likely Violates TOS**
Category: Compliance / Legal

The PRD reuses `recon/scraper/instagram.py` (Instaloader) for competitor scraping and treats it as a first-class discovery channel. Instaloader scrapes Instagram without an official API, violating Instagram's Terms of Service Section 3.2 (no automated data collection without express permission). This creates legal risk for MCL as a company hosting this feature. The Instagram Graph API does not provide competitor content access -- it only allows access to the authenticated user's own content. This means the entire Instagram competitor discovery feature has no compliant technical path.

Recommended Fix: Explicitly document this legal risk. Either remove Instagram competitor scraping from v1.0 scope, gate it behind a user acknowledgment (user runs scraping from their own machine), or replace it with a third-party data provider (Apify, PhantomBuster) that assumes the TOS liability.

---

**GAP-006 | No Token Refresh Failure Handling for Platform OAuth**
Category: Error Handling / Security

Section 5.1 states OAuth token refresh is handled by background jobs (ARQ + Redis). No error handling is defined for what happens when a token refresh fails -- which is common with YouTube (token revoked when user changes Google password) and Instagram (60-day token expiry). The API endpoint `GET /workspaces/{id}/connections/{platform}` returns "connection status + health" but no webhook or notification mechanism is specified to alert users when their connection expires mid-campaign. Analytics jobs will silently fail.

Recommended Fix: Define the failure cascade: token refresh failure -> connection status set to `expired` -> email notification sent via Resend -> in-app banner on dashboard -> analytics jobs skip that platform with an explicit error in the job result. Specify the retry count before marking expired.

---

### HIGH

**GAP-007 | `mcl sync` Is Mentioned Once, Never Specified**
Category: API Design / CLI

"Sync when back online: `mcl sync`" appears in Section 11 with zero further specification. No API endpoint for sync is defined in Section 10. No data format, conflict model, or partial-sync behavior is described. This is a core feature for the CLI-first persona (Persona C) who may work offline.

Recommended Fix: Add a `POST /workspaces/{id}/sync` endpoint and fully specify the sync payload format, idempotency guarantees, and error responses.

---

**GAP-008 | Brain Evolution Auto-Mode Requires Approval -- Creates UX Dead End**
Category: User Flow / Missing Edge Case

Section 5.7 states brain evolution "can run automatically after each analytics collection" but also says "Proposed changes shown as a diff in the web dashboard with approve/reject per change." These two behaviors conflict. If auto-evolution is enabled but the user never logs back in to approve the diff, the brain never evolves. There is no flow for what happens if proposed changes sit unapproved for 30+ days while new analytics accumulate.

Recommended Fix: Define the auto-approve timeout (e.g., proposed changes auto-apply after 7 days if unapproved), or distinguish between auto-apply mode and propose-only mode as separate configuration options.

---

**GAP-009 | RLS Policy Does Not Cover Parent-Child Workspace Access**
Category: Multi-tenancy / Security

The RLS policy shown in Section 9 only grants access if `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`. An agency owner (`owner` role on the parent workspace) would have no access to child workspace data unless they are also explicitly added to `workspace_members` for each child workspace. The PRD states "Parent workspace admins see aggregate metrics across all children" but the RLS policy does not implement this -- a parent workspace member has no row in child workspace's `workspace_members`.

Recommended Fix: Define how parent-to-child access traversal works in RLS. Either use a separate `workspace_hierarchy` table with recursive CTEs in the policy, or explicitly require that agency members be added to each child workspace they need to access.

---

**GAP-010 | No Stripe Webhook Failure Handling**
Category: Billing / Monetization

Section 15 mentions "Stripe webhooks update `subscriptions` table in Supabase" with no further specification. Missing: the `subscriptions` table is not defined in Section 13's core table list. No idempotency handling for duplicate webhook delivery is specified. No handling for failed payment -> grace period -> downgrade flow is described. No specification for what happens to in-progress jobs when a workspace is downgraded mid-run.

Recommended Fix: Add the `subscriptions` table to the data model. Define the webhook event handlers (`customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted`). Specify the grace period and downgrade cascade behavior.

---

**GAP-011 | `POST /workspaces/{id}/discover` Has No Input Schema**
Category: API Design

The discover endpoint is listed in Section 5.3 but its request body is never specified. A developer cannot implement it without knowing: which keywords to use (brain defaults, override, or both?), competitor filter (all or subset?), date range, content type filter, limit per source. The GVB `viral-discover.md` has a mode selector (C/K/B) and `--deep` flag -- neither maps to a defined API request schema.

Recommended Fix: Define the full request body for every background-job-initiating endpoint: `POST /discover`, `POST /analyze`, `POST /brain/evolve`. Each needs mode, filters, limits, and scheduling options.

---

**GAP-012 | Hook Repository (Swipe Hooks) Is Workspace-Scoped -- Breaks the Value Prop**
Category: Architecture

The `swipe_hooks` table has `workspace_id NOT NULL`, meaning swipe hooks are isolated per workspace. But in GVB, the swipe hook library (`data/hooks/swipe-hooks.jsonl`) is a shared global repository of competitor-observed hooks that feeds the HookGenie "swipe-influenced" generation. If each workspace starts with zero swipe hooks, new users get no swipe-influenced hooks at all -- half the HookGenie value prop is missing. Section 5.5 says "loading `data/hooks/` swipe file for competitor-inspired hooks" but provides no mechanism for populating this data in a new workspace.

Recommended Fix: Define a system-level `swipe_hooks` seed dataset that all workspaces inherit on creation, plus workspace-specific additions. Or specify that the recon/skeleton_ripper pipeline auto-populates swipe hooks from competitor scraping, which must happen before HookGenie can fully function.

---

**GAP-013 | No Specification for `rescore.py` in MCL**
Category: GVB Feature Parity

`scoring/rescore.py` exists in GVB and provides rescoring of existing topics (e.g., after brain weights change). The PRD maps `scoring/engine.py` to MCL but never mentions `rescore.py`. After brain evolution updates `learning_weights`, existing topics in the `topics` table will have stale `weighted_total` scores. The kanban board will display incorrect rankings until topics are rediscovered.

Recommended Fix: Either specify a background job that rescores all workspace topics after `learning_weights` change, or document that `weighted_total` is recalculated on read. Add the rescoring endpoint or job to the API design.

---

**GAP-014 | WebSocket Authentication Not Specified**
Category: Security / API Design

Section 10 defines WebSocket endpoints for real-time job progress but does not specify how they are authenticated. Standard `Authorization: Bearer` headers are not supported in browser WebSocket APIs. The connection must use a query parameter token or a ticket/handshake pattern. Without this, the WebSocket endpoints are either unauthenticated (security hole) or blocked by browsers (broken feature).

Recommended Fix: Specify the WebSocket auth pattern. Common options: (1) short-lived ticket token issued by `GET /ws/ticket` then `WS /ws/...?token=<ticket>`, or (2) first WebSocket message contains the JWT for server-side validation.

---

**GAP-015 | LinkedIn Script Generation Has No Corresponding Discovery or Analytics**
Category: Platform/Channel Gap

LinkedIn is listed as a supported script format (Section 5.5) and angle format (Section 5.4, "5 angles per format including LinkedIn"). However, the channel rollout table in Section 6 shows LinkedIn discover/publish/analyze all at v1.5. This means at v1.0 launch, users can generate LinkedIn scripts but cannot discover LinkedIn topics or collect LinkedIn analytics. The feedback loop for LinkedIn content is completely broken at launch -- you can produce content but never learn from it.

Recommended Fix: Either remove LinkedIn from the v1.0 script/angle generation scope, or explicitly document the hybrid approach ("LinkedIn scripts generated but analytics are manual-entry only") and specify the manual entry flow for LinkedIn metrics.

---

**GAP-016 | No GDPR Data Export or Deletion Endpoint Defined**
Category: Compliance / Legal

Section 17 mentions "GDPR compliance: Data export endpoint, workspace deletion cascade, privacy policy" as a bullet in a table with no further detail. No API endpoint is specified for data export. No cascade deletion order is defined (must delete analytics -> scripts -> hooks -> angles -> topics -> brain -> workspace in correct FK order, plus Supabase Storage buckets and auth.users record). No data retention policy is stated.

Recommended Fix: Define `GET /workspaces/{id}/export` (returns full workspace data as JSON/CSV zip), `DELETE /workspaces/{id}` with explicit cascade order, and a documented data retention period for deleted workspaces (e.g., 30-day soft delete before hard purge).

---

**GAP-017 | AI Cost Metering Has No Enforcement Mechanism**
Category: Monetization / Billing

The `ai_usage` table tracks token usage, and rate limits are defined in Section 10. But the `ai_calls_per_day` limit in the feature flags is a count of API calls, not token count. A single "script generation (longform)" call is listed as 6,000 tokens ($0.18). If a pro user makes 200 AI calls/day generating only longform scripts, the AI cost would be $36/day per workspace -- far exceeding any reasonable subscription price. The PRD does not define token-based limits, hard spend caps per workspace, or overage billing thresholds.

Recommended Fix: Define limits in both call count AND token count. Specify a hard monthly spend cap per workspace tier with overage rates. Define what happens when a workspace hits its limit mid-operation (fail with 402, or complete and bill overage).

---

**GAP-018 | `mcl angle --competitors` Flag Has No API Backing**
Category: API Design / CLI Gap

The CLI command table in Section 11 lists `mcl angle --competitors` (maps to `/viral:angle --competitors`) but Section 5.4's API endpoints for angle generation do not include a competitor differentiation mode parameter. The GVB `viral-angle.md` Phase D does competitor differentiation by checking stored recon data. The API endpoint `POST /workspaces/{id}/topics/{topic_id}/angles` has no request body specification, so it's unclear how to pass the competitor analysis flag.

Recommended Fix: Define the request body for `POST /angles` including: `format` (longform/shortform/linkedin/all), `include_competitor_analysis` (boolean), `contrast_strength_filter`, and `count`.

---

**GAP-019 | GitHub as Discovery Source Is Unimplemented in MCL Channel Architecture**
Category: GVB Feature Parity

`viral-discover.md` explicitly lists GitHub as a keyword search platform ("search YouTube, Reddit, and GitHub for what's trending"). The `skills/last30days/` research skill handles Reddit/YouTube/web search. The channel rollout table in Section 6 does not list GitHub at all. No `GitHubChannel` plugin is specified. Developers porting the discover pipeline will have no guidance on implementing the GitHub discovery path.

Recommended Fix: Add GitHub to the channel rollout table. Either specify a `GitHubChannel` implementing `DiscoverChannel` (trending repos, README scanning, issue discussions) or explicitly descope it and document the GVB behavior being dropped.

---

**GAP-020 | No Specification for `POST /analyze` Input -- Published URL Linking Flow Undefined**
Category: User Flow / API Design

Section 7.3, Step 14 says "After publishing (manually), user links content URL in MCL." No UI flow, API endpoint, or data model is specified for this linking step. The `scripts` table has `published_url` and `published_at` columns, but no endpoint for setting them appears in Section 10. Without a published URL, the analytics job cannot match a script to its platform content ID to fetch metrics. The entire analytics collection job will fail silently for any script that was never linked.

Recommended Fix: Add `PATCH /workspaces/{id}/scripts/{script_id}` with `{published_url, published_at, platform_content_id}` to the API. Define the UI flow: a "Mark as Published" button on the script detail page that opens a modal for URL entry and triggers the analytics job schedule.

---

**GAP-021 | `mcl post` Command Referenced in Pipeline Diagram but Never Defined**
Category: GVB Feature Parity / Missing Feature

The Executive Summary pipeline diagram shows `DISCOVER -> ANGLE -> SCRIPT -> POST -> ANALYZE`. "POST" implies a pipeline stage. The GVB source has no `viral-post.md` command. The CLI command table in Section 11 has no `mcl post` command. This stage is either a missing command (the "link published URL" action from GAP-020) or mislabeled. A developer reading the pipeline diagram would assume a POST stage exists and spend time looking for it.

Recommended Fix: Rename the pipeline diagram node to "PUBLISH (manual)" or "LINK URL" and add the corresponding `mcl publish --url <url>` CLI command that sets `published_url` on a script record.

---

**GAP-022 | Cron-Based Analytics Collection Has No Conflict Prevention**
Category: Reliability / Background Jobs

Section 5.6 says analytics collection runs as scheduled background jobs. Section 5.7 says brain evolution "can run automatically after each analytics collection." No specification covers what happens if a manual `mcl analyze` run overlaps with a scheduled run for the same workspace, or if two brain evolution jobs queue simultaneously. ARQ does not provide built-in distributed locks. Duplicate analytics entries would corrupt winner extraction and brain evolution.

Recommended Fix: Specify job deduplication: only one `discover`, `analyze`, or `brain_evolve` job per workspace may be in `pending` or `running` state at once. Define the API response when a job is already running (409 Conflict with `job_id` of the running job).

---

**GAP-023 | Pricing Is TBD for All Paid Tiers**
Category: Monetization

"Pro" and "Agency" prices are listed as "TBD" in Section 15. While the strategy of learning before pricing is valid, the PRD provides no pricing hypothesis, no floor/ceiling for the pricing experiment, and no timeline for when pricing will be decided. Developers building the billing integration (Stripe) cannot complete the product checkout flow without at least placeholder prices. The Stripe product catalog needs to exist before billing can be implemented.

Recommended Fix: Define Stripe placeholder prices (even if subject to change) to unblock engineering. Specify the decision timeline (e.g., "prices will be set within 60 days of launch based on PostHog data"). Define the upgrade flow UI even if prices are $0 for now.

---

**Summary counts: 8 Critical, 15 High severity gaps identified.** The most implementation-blocking issues are GAP-001 (onboarding section count inconsistency), GAP-002 (YouTube quota architecture), GAP-005 (Instagram TOS), GAP-011 (missing API request schemas), GAP-020 (published URL linking flow entirely absent), and GAP-014 (WebSocket authentication).