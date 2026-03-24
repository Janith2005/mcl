# Microcelebrity Labs (MCL) -- Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-03-24
**Status:** Draft
**Author:** Product & Engineering

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Vision & Strategy](#4-product-vision--strategy)
5. [Core Features](#5-core-features)
6. [Platform/Channel Support](#6-platformchannel-support)
7. [User Flows](#7-user-flows)
8. [AI Integration](#8-ai-integration)
9. [Multi-tenancy & Workspace Model](#9-multi-tenancy--workspace-model)
10. [API Design](#10-api-design)
11. [CLI Integration](#11-cli-integration)
12. [MCP Server Integration](#12-mcp-server-integration)
13. [Data Model](#13-data-model)
14. [Authentication & Authorization](#14-authentication--authorization)
15. [Monetization & Billing](#15-monetization--billing)
16. [Analytics & Instrumentation](#16-analytics--instrumentation)
17. [Non-functional Requirements](#17-non-functional-requirements)
18. [Success Metrics & KPIs](#18-success-metrics--kpis)
19. [Risks & Mitigations](#19-risks--mitigations)
20. [Out of Scope (v1)](#20-out-of-scope-v1)
21. [V2 Roadmap -- Deferred Features](#v2-roadmap----deferred-features)

---

## 1. Executive Summary

Microcelebrity Labs (MCL) is a SaaS platform that transforms the Go Viral Bitch (GVB) CLI tool -- a trainable social media coaching system for Claude Code -- into a multi-tenant product serving creators, solopreneurs, and content agencies. The system discovers winning content topics, develops angles via the Contrast Formula, generates hooks and scripts using 6 proven patterns, and continuously learns from performance data through an evolving agent brain.

MCL wraps the existing GVB pipeline (~85% code reuse) into a Python library (`mcl-pipeline`), exposes it through a FastAPI orchestration layer, and delivers it to users via three equal first-class clients: a web dashboard (Vite + React + TypeScript), a CLI (`pip install mcl`), and an optional MCP server for AI tool integrations.

### Key Differentiators

- **Trainable AI coaching** -- the agent brain evolves with each content cycle, learning what hooks, topics, and formats work best for each creator
- **Contrast Formula engine** -- systematic angle development (common belief -> surprising truth) rather than generic AI writing
- **HookGenie** -- 6 battle-tested hook patterns (contradiction, specificity, timeframe tension, POV-as-advice, vulnerable confession, pattern interrupt) scored and ranked by performance data
- **Closed feedback loop** -- DISCOVER -> ANGLE -> SCRIPT -> PUBLISH (manual) -> ANALYZE -> brain evolves -> better DISCOVER
- **Hybrid AI model** -- CLI users bring their own Claude session (zero cost to MCL), web users get metered AI through MCL's Anthropic API key

### Origin

GVB lives at `goviralbitch/` within the `content-scale/` workspace. It consists of 7 Claude Code commands (`.claude/commands/viral-*.md`), a Python recon module (`recon/`), a scoring engine (`scoring/`), 9 JSON Schema files (`schemas/`), a research skill (`skills/last30days/`), and local JSON/JSONL data storage (`data/`). MCL extracts this into a proper package, replaces file-based storage with Supabase Postgres, adds multi-tenancy, and wraps everything in a production API and web UI.

---

## 2. Problem Statement

### Creator Pain Points

1. **Content ideation is a bottleneck.** Creators spend hours scrolling platforms for topic ideas, with no systematic way to evaluate which topics will resonate with their specific audience.

2. **No feedback loop.** Most creators publish content and never systematically analyze what worked, why it worked, or how to replicate success. Each piece of content starts from zero.

3. **Generic AI tools produce generic content.** ChatGPT and similar tools don't know the creator's ICP, brand voice, content pillars, or performance history. Output requires heavy editing.

4. **Scaling content requires hiring.** Agencies and multi-creator operations lack tooling to maintain brand consistency across creators while systematically discovering and developing content.

5. **Monetization is an afterthought.** Content is created without a funnel direction. CTAs are bolted on rather than woven into the content's contrast and proof structure.

### Market Gap

Existing tools fall into two camps:
- **AI writing tools** (Jasper, Copy.ai) -- generate generic copy without understanding the creator's unique positioning, ICP, or performance data
- **Analytics tools** (TubeBuddy, VidIQ, Metricool) -- show performance data but don't close the loop back into content creation

MCL bridges both: it is an AI-powered content system that learns from your analytics to generate increasingly effective content, with the creator's unique brain (ICP, pillars, tone, competitors, performance patterns) at the center of every decision.

---

## 3. Target Users & Personas

### Primary: B2C -- Creator-to-Founders

#### Persona A: "The Solopreneur Creator"
- **Profile:** One-person business ($50K-$500K revenue), creates content to drive leads to their core offer (community, course, consulting, SaaS)
- **Platforms:** YouTube + Instagram + LinkedIn
- **Pain:** Spends 10+ hours/week on content ideation and scripting. No systematic approach. Some videos pop, most don't, and they can't figure out why.
- **Goal:** Consistent content pipeline that drives qualified leads, without hiring a content team
- **Tool usage:** Will use both web dashboard (for visual pipeline management) and CLI (for power-user workflows in Claude Code)
- **Budget sensitivity:** High -- needs to see ROI before committing to a monthly subscription

#### Persona B: "The Trapped Operator"
- **Profile:** Running a business ($200K-$2M) that depends on referrals. Knows they need to build a personal brand but doesn't have a system.
- **Platforms:** YouTube + LinkedIn
- **Pain:** Analysis paralysis on content strategy. Doesn't know what to talk about, how to differentiate from competitors, or how to connect content to revenue.
- **Goal:** A clear system that tells them what to create, how to angle it, and what CTA to use -- then learns and adapts
- **Tool usage:** Primarily web dashboard. Less technical, wants guided workflows.
- **Budget sensitivity:** Medium -- will pay for time savings

#### Persona C: "The Claude Code Power User"
- **Profile:** Technical creator/developer, already uses Claude Code daily. Creates content about AI, coding, automation, SaaS.
- **Platforms:** YouTube + X/Twitter + GitHub
- **Pain:** Has the technical chops to build anything but lacks a content strategy framework. Publishes sporadically.
- **Goal:** Terminal-native content pipeline that integrates into their existing Claude Code workflow
- **Tool usage:** CLI exclusively. Will never open a dashboard if they can avoid it.
- **Budget sensitivity:** Low -- values developer experience above all. Happy to pay for a great CLI.

### Secondary: B2B -- Content Agencies

#### Persona D: "The Agency Owner"
- **Profile:** Content or marketing agency managing 3-20 creator clients
- **Platforms:** All major platforms (varies per client)
- **Pain:** Each client needs unique brand voice, ICP, and strategy. Currently using spreadsheets and tribal knowledge. Onboarding new team members is slow.
- **Goal:** Centralized platform where each client has their own brain, and editors can generate on-brand content without deep client knowledge
- **Tool usage:** Web dashboard for team management, CLI for senior strategists
- **Budget sensitivity:** Low per seat -- looking for per-workspace pricing that scales with clients

---

## 4. Product Vision & Strategy

### Vision Statement

MCL makes every creator's next piece of content better than their last, by building a persistent AI brain that learns what works for their specific audience and continuously improves recommendations.

### Strategy

**Phase 1 -- Foundation (v1.0):** Port the GVB pipeline to MCL. Ship all 7 pipeline stages via API, web dashboard, and CLI. Single-tenant focus (individual creators). Feature-flag infrastructure for future tiers.

**Phase 2 -- Intelligence (v1.5):** Deepen the feedback loop. Automated analytics collection. Cross-creator anonymized benchmarks. Advanced scoring with ML-assisted pattern detection.

**Phase 3 -- Scale (v2.0):** Multi-creator workspaces for agencies. Team roles and permissions. White-label option. Marketplace for content strategies/templates.

### Go-to-Market

- **Launch:** CLI users first (Claude Code community), web dashboard in parallel
- **Marketing site:** `microcelebritylabs.com` (Framer or Webflow, separate from app)
- **App:** `app.microcelebritylabs.com` (Vite + React SPA)
- **Distribution:** Product Hunt, Claude Code marketplace, creator communities (Skool, Twitter/X)
- **Pricing:** Ship free tier first, learn from PostHog usage data, then introduce paid tiers based on actual value creation patterns

---

## 5. Core Features

MCL exposes the GVB pipeline as 7 features, each mapping to one or more GVB commands. Every feature is available through all three clients (web, CLI, API).

### 5.0 Dashboard Home Screen

The **first screen after login** is the pipeline status board. It provides at-a-glance visibility into the creator's content pipeline health:

- **Brain Health Score** -- Percentage completion of brain sections. "Enhance Your Brain" CTA if incomplete.
- **Pipeline Funnel** -- Visual funnel showing item counts at each stage: Topics (42) -> Angles (18) -> Scripts (12) -> Published (7) -> Analyzed (5). Each stage is clickable.
- **Top Performer This Week** -- Highest-scoring published content from the last 7 days with key metrics (views, CTR, saves), hook pattern, and platform badge.
- **Recent Activity Feed** -- Last 10 pipeline events (discoveries, status changes, brain evolutions, analytics runs).
- **Quick Actions** -- Context-aware action buttons based on pipeline state (e.g., "Discover Topics" if no topics exist, "Run Analytics" if published content is un-analyzed).

This is the primary navigation hub. Users reach all pipeline features from here.

### 5.1 Workspace Setup

**GVB Source:** `viral-setup.md` (`.claude/commands/viral-setup.md`)

**What it does:** Connects the user's social platform APIs, verifies credentials, and configures the workspace for data collection.

**GVB Components Reused:**
- Phase A dependency checks -> replaced by server-side health checks
- Phase B API key configuration -> OAuth flows managed by Supabase + server-side encrypted credential storage
- Phase C connection verification -> server-side API health pings
- Phase E analytics connections (YouTube OAuth, Instagram Graph API) -> server-managed OAuth with token refresh

**MCL Adaptations:**
- API keys stored in encrypted Supabase vault (not `.env` files)
- OAuth flows use server-side redirect URIs (`app.microcelebritylabs.com/oauth/callback/{platform}`)
- Connection status displayed on workspace settings page
- CLI users configure via `mcl setup` which opens browser for OAuth or accepts env vars
- Token refresh handled by background jobs (ARQ + Redis), not manual scripts
- No local dependency checks needed -- all processing is server-side

**Web Dashboard UI:**
- Settings page with platform connection cards (YouTube, Instagram, Reddit, etc.)
- Each card shows: connection status, last verified, quota usage
- "Connect" button triggers OAuth popup
- "Disconnect" button with confirmation

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/connections          -- initiate platform connection
GET    /api/v1/workspaces/{id}/connections          -- list all connections
GET    /api/v1/workspaces/{id}/connections/{platform} -- connection status + health
DELETE /api/v1/workspaces/{id}/connections/{platform} -- disconnect
POST   /api/v1/workspaces/{id}/connections/{platform}/verify -- re-verify
```

---

### 5.2 Onboarding (Agent Brain Setup)

**GVB Source:** `viral-onboard.md` (`.claude/commands/viral-onboard.md`)

**What it does:** Guided coaching session that populates the agent brain -- the central persistent memory that every pipeline stage reads from. Covers 9 sections: identity, ICP, content pillars, platforms, competitors, cadence, monetization, audience blockers, and content jobs.

**GVB Components Reused:**
- All 9 onboarding sections (identity, ICP, pillars, platforms, competitors, cadence, monetization, audience blockers, content jobs) -> mapped directly to Postgres tables
- Agent brain schema (`schemas/agent-brain.schema.json`) -> Pydantic model + Postgres schema
- Validation rules (minimum entries, non-empty fields) -> Pydantic validators
- Brain summary display format -> dashboard overview page

**MCL Adaptations -- Hybrid Onboarding Model:**

Onboarding is split into two phases: a **quick form** (required, ~2 minutes) and an **AI coaching chat** (optional, depth exploration).

**Phase 1: Quick Form (required, ~2 min)**
- Collects minimum viable brain fields: name, niche, platforms (research + posting)
- 3 simple screens, no AI required
- On completion, creates a functional brain with defaults for all other sections
- User lands on the dashboard immediately and can start discovering topics

**Phase 2: AI Coaching Chat (optional, "Enhance Your Brain")**
- Prompted after quick form: "Want to make your brain smarter? Chat with our AI coach."
- Deep-dives into ICP (segments, pain points, goals), content pillars, audience blockers, monetization strategy
- Conversational, not form-based -- AI asks follow-up questions based on responses
- Each AI-generated insight populates brain sections in real time
- User can skip or return to this later from the Brain page

**Minimum Viable Brain (required fields):**

| Field | Source | Default if Skipped |
|---|---|---|
| `identity.name` | Quick form | (required -- no default) |
| `identity.niche` | Quick form | (required -- no default) |
| `platforms.posting_platforms[]` | Quick form | (required -- at least 1) |
| `identity.tone[]` | AI coaching or default | `["professional", "conversational"]` |
| `icp.segments[]` | AI coaching or default | Generic segment based on niche |
| `pillars[]` | AI coaching or default | 3 auto-generated from niche keywords |
| `cadence` | AI coaching or default | 3 shorts/week, 1 longform/week |
| `monetization` | AI coaching or default | `{"primary_funnel": "audience_building"}` |
| `learning_weights` | System default | All weights = 1.0 |

Users with incomplete onboarding (Phase 1 only) still get a fully functional brain -- the system fills in sensible defaults. The Brain Health indicator on the dashboard shows completion percentage and suggests which sections to enhance.

**Additional delivery modes:**
- **CLI:** `mcl onboard` runs the quick form interactively, then offers `mcl onboard --enhance` for the AI coaching session. Data saved to Supabase via API.
- **Web AI coaching:** Uses MCL's Anthropic API key. For CLI users, Claude Code handles the conversation natively.
- Brain data stored as structured Postgres records with `workspace_id` (not a single JSON file).
- The "evolution_log" from the GVB schema becomes a `brain_audit_log` table with full audit trail.

**Agent Brain Data Model (from `schemas/agent-brain.schema.json`):**

The agent brain has 13 top-level sections. The following are **user-managed** (set during onboarding, updated only by the user):

| Section | GVB Schema Field | Description |
|---------|-----------------|-------------|
| Identity | `identity` | Creator name, brand, niche, tone[], differentiator |
| ICP | `icp` | Audience segments[], pain_points[], goals[], platforms_they_use[], budget_range |
| Pillars | `pillars[]` | Content themes with name, description, keywords[] |
| Platforms | `platforms` | Research platforms[], posting platforms[], api_keys_configured[] |
| Competitors | `competitors[]` | Name, platform, handle, why_watch |
| Cadence | `cadence` | weekly_schedule (shorts_per_day, shorts_days[], longform_per_week, longform_days[]) |
| Monetization | `monetization` | primary_funnel, secondary_funnels[], cta_strategy (default_cta, lead_magnet_url, community_url, newsletter_url, website_url), client_capture |
| Audience Blockers | `audience_blockers[]` | lie, destruction, pillar |
| Content Jobs | `content_jobs` | build_trust[], demonstrate_capability[], drive_action[] (arrays of pillar names) |

The following are **system-managed** (updated only by the analyze and update-brain pipeline stages):

| Section | GVB Schema Field | Description |
|---------|-----------------|-------------|
| Learning Weights | `learning_weights` | icp_relevance, timeliness, content_gap, proof_potential (floats 0.1-5.0, default 1.0) |
| Hook Preferences | `hook_preferences` | contradiction, specificity, timeframe_tension, pov_as_advice, vulnerable_confession, pattern_interrupt (floats, default 0) |
| Visual Patterns | `visual_patterns` | top_visual_types[], top_pattern_interrupts[], text_overlay_colors{}, pacing_performance{} |
| Performance Patterns | `performance_patterns` | top_performing_topics[], top_performing_formats[], audience_growth_drivers[], avg_ctr, avg_retention_30s, total_content_analyzed, view_to_follower_ratio, avg_saves, avg_shares |

**Web Dashboard UI:**
- Quick form: 3-screen wizard for minimum viable brain (~2 min)
- "Enhance Your Brain" AI coaching chat (optional, accessible from Brain page and dashboard)
- Brain overview dashboard: summary cards for each section
- Inline editing: click any section to edit in place
- "Brain health" indicator: shows completeness percentage and suggests next enhancement steps (e.g., "Add ICP details to improve topic scoring")

**API Endpoints:**
```
GET    /api/v1/workspaces/{id}/brain              -- full brain state
PATCH  /api/v1/workspaces/{id}/brain              -- partial update (any user-managed section)
GET    /api/v1/workspaces/{id}/brain/{section}    -- single section
PUT    /api/v1/workspaces/{id}/brain/{section}    -- replace single section
GET    /api/v1/workspaces/{id}/brain/health       -- completeness check
GET    /api/v1/workspaces/{id}/brain/events       -- evolution log / audit trail
```

---

### 5.3 Topic Discovery

**GVB Source:** `viral-discover.md` (`.claude/commands/viral-discover.md`)

**What it does:** Multi-platform topic discovery through two modes: (1) competitor content analysis (scraping recent videos/reels, ranking by engagement), and (2) keyword-based search (YouTube API, Reddit, GitHub). All topics are scored against the creator's ICP using 4 weighted criteria.

**GVB Components Reused:**
- `recon/scraper/youtube.py` -- YouTube Data API v3 channel search, video listing, statistics fetching, duration filtering
- `recon/scraper/instagram.py` -- Instaloader-based Instagram scraping (metadata only)
- `recon/scraper/downloader.py` -- Video download for transcription
- `recon/skeleton_ripper/` -- Full hook extraction pipeline:
  - `pipeline.py` -- Orchestrates download -> transcribe -> extract -> synthesize
  - `extractor.py` -- LLM-based skeleton extraction from transcripts
  - `llm_client.py` -- Anthropic/OpenAI client with fallback
  - `prompts.py` -- Extraction prompt templates
  - `synthesizer.py` -- Aggregates multiple skeletons into patterns
  - `cache.py` -- LLM response caching
  - `aggregator.py` -- Cross-competitor pattern aggregation
- `recon/bridge.py` -- Converts skeleton ripper output into scored JSONL topics
- `scoring/engine.py` -- Topic scoring against brain ICP:
  - `score_icp_relevance()` -- Keyword overlap with ICP segments, pain_points, goals
  - `score_content_gap()` -- Pillar keyword matching
  - `score_proof_potential()` -- Action vs opinion keyword detection
  - `apply_competitor_bonuses()` -- View-count-based scoring boosts
  - `calculate_weighted_total()` -- Applies learning_weights from brain
- `skills/last30days/` -- Reddit/X/YouTube/web search research pipeline (OpenAI-powered)
- Topic schema (`schemas/topic.schema.json`) -> Pydantic model + Postgres table

**The 4-Criteria Scoring System (from `scoring/engine.py`):**

Each discovered topic gets scored 1-10 on four criteria, weighted by the brain's `learning_weights`:

| Criterion | What It Measures | Scoring Logic (from `engine.py`) |
|-----------|-----------------|----------------------------------|
| `icp_relevance` | Does this matter to the creator's audience? | Keyword overlap with ICP segments + pain_points + goals. 0 matches=3, 1-2=5, 3-4=7, 5-6=8, 7+=9. Bonus +1 for 2+ pain point matches. |
| `timeliness` | Is this happening now? | Caller-provided (6 for competitor content, higher for breaking news) |
| `content_gap` | Room for a fresh take? | Base 6, +2 if topic matches pillar keywords. Competitor bonus: >100K views = +2, >50K = +1. |
| `proof_potential` | Can you show something on screen? | Action keywords (build, tutorial, demo) = 7-8. Opinion keywords (debate, rant) = capped at 6. |

**Weighted total:** `sum(score[k] * learning_weights[k])` for all 4 criteria.

**CCN Fit Filter (from `schemas/topic.schema.json`):** Topics must hit 2 of 3 audience segments:
- **Core:** Solves a $5K+ problem (checked against `icp.pain_points`)
- **Casual:** Interesting to 2+ audience segments
- **New audience:** A stranger with zero context can understand the hook

**MCL Adaptations:**
- Competitor scraping runs as background jobs (ARQ + Redis), not blocking the user's session
- YouTube API key model: Free tier users bring their own YouTube Data API key (BYOK), stored encrypted in workspace_connections. Paid tier users get MCL-managed YouTube API access, metered per API call. Rate limiting is per-key (each key has its own 10K units/day ceiling), not shared across workspaces.
- Results stored in `discovered_topics` Postgres table with `workspace_id`
- Real-time progress via WebSocket during discovery runs
- Web UI shows discovery results as a kanban board (New -> Developing -> Scripted -> Passed)
- CLI: `mcl discover --competitors` / `mcl discover --keywords` / `mcl discover --all`

**Web Dashboard UI:**

The Discovery page has two tabs, matching how GVB works (`/viral:discover` does both competitor and keyword discovery in one command):
- **"Discover Topics" tab:** Discovery mode selector (Competitor / Keyword / Both), keyword editor, progress bar, results table sortable by weighted_total and filterable by pillar/platform, topic detail panel with scoring breakdown/CCN fit, bulk actions (approve, pass, develop angle)
- **"Competitor Intel" tab:** Competitor scraping UI (skeleton ripper results, video browser, swipe hooks). This replaces the previously separate Recon page.

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/discover                  -- start discovery job (DiscoverRequest: mode, competitor_handles, platforms, videos_per_competitor, keywords, keyword_sources, depth, schedule, cron_expression)
GET    /api/v1/workspaces/{id}/discover/jobs/{job_id}    -- job status
GET    /api/v1/workspaces/{id}/topics                    -- list all topics (paginated, filterable)
GET    /api/v1/workspaces/{id}/topics/{topic_id}         -- topic detail
PATCH  /api/v1/workspaces/{id}/topics/{topic_id}         -- update status
DELETE /api/v1/workspaces/{id}/topics/{topic_id}         -- delete topic
WS     /ws/pipeline/{job_id}                              -- real-time progress
```

---

### 5.4 Angle Development

**GVB Source:** `viral-angle.md` (`.claude/commands/viral-angle.md`)

**What it does:** Transforms discovered topics into format-specific content angles using the Contrast Formula (common belief -> surprising truth). Generates 5 angles per format (longform, shortform, LinkedIn) = 15 angles per topic. Each angle includes CTA direction, competitor differentiation, content job mapping, and audience blocker destruction.

**GVB Components Reused:**
- The entire Contrast Formula framework from `viral-angle.md`:
  - Phase C: 6-step angle generation (common belief, surprising truth, contrast strength rating, format-specific guidance, ICP connection mapping, funnel direction)
  - Phase D: Competitor differentiation (checking recon data for competitor coverage)
  - Phase E: Display format (summary tables + full details)
- CTA template system (`data/cta-templates.json`) -- template selection by format and cta_type, variable substitution
- Angle schema (`schemas/angle.schema.json`) -> Pydantic model + Postgres table
- Content job mapping from brain's `content_jobs`
- Audience blocker matching (semantic comparison against `audience_blockers[]`)

**The Contrast Formula (core of `viral-angle.md`):**

```
Common Belief (A) --> Surprising Truth (B)
```

Every angle must have:
- A genuinely held common belief (not a strawman)
- A surprising truth backed by evidence
- A contrast strength rating: mild | moderate | strong | extreme
- A proof method: demo > data > before/after > case study > expert testimony

**Contrast Strength Definitions:**
| Strength | Description | Engagement |
|----------|-------------|-----------|
| mild | Slight reframe, "huh, interesting" | Low |
| moderate | Meaningful flip, challenges an assumption | Good |
| strong | Directly contradicts common wisdom with proof | High |
| extreme | Paradigm shift, makes audience rethink everything | Viral potential (must be credible) |

**Format-Specific Angle Guidance:**
- **Longform:** Curiosity-driven title, demo/case study proof, 8-20 min target. Structure: Hook (A->B tease) -> Context -> Proof -> Implementation -> CTA
- **Shortform:** 3-second rule, visual emphasis, 30-60s target. Structure: Hook -> Quick proof -> Payoff -> CTA. ONE script cross-posts to Shorts + Reels + TikTok.
- **LinkedIn:** Bold opening statement, personal story, engagement question. Structure: Bold opener -> Story/proof -> Insight -> Question

**MCL Adaptations:**
- AI generates angles server-side for web users (metered Anthropic API calls)
- CLI users: Claude Code generates angles locally (zero cost to MCL)
- Angles stored in `angles` Postgres table with foreign key to `topics`
- Competitor differentiation pulls from stored recon data (not re-scraped)
- CTA templates loaded from database (seeded from `data/cta-templates.json`)
- Batch angle generation: web users can queue multiple topics for angle development

**Web Dashboard UI:**
- Topic -> Angle generation wizard
- Format selector (longform / shortform / LinkedIn / all)
- Generated angles displayed as cards with contrast strength badges
- Side-by-side comparison view for 5 angles within a format
- Approve/reject/edit workflow per angle
- "Script this" button on each approved angle

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/topics/{topic_id}/angles  -- generate angles for a topic
GET    /api/v1/workspaces/{id}/angles                     -- list all angles (paginated, filterable)
GET    /api/v1/workspaces/{id}/angles/{angle_id}          -- angle detail
PATCH  /api/v1/workspaces/{id}/angles/{angle_id}          -- update angle (status, edits)
DELETE /api/v1/workspaces/{id}/angles/{angle_id}          -- delete angle
POST   /api/v1/workspaces/{id}/angles/batch               -- generate angles for multiple topics
```

---

### 5.5 Script Generation (HookGenie + Full Scripts)

**GVB Source:** `viral-script.md` (`.claude/commands/viral-script.md`)

**What it does:** Two-stage content production: (1) HookGenie generates 10 hooks per angle using 6 proven patterns -- 5 brain-influenced + 5 swipe-influenced, all scored on a composite metric; (2) Full script generation with format-specific structure, filming cards (longform), beat-by-beat sequences (shortform), or paragraph structure (LinkedIn).

**GVB Components Reused:**
- **HookGenie (6 patterns from `viral-script.md` Phase B-E):**
  - `contradiction` -- "Everyone says X, but actually Y"
  - `specificity` -- "$47,382 in 30 days using only..."
  - `timeframe_tension` -- "In 2024, this changes everything..."
  - `pov_as_advice` -- "If I were starting over, I'd..."
  - `vulnerable_confession` -- "I lost everything doing X..."
  - `pattern_interrupt` -- Breaks expected scroll patterns visually/verbally
- Hook scoring system (`schemas/hook.schema.json`):
  - `contrast_fit` (0-10): How well the hook leverages the A->B contrast
  - `pattern_strength` (0-10): How well the pattern matches the content type
  - `platform_fit` (0-10): How native it feels for the platform
  - `composite`: contrast_fit * 0.4 + pattern_strength * 0.35 + platform_fit * 0.25
- Brain context integration: `hook_preferences` weights boost higher-performing patterns, `visual_patterns` inform visual cue suggestions
- Swipe hook matching: loading `data/hooks/` swipe file for competitor-inspired hooks with keyword matching
- **Longform script structure (`schemas/script.schema.json`):**
  - `opening_hook` (text + pattern + visual direction)
  - `intro_framework` (3 P's: Proof / Promise / Plan)
  - `retention_hook` (mini-hook at ~30s, technique type)
  - `sections[]` (3-5 body sections, each with title, talking_points[], proof_element, transition, duration_estimate)
  - `mid_cta` (soft, value-driven, placed after section 2)
  - `closing_cta` (direct, from cta-templates.json)
  - `outro` (subscribe prompt + next video tease)
  - `filming_cards[]` (scene-by-scene: scene_number, section_name, shot_type, say[], show, duration_estimate, notes)
- **Shortform script structure (`schemas/script.schema.json` -> `shortform_structure`):**
  - `beats[]` (beat_number, timestamp, action, visual, text_overlay, audio_note)
  - `caption`, `hashtags[]`
  - `cta` (text + type + placement)
  - `estimated_duration`
- Script schema (`schemas/script.schema.json`) -> Pydantic model + Postgres table
- Swipe hook schema (`schemas/swipe-hook.schema.json`) -> Pydantic model + Postgres table

**MCL Adaptations:**
- Hook generation is an AI task: web users -> server-side Anthropic API; CLI users -> local Claude Code
- Hook repository (swipe hooks + generated hooks) stored in Postgres, queryable across sessions
- MCL ships with ~50 curated seed hooks across niches (`is_system: true`). Every new workspace inherits these on creation.
- After onboarding completes, a background recon job auto-runs to populate niche-specific swipe hooks from the user's configured competitors (`is_system: false`)
- Hook performance tracking: when a hook is used in published content, its performance data flows back via the analytics stage
- PDF export of scripts (ported from GVB's `scripts/generate-pdf.py`)
- Script versioning: edit history preserved for each script
- Collaborative editing: multiple team members can edit a script (agency use case)

**Web Dashboard UI -- 4-Step Script Wizard:**

The primary content creation flow is a guided 4-step wizard:

1. **Format Selection:** Three cards (Longform / Shortform / LinkedIn) -- user clicks to select. Each card shows format description, estimated output length, and best platform fit.
2. **Angle Selection:** Displays angle cards with contrast formula preview (Common Belief -> Surprising Truth), strength badge, proof method, CTA direction. "Generate new angles" button if no existing angles fit. User clicks to select.
3. **Hook Generation:** AI generates 10 hooks displayed as cards. Each card shows: hook text, pattern type badge (one of 6: contradiction, specificity, timeframe_tension, pov_as_advice, vulnerable_confession, pattern_interrupt), composite score bar, "Recommended" badge on the top scorer. User clicks to select. "Regenerate" button generates fresh hooks. "Combine two" mode lets user select two hooks to merge into one.
4. **Script Generation:** Full script in editable rich text view. Sidebar shows filming cards (longform) or beat sequence (shortform) in a collapsible panel. Bottom action bar: "Save Draft", "Export PDF", "Generate LinkedIn Post".

Progress bar at top with forward/back navigation between steps. Completed steps show checkmarks.

**Additional UI features:**
- Brain context sidebar (pattern performance, visual intelligence)
- Longform: section-by-section editor with filming card preview
- Shortform: beat timeline editor with timestamp markers
- LinkedIn: rich text editor with engagement question builder
- "Export PDF" button on any script
- Teleprompter mode: full-screen script display for recording

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/angles/{angle_id}/hooks   -- generate hooks for an angle
GET    /api/v1/workspaces/{id}/hooks                      -- list hooks (paginated, filterable by pattern, status)
GET    /api/v1/workspaces/{id}/hooks/{hook_id}            -- hook detail
PATCH  /api/v1/workspaces/{id}/hooks/{hook_id}            -- update hook (status, edits)
POST   /api/v1/workspaces/{id}/hooks/{hook_id}/script     -- generate full script from hook
GET    /api/v1/workspaces/{id}/scripts                    -- list scripts
GET    /api/v1/workspaces/{id}/scripts/{script_id}        -- script detail
PATCH  /api/v1/workspaces/{id}/scripts/{script_id}        -- update script
GET    /api/v1/workspaces/{id}/scripts/{script_id}/pdf    -- export PDF
GET    /api/v1/workspaces/{id}/swipe-hooks                -- swipe hook library
POST   /api/v1/workspaces/{id}/swipe-hooks                -- add swipe hook
```

---

### 5.6 Analytics & Performance Tracking

**GVB Source:** `viral-analyze.md` (`.claude/commands/viral-analyze.md`)

**What it does:** Multi-platform analytics collection for published content. Pulls metrics from YouTube Data API, YouTube Analytics API, and Instagram Graph API. Supports manual entry fallback. Identifies winners using statistical thresholds. Extracts patterns from top performers.

**GVB Components Reused:**
- Phase A: Platform scope detection, API availability checks, format scope (longform / shorts / all)
- Phase B: Content identification (matching scripts to published URLs)
- Phase C: YouTube Data API collection (views, likes, comments, engagement_rate) + YouTube Analytics API (CTR, avg_view_duration, retention_30s, subscribers_gained)
- Phase D: Instagram Graph API collection (views, reach, saves, engagement_rate, follower growth) + instaloader fallback
- Phase E: Validation rules (views > 0, engagement_rate < 100%, etc.)
- Phase F: Persistence (analytics entries matching `schemas/analytics-entry.schema.json`)
- Phase G: Winner extraction:
  - Statistical thresholds (CTR >= median * 1.5, views >= 75th percentile, etc.)
  - Pattern identification (which hook patterns, topics, formats win)
  - Transcript + visual analysis for top performers
- Phase H: Brain feedback loop (updating hook_preferences, learning_weights based on performance)
- Analytics entry schema (`schemas/analytics-entry.schema.json`) -> Pydantic model + Postgres table
- Insight schema (`schemas/insight.schema.json`) -> Pydantic model + Postgres table

**Analytics Metrics Collected:**

| Metric | YouTube (Data API) | YouTube (Analytics API) | Instagram (Graph API) | Instagram (Instaloader) |
|--------|-------------------|------------------------|----------------------|------------------------|
| Views | yes | yes | yes | yes |
| Impressions | no | yes | yes | no |
| CTR | no | yes | no | no |
| Retention (30s) | no | yes | no | no |
| Avg view duration | no | yes | no | no |
| Likes | yes | no | yes | yes |
| Comments | yes | no | yes | yes |
| Shares | no | no | yes | no |
| Saves | no | no | yes | no |
| Subscribers gained | no | yes | no | no |
| Engagement rate | calculated | calculated | calculated | calculated |

**MCL Adaptations:**
- Analytics collection runs as scheduled background jobs (ARQ + Redis)
- Configurable collection frequency: daily, every 3 days, weekly
- Historical tracking: multiple analytics snapshots per content piece (track growth over time)
- Dashboard charts: performance trends, hook pattern comparison, platform comparison
- Winner extraction surfaced as "Wins" feed on dashboard
- Automated insights: "Your contradiction hooks average 2.3x higher CTR than specificity hooks on YouTube"
- CLI: `mcl analyze --youtube --recent 10` / `mcl analyze --all`

**Web Dashboard UI:**
- Analytics overview: key metrics cards (avg CTR, avg retention, total views this month)
- Content performance table: sortable, filterable by platform/format/date range
- Winner badges on top-performing content
- Pattern analysis charts: hook pattern performance, topic performance, format comparison
- Time-series graphs: performance trends over weeks/months
- "Deep analysis" button for top 10 content (triggers transcript + visual analysis)

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/analyze                     -- start analytics collection job (AnalyzeRequest: content_ids, platforms, mode, date_range)
GET    /api/v1/workspaces/{id}/analyze/jobs/{job_id}       -- job status
GET    /api/v1/workspaces/{id}/analytics                    -- list analytics entries (paginated)
GET    /api/v1/workspaces/{id}/analytics/{entry_id}        -- entry detail
GET    /api/v1/workspaces/{id}/analytics/summary           -- aggregated dashboard data
GET    /api/v1/workspaces/{id}/analytics/winners            -- winner entries only
GET    /api/v1/workspaces/{id}/analytics/patterns           -- pattern analysis
POST   /api/v1/workspaces/{id}/analytics/manual             -- manual metric entry
WS     /ws/pipeline/{job_id}                                -- real-time collection progress
```

---

### 5.7 Brain Evolution (Update Brain)

**GVB Source:** `viral-update-brain.md` (`.claude/commands/viral-update-brain.md`)

**What it does:** Analyzes accumulated performance data and evolves the system-managed sections of the agent brain. This is the feedback loop that makes the system get smarter over time.

**GVB Components Reused:**
- Phase A: Data freshness check (compare `metadata.last_analysis` with new analytics entries)
- Phase B1: Learning weight adjustment (correlate scoring criteria with performance, adjust weights +/- 0.1-0.3, clamp to 0.1-5.0, minimum 5 content pieces)
- Phase B2: Hook preference scoring (composite performance score per pattern: CTR*0.4 + Retention*0.35 + Engagement*0.25, normalized to 0-100)
- Phase B3: Performance pattern aggregation (top topics, top formats, growth drivers, rolling averages with recency weighting)
- Phase B4: Visual pattern aggregation (running averages for visual types, text overlay colors, pacing, with trend detection: rising/stable/declining)
- Phase B5: Optimal posting times (confidence-based, requires 10+ data points per platform)
- Phase C: Diff display (proposed changes with old -> new values and reasons)
- Phase D: Confirmation + apply + evolution log entry

**Protected Fields (NEVER modified by brain evolution):**
- `identity`, `icp`, `pillars`, `platforms`, `competitors`, `cadence` (except `optimal_times`), `monetization`

**MCL Adaptations:**
- Brain evolution can run automatically after each analytics collection (configurable)
- Proposed changes shown as a diff in the web dashboard with approve/reject per change
- Evolution history timeline: see how each brain parameter changed over time
- CLI: `mcl update-brain` shows diff and prompts for confirmation
- Minimum data thresholds enforced server-side (5 content pieces for weight adjustments)
- Cross-workspace anonymized benchmarks (Phase 2): "Creators in your niche average 7.2% CTR with contradiction hooks"

**Web Dashboard UI:**
- Brain evolution panel: pending proposed changes with diff view
- Evolution timeline: historical brain changes with reasoning
- Auto-evolution toggle: enable/disable automatic brain updates after analytics runs
- Per-parameter history charts (e.g., `learning_weights.icp_relevance` over time)

**API Endpoints:**
```
POST   /api/v1/workspaces/{id}/brain/evolve              -- trigger brain evolution (EvolveRequest: mode=preview|apply, sections_to_evolve)
GET    /api/v1/workspaces/{id}/brain/evolve/preview       -- preview proposed changes without applying
POST   /api/v1/workspaces/{id}/brain/evolve/apply         -- apply specific proposed changes
GET    /api/v1/workspaces/{id}/brain/events               -- evolution history
GET    /api/v1/workspaces/{id}/brain/evolution-timeline    -- parameter change over time
```

---

## 6. Platform/Channel Support

### Plugin Architecture

Each social platform is implemented as a channel plugin conforming to three base interfaces. This allows new platforms to be added without modifying core pipeline code.

**GVB Components Informing This Design:**
- `recon/scraper/youtube.py` -> `YouTubeChannel` plugin
- `recon/scraper/instagram.py` -> `InstagramChannel` plugin
- `recon/config.py` -> `get_ig_competitors()`, `get_yt_competitors()` pattern (platform-filtered competitor lists)
- `recon/scraper/downloader.py` -> shared utility for video acquisition
- `skills/last30days/` -> `RedditChannel` plugin (research pipeline)

### Base Interfaces

```python
class DiscoverChannel(Protocol):
    """Interface for platforms that support topic discovery."""

    async def search_topics(
        self, keywords: list[str], date_range: DateRange, limit: int = 50
    ) -> list[RawTopic]:
        """Search platform for trending content matching keywords."""
        ...

    async def scrape_competitor(
        self, handle: str, date_range: DateRange, content_type: str = "all"
    ) -> list[RawContent]:
        """Pull recent content from a competitor's profile."""
        ...

    def get_quota_usage(self) -> QuotaStatus:
        """Return current API quota consumption."""
        ...


class PublishChannel(Protocol):
    """Interface for platforms that support content publishing."""

    async def publish(self, content: PreparedContent) -> PublishResult:
        """Publish content to the platform."""
        ...

    async def get_publish_status(self, publish_id: str) -> PublishStatus:
        """Check the status of a published piece."""
        ...


class AnalyzeChannel(Protocol):
    """Interface for platforms that support analytics collection."""

    async def collect_metrics(
        self, content_id: str, published_at: datetime
    ) -> AnalyticsSnapshot:
        """Collect current performance metrics for a published piece."""
        ...

    async def collect_bulk_metrics(
        self, content_ids: list[str]
    ) -> list[AnalyticsSnapshot]:
        """Collect metrics for multiple pieces at once."""
        ...
```

### Channel Rollout Plan

| Channel | Discover | Publish | Analyze | Release | GVB Code Exists |
|---------|---------|---------|---------|---------|-----------------|
| YouTube | v1.0 | v1.5 | v1.0 | Launch | `recon/scraper/youtube.py` |
| Instagram | v1.0 | v1.5 | v1.0 | Launch | `recon/scraper/instagram.py` |
| Reddit | v1.0 | -- | -- | Launch | `skills/last30days/` |
| TikTok | v1.2 | v1.5 | v1.2 | Fast follow | -- |
| Hacker News | v1.2 | -- | -- | Fast follow | -- |
| LinkedIn | v1.5 | v1.5 | v1.5 | Later | -- (via Apify) |
| X/Twitter | v1.5 | -- | v1.5 | Later | -- |

### Channel Registration

Channels are registered at startup via a plugin registry:

```python
# mcl_pipeline/channels/registry.py
CHANNEL_REGISTRY: dict[str, ChannelPlugin] = {}

def register_channel(platform: str, plugin: ChannelPlugin):
    CHANNEL_REGISTRY[platform] = plugin

def get_channel(platform: str) -> ChannelPlugin:
    if platform not in CHANNEL_REGISTRY:
        raise UnsupportedChannelError(platform)
    return CHANNEL_REGISTRY[platform]
```

---

## 7. User Flows

### 7.1 New User Onboarding (Web) -- Hybrid Model

```
1. User visits microcelebritylabs.com
2. Clicks "Get Started" -> redirected to app.microcelebritylabs.com/signup
3. Supabase Auth: email/password or Google OAuth
4. Workspace created automatically (workspace_id assigned)

PHASE 1: Quick Form (~2 min, required)
5. Screen 1: "What's your name and niche?" (identity.name, identity.niche)
6. Screen 2: "Where do you post content?" (platforms.posting_platforms[])
7. Screen 3: "Add 1-3 competitors to watch" (competitors[] -- optional, can skip)
8. Brain created with defaults for all other sections
9. Dashboard unlocks immediately with "Discover your first topics" CTA

PHASE 2: AI Coaching Chat (optional, prompted)
10. Dashboard shows "Enhance Your Brain" card with brain health score
11. Clicking opens AI coaching chat:
    a. AI asks about ICP (who is your audience? what are their pain points?)
    b. AI suggests content pillars based on niche + competitors
    c. AI explores audience blockers and monetization strategy
    d. Each response updates brain sections in real time
12. User can exit chat at any time -- partial progress is saved
13. "Connect your platforms" prompt -> OAuth flows for YouTube, Instagram
```

### 7.2 New User Onboarding (CLI)

```
1. pip install mcl
2. mcl auth login   -> opens browser for Supabase Auth
3. mcl onboard      -> interactive conversational flow (mirrors GVB /viral:onboard)
   - 9 sections, conversational Q&A
   - Data saved to Supabase via API
4. mcl setup        -> platform connections
   - Opens browser for OAuth (YouTube, Instagram)
   - Env var fallback: MCL_YOUTUBE_API_KEY, etc.
5. mcl discover     -> first topic discovery run
```

### 7.3 Content Creation Flow (Web)

```
1. Dashboard -> "Discover Topics" button
2. Select discovery mode: Competitor / Keyword / Both
3. Job starts (background):
   - Toast: "Discovery started -- we'll notify you when it's done"
   - Nav bar shows spinner + "1 job running"
   - Job detail drawer (slide from right) shows real-time WebSocket progress:
     each stage with done/running/pending status, progress bar, elapsed time, Cancel Job button
   - User can close drawer and continue working -- job runs in background
   - Browser notification on completion + results appear on Topics page
4. Results appear as topic cards, sorted by weighted score
5. User clicks topic -> enters Script Wizard (4-step guided flow):
   - Step 1: Select format (Longform / Shortform / LinkedIn) -- three cards, click to select
   - Step 2: Select or generate angles (contrast formula preview, strength badge, proof method)
   - Step 3: AI generates 10 hooks as cards (hook text, pattern type badge, composite score,
     "Recommended" badge on top scorer). User clicks to select. Can "Regenerate" or "Combine two."
   - Step 4: Full script in editable rich text view, filming cards sidebar (collapsible).
     Actions: Save Draft, Export PDF, Generate LinkedIn Post.
   - Progress bar at top, forward/back navigation between steps
6. User edits script in rich text editor
7. User exports script (PDF, copy to clipboard, teleprompter mode)
8. After publishing (manually), user clicks "I Published This" on the script detail page, pastes the platform URL
9. Script status -> published, first analytics pull scheduled at 48 hours, recurring weekly for 90 days
```

### 7.4 Content Creation Flow (CLI)

```
1. mcl discover --keywords
   - Foreground (default): live progress bar, stage-by-stage updates, elapsed time.
     Press [q] to background the job.
   - Background: mcl discover --keywords --background -> returns job_id immediately
   - Check progress: mcl jobs status <job_id>
   - Desktop notification on completion (if terminal supports it)
2. mcl angle --pick                    # shows topics, user selects interactively
3. mcl script                          # enters interactive script wizard:
   - Select format: Longform / Shortform / LinkedIn
   - Select angle (contrast formula preview, strength badge)
   - View top 3 hooks (press 'a' for all 10, 'r' to regenerate, 'c' to combine two)
   - Script generated -> choose: view in terminal, export PDF, LinkedIn post, mark published
4. mcl script --pdf                    # exports current script to PDF
5. # User publishes content manually on platform
6. mcl publish --script <id> --url <url>  # links published URL, schedules analytics
7. mcl analyze --youtube --recent 5    # collect analytics (also runs on schedule)
8. mcl update-brain                    # evolve brain from performance data

# Non-interactive mode (for automation / CI/CD):
mcl script --format longform --angle <id> --hook auto --output pdf
mcl discover --competitors --background --no-prompt
mcl jobs list                          # list running/recent jobs with status
mcl jobs status <id>                   # detailed progress for one job
mcl jobs cancel <id>                   # cancel a running job
```

### 7.5 Agency Multi-Creator Flow (Web)

```
1. Agency owner signs up, creates parent workspace
2. Adds child workspaces for each client creator
3. Invites team members with roles (admin, editor, viewer)
4. Each child workspace has its own brain, topics, angles, scripts, analytics
5. Agency dashboard shows cross-workspace metrics
6. Editors work within assigned child workspaces
7. Parent workspace admins see aggregate performance
```

### 7.6 Analytics Feedback Loop

```
1. Content published and URL linked in MCL
2. Analytics job runs (scheduled or manual)
3. Metrics collected from YouTube/Instagram APIs
4. Winner extraction identifies top performers
5. Brain evolution proposes changes:
   - Hook pattern weights adjusted
   - Learning weights updated
   - Performance patterns aggregated
   - Visual patterns analyzed
6. User reviews proposed changes (web: diff view, CLI: text diff)
7. User approves changes
8. Brain updated -> next Discover run produces better-scored topics
9. Next Script run favors proven hook patterns
10. Cycle repeats, getting smarter each iteration
```

---

## 8. AI Integration

### 8.1 Hybrid AI Model

MCL uses a hybrid approach to AI, determined by the client:

| Client | AI Provider | Cost to MCL | How It Works |
|--------|-------------|-------------|--------------|
| CLI (`mcl`) | User's own Claude Code session | $0 | CLI commands trigger Claude Code, which runs the pipeline prompts locally. MCL provides the prompt templates (ported from `.claude/commands/viral-*.md`), Claude Code provides the AI. |
| Web Dashboard | MCL's Anthropic API key | Metered | API routes that need AI (angle generation, hook generation, script writing) call Anthropic's API server-side with MCL's key. Usage tracked per workspace. |
| MCP Server | Depends on host AI | $0 | MCP protocol exposes pipeline as tools. The host AI (Claude Desktop, etc.) provides the intelligence. |

### 8.2 AI-Powered Pipeline Stages

Not all pipeline stages require AI. Here's the breakdown:

| Stage | AI Required? | What AI Does | Non-AI Fallback |
|-------|-------------|-------------|-----------------|
| Setup | No | -- | API verification is deterministic |
| Onboard | Optional | Suggest ICP pain points, generate pillar keywords | User fills in manually |
| Discover | Partial | Skeleton ripper uses LLM for hook extraction (`recon/skeleton_ripper/llm_client.py`) | Keyword search is API-only; competitor scraping is API-only; scoring is algorithmic (`scoring/engine.py`) |
| Angle | Yes | Contrast Formula requires creative reasoning | Cannot be done without AI |
| Script | Yes | Hook generation + script writing require creative reasoning | Cannot be done without AI |
| Analyze | Partial | Winner pattern identification benefits from AI reasoning | Metric collection is API-only; statistical thresholds are algorithmic |
| Update Brain | Partial | Insight generation benefits from AI | Weight adjustments are algorithmic |

### 8.3 Prompt Templates

The 7 GVB command files (`.claude/commands/viral-*.md`) contain detailed, phase-structured prompts that serve as the AI playbook. These are ported to MCL as structured prompt templates.

**GVB Source Files -> MCL Prompt Templates:**

| GVB Command | MCL Template | Key Sections Preserved |
|-------------|-------------|----------------------|
| `viral-setup.md` | `setup.py` (no AI prompts needed) | Connection verification logic only |
| `viral-onboard.md` | `onboard_prompts.py` | 9-section coaching questions, synthesis rules, validation |
| `viral-discover.md` | `discover_prompts.py` | Competitor analysis prompting, keyword generation, topic evaluation |
| `viral-angle.md` | `angle_prompts.py` | Contrast Formula (6-step generation), format-specific guidance, CTA mapping, competitor differentiation |
| `viral-script.md` | `script_prompts.py` | HookGenie 6 patterns, brain context formatting, script structure templates (longform/shortform/LinkedIn) |
| `viral-analyze.md` | `analyze_prompts.py` | Winner extraction reasoning, pattern identification, deep analysis |
| `viral-update-brain.md` | `brain_evolution_prompts.py` | Diff generation reasoning, insight synthesis |

Each prompt template:
- Accepts structured input (brain context, topic data, angle data, etc.)
- Returns structured output (Pydantic models matching the GVB schemas)
- Includes the GVB command's rules and constraints as system prompt context
- Is versioned for A/B testing and iteration

### 8.4 AI Usage Metering (Web Dashboard)

Web dashboard users consume MCL-provided AI. Usage is tracked and metered:

| Operation | Estimated Tokens | Approximate Cost |
|-----------|-----------------|------------------|
| Onboard suggestions | ~2,000 | $0.06 |
| Discover (skeleton ripping per video) | ~3,000 | $0.09 |
| Angle generation (15 angles) | ~8,000 | $0.24 |
| Hook generation (10 hooks) | ~4,000 | $0.12 |
| Script generation (longform) | ~6,000 | $0.18 |
| Script generation (shortform) | ~3,000 | $0.09 |
| Analytics pattern analysis | ~3,000 | $0.09 |
| Brain evolution | ~2,000 | $0.06 |

**Full pipeline run (discover -> angle -> script):** ~$0.60-$0.90 in AI costs per topic.

Usage is tracked per workspace in a `ai_usage` table and exposed on the billing page.

### 8.5 LLM Client Architecture

Ported from `recon/skeleton_ripper/llm_client.py`, the MCL LLM client supports:
- **Primary:** Anthropic Claude (Claude Sonnet for speed, Claude Opus for quality)
- **Fallback:** OpenAI GPT-4o (if Anthropic is down)
- **Caching:** Response caching to avoid redundant API calls (ported from `recon/skeleton_ripper/cache.py`)
- **Retry logic:** Exponential backoff with jitter (ported from `recon/utils/retry.py`)

---

## 9. Multi-tenancy & Workspace Model

### Architecture

MCL uses Supabase Row-Level Security (RLS) with `workspace_id` as the tenant isolation key on every data table.

### Workspace Hierarchy

```
Organization (B2B only)
  |
  +-- Parent Workspace (agency)
       |
       +-- Child Workspace (client 1)
       +-- Child Workspace (client 2)
       +-- Child Workspace (client 3)

Individual Account (B2C)
  |
  +-- Workspace (single workspace per user)
```

### B2C Model
- User signs up -> one workspace created automatically
- Workspace owns all data: brain, topics, angles, hooks, scripts, analytics
- Self-serve: user manages everything in their workspace
- Future: user can create additional workspaces (e.g., for different brands)

### B2B Model
- Agency owner signs up -> parent workspace created
- Parent workspace can create child workspaces
- Each child workspace has its own brain (unique per creator/client)
- Agency team members are invited to the parent workspace with specific child workspace access
- Parent workspace dashboard shows aggregate metrics across all children

### Creator-Controlled Agency Permissions

Creators retain full control over what agency partners can see and do in their workspace. Permissions are granted via `workspace_access_grants` (granular boolean flags):

| Permission | Description |
|---|---|
| `can_read_topics` | Agency can view discovered topics |
| `can_read_angles` | Agency can view developed angles |
| `can_read_scripts` | Agency can view scripts and filming cards |
| `can_read_analytics` | Agency can view performance analytics |
| `can_read_brain` | Agency can view brain configuration (ICP, pillars, etc.) |
| `can_edit_topics` | Agency can create/modify topics |
| `can_edit_scripts` | Agency can create/modify scripts |
| `can_trigger_discover` | Agency can run discovery jobs |
| `can_trigger_analyze` | Agency can run analytics collection |

**Key principles:**
- Creator grants permissions explicitly (Settings > Agency Access)
- Creator can revoke any permission at any time (takes effect immediately via RLS)
- Agency cannot self-escalate -- only the creator (workspace owner) can modify grants
- All agency actions are logged in the brain audit log with `actor_type = 'user'` and the agency user's ID
- RLS policies on all data tables check `user_has_parent_access(workspace_id, resource)` to enforce grants

### Roles & Permissions

| Role | Scope | Capabilities |
|------|-------|-------------|
| `owner` | Organization | Full access to all workspaces, billing, team management |
| `admin` | Workspace | Full CRUD on workspace data, can invite editors/viewers |
| `editor` | Workspace | Create/edit topics, angles, hooks, scripts. Cannot modify brain identity or billing. |
| `viewer` | Workspace | Read-only access to all workspace data |

### RLS Policy Pattern

Every data table includes:

```sql
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    -- ... other columns
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policy
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON topics
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
    ));
```

### Workspace Data Isolation

Each workspace has completely isolated:
- Agent brain (identity, ICP, pillars, etc.)
- Discovered topics
- Angles, hooks, scripts
- Analytics entries and insights
- Platform connections and credentials
- AI usage tracking

No data leaks between workspaces. Cross-workspace analytics (Phase 2) would use anonymized, aggregated data only.

---

## 10. API Design

### Architecture

FastAPI serves as a thin orchestration layer. It handles:
- Authentication (Supabase JWT verification)
- Request routing and validation (Pydantic models)
- WebSocket connections (real-time job progress)
- Background job dispatch (ARQ + Redis)
- OpenAPI spec auto-generation

The API does NOT contain business logic. All pipeline logic lives in `mcl-pipeline` (the Python package extracted from GVB). The API imports and calls pipeline functions.

### Base URL

```
Production:  https://api.microcelebritylabs.com/api/v1
Staging:     https://api-staging.microcelebritylabs.com/api/v1
```

### Authentication

All API requests require a Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_jwt>
```

The JWT contains `user_id` and is verified against Supabase Auth. Workspace access is checked via `workspace_members` table.

### REST Endpoint Summary

```
# Auth
POST   /api/v1/auth/signup                                -- create account
POST   /api/v1/auth/login                                 -- get JWT
POST   /api/v1/auth/refresh                               -- refresh JWT
POST   /api/v1/auth/logout                                -- invalidate session

# Account
POST   /api/v1/account/delete                             -- delete user account + all owned workspaces

# Workspaces
POST   /api/v1/workspaces                                 -- create workspace
GET    /api/v1/workspaces                                 -- list user's workspaces
GET    /api/v1/workspaces/{id}                            -- workspace detail
PATCH  /api/v1/workspaces/{id}                            -- update workspace settings
DELETE /api/v1/workspaces/{id}                            -- soft delete workspace (30-day grace period, then hard purge)
GET    /api/v1/workspaces/{id}/export                     -- GDPR data export (ZIP with all workspace data as JSON + PDFs)

# Workspace Members (agency)
POST   /api/v1/workspaces/{id}/members                    -- invite member
GET    /api/v1/workspaces/{id}/members                    -- list members
PATCH  /api/v1/workspaces/{id}/members/{user_id}          -- update role
DELETE /api/v1/workspaces/{id}/members/{user_id}          -- remove member

# Brain (see 5.2 for full list)
GET    /api/v1/workspaces/{id}/brain
PATCH  /api/v1/workspaces/{id}/brain
POST   /api/v1/workspaces/{id}/brain/evolve               -- EvolveRequest: {mode=preview|apply, sections_to_evolve}

# Platform Connections (see 5.1 for full list)
POST   /api/v1/workspaces/{id}/connections
GET    /api/v1/workspaces/{id}/connections

# Discovery (see 5.3 for full list)
POST   /api/v1/workspaces/{id}/discover                   -- DiscoverRequest: {mode, competitor_handles, platforms, videos_per_competitor, keywords, keyword_sources, depth, schedule, cron_expression}
GET    /api/v1/workspaces/{id}/topics

# Angles (see 5.4 for full list)
POST   /api/v1/workspaces/{id}/topics/{topic_id}/angles
GET    /api/v1/workspaces/{id}/angles

# Hooks & Scripts (see 5.5 for full list)
POST   /api/v1/workspaces/{id}/angles/{angle_id}/hooks
POST   /api/v1/workspaces/{id}/hooks/{hook_id}/script
GET    /api/v1/workspaces/{id}/scripts
PATCH  /api/v1/workspaces/{id}/scripts/{script_id}/publish -- {platform_url, platform_content_id?, published_at?}

# Analytics (see 5.6 for full list)
POST   /api/v1/workspaces/{id}/analyze                    -- AnalyzeRequest: {content_ids, platforms, mode, date_range}
GET    /api/v1/workspaces/{id}/analytics

# AI Usage
GET    /api/v1/workspaces/{id}/usage                      -- AI usage metrics
GET    /api/v1/workspaces/{id}/usage/history               -- usage over time
```

### WebSocket Endpoints

Long-running operations (discovery, analytics collection) use WebSocket for real-time progress:

```
WS /ws/pipeline/{job_id}                    -- real-time progress for any pipeline job
WS /ws/chat                                 -- AI coaching chat (streaming)
```

Message format:
```json
{
    "type": "progress",
    "stage": "competitor_scrape",
    "progress": 0.45,
    "message": "Scraping @competitor3 (3 of 5)...",
    "data": { "competitors_completed": 2, "competitors_total": 5 }
}
```

### Long-Running Job UX (Web Dashboard)

The web dashboard provides a multi-layered job awareness system so users are never blocked by long-running operations:

1. **Toast notification on job start:** "Discovery started -- we'll notify you when it's done." Auto-dismisses after 5 seconds. Clickable to open job detail drawer.
2. **Global job indicator in nav bar:** Small spinner + "N jobs running" text in the top navigation bar (similar to GitHub Actions). Clicking opens the job detail drawer. Hidden when no jobs are running.
3. **Job detail drawer (slide from right):** Real-time progress via WebSocket showing each stage with done/running/pending status icons, progress bar, elapsed time, and a Cancel Job button. Multiple jobs are listed as separate sections within the drawer.
4. **Background operation:** User can close the drawer and continue working on any page. The job runs entirely in the background with the nav bar indicator providing ambient awareness.
5. **Completion notification:** Browser notification via the Notifications API (if permission granted) + in-app toast notification + results automatically appear on the relevant page (TanStack Query cache invalidation).

### Error Format

```json
{
    "error": {
        "code": "QUOTA_EXCEEDED",
        "message": "YouTube API daily quota exceeded for this workspace's key",
        "detail": "Used 10,000 of 10,000 units on your BYOK key. Resets at midnight Pacific. Upgrade to paid tier for MCL-managed API access.",
        "retry_after": 3600
    }
}
```

### Rate Limiting

| Tier | Requests/min | Discovery jobs/day | AI calls/day |
|------|-------------|-------------------|--------------|
| Free | 60 | 3 | 20 |
| Pro | 300 | 20 | 200 |
| Agency | 1000 | unlimited | unlimited |

Rate limits enforced via Redis counters with sliding window.

---

## 11. CLI Integration

### Package

```
pip install mcl
```

The `mcl` CLI is a Python package that:
1. Imports `mcl-pipeline` directly for local operations (scoring, schema validation, data formatting)
2. Calls the MCL API for cloud features (data storage, platform connections, AI-for-web)
3. Uses Claude Code's AI session for all AI tasks (zero cost to MCL)

### Command Mapping

| CLI Command | GVB Equivalent | Behavior |
|-------------|---------------|----------|
| `mcl auth login` | -- | Opens browser for Supabase Auth, stores JWT locally |
| `mcl auth logout` | -- | Clears local JWT |
| `mcl setup` | `/viral:setup` | Platform OAuth via browser + env var config |
| `mcl setup --check` | `/viral:setup --check` | Local dependency check |
| `mcl onboard` | `/viral:onboard` | Interactive brain setup, saves to Supabase |
| `mcl discover` | `/viral:discover` | Topic discovery, results saved to Supabase |
| `mcl discover --competitors` | `/viral:discover --competitors` | Competitor-only discovery |
| `mcl discover --keywords` | `/viral:discover --keywords` | Keyword-only discovery |
| `mcl angle` | `/viral:angle` | Angle development (AI via Claude Code) |
| `mcl angle --pick` | `/viral:angle --pick` | Interactive topic selection |
| `mcl angle --competitors` | `/viral:angle --competitors` | Competitor angle analysis |
| `mcl script` | `/viral:script` | Interactive script wizard: format -> angle -> hooks -> script -> next actions (AI via Claude Code) |
| `mcl script --format longform --angle <id> --hook auto --output pdf` | -- | Non-interactive script generation. All flags skip interactive prompts. `--hook auto` selects highest-scoring hook. |
| `mcl script --longform` | `/viral:script --longform` | Longform script generation |
| `mcl script --shortform` | `/viral:script --shortform` | Shortform script generation |
| `mcl script --pdf` | `/viral:script --pdf` | Export script to PDF |
| `mcl publish --script <id> --url <url>` | -- | Mark script as published, schedule analytics |
| `mcl analyze` | `/viral:analyze` | Analytics collection |
| `mcl analyze --manual` | `/viral:analyze --manual` | Non-interactive analytics (cron-friendly) |
| `mcl analyze --deep-analysis` | `/viral:analyze --deep-analysis` | Deep transcript + visual analysis |
| `mcl update-brain` | `/viral:update-brain` | Brain evolution |
| `mcl status` | -- | Pipeline status dashboard (topics, angles, scripts in each state) |
| `mcl brain` | -- | Show current brain summary |
| `mcl brain edit` | -- | Interactive brain section editing |
| `mcl jobs list` | -- | List all running/recent jobs with status, type, start time, elapsed |
| `mcl jobs status <id>` | -- | Detailed progress for one job (stage-by-stage with done/running/pending) |
| `mcl jobs cancel <id>` | -- | Cancel a running job |

### Script Generation Interactive Flow (CLI)

The `mcl script` command uses sequential interactive prompts with `rich` library formatting and `questionary` for selection:

1. **Format selection:** Longform / Shortform / LinkedIn (arrow-key selection)
2. **Angle selection:** Shows angle cards with contrast formula preview and strength badge. User selects or triggers "Generate new angles."
3. **Hook selection:** Shows top 3 hooks by default. Press `a` for all 10, `r` to regenerate, `c` to combine two hooks. Each hook displays: text, pattern type, composite score, "Recommended" on top scorer.
4. **Script output:** Script generated with summary (format, sections, duration, filming cards). User chooses next action: view in terminal, export PDF, generate LinkedIn post, mark as published, exit.

**Non-interactive mode** for automation: `mcl script --format longform --angle <id> --hook auto --output pdf`. The `--no-prompt` flag suppresses all interactive input.

### Long-Running Job UX (CLI)

- **Foreground mode (default):** Live progress with real-time stage updates (done/running/pending), progress bar, elapsed time. Press `[q]` to background the job.
- **Background mode** (`--background` flag): Starts job, returns immediately with job ID. User checks with `mcl jobs`.
- **`mcl jobs list`** -- shows all running/recent jobs with status, type, start time, elapsed time.
- **`mcl jobs status <id>`** -- detailed stage-by-stage progress for one job.
- **`mcl jobs cancel <id>`** -- cancel a running job.
- **Desktop notification** on completion (if terminal supports it via `notify-send`, `osascript`, or `terminal-notifier`).
- **Non-interactive mode** (`--no-prompt`): all options via flags, no user input. Suitable for cron jobs and CI/CD.

### Internet Requirement

The CLI requires an internet connection for all operations. All data is stored in Supabase Postgres via the MCL API. There is no offline mode in v1.

### Future: v2 Offline Mode

Offline mode with local-first operation and server-wins sync with conflict flagging (Option C) is planned for v2. This will allow CLI users to work without connectivity and sync changes when back online. Conflicts (e.g., brain edits made on two devices) will be resolved using a server-wins strategy with flagged conflicts for user review.

### Claude Code Integration

The CLI is designed to work seamlessly within Claude Code sessions. Claude Code commands (`.claude/commands/`) that reference the pipeline will call `mcl` CLI commands under the hood, leveraging Claude Code's AI for the creative tasks (angle development, hook generation, script writing).

**MCL ships Claude Code command wrappers:**
```
.claude/commands/mcl-discover.md   -> wraps `mcl discover`
.claude/commands/mcl-angle.md      -> wraps `mcl angle`
.claude/commands/mcl-script.md     -> wraps `mcl script`
.claude/commands/mcl-analyze.md    -> wraps `mcl analyze`
```

These command files contain the same detailed prompts from the GVB commands but adapted to call `mcl` CLI for data persistence.

### CLI Value Proposition (Paid Tier)

The free GVB CLI covers the core 7-step pipeline for YouTube and Instagram. The MCL paid CLI subscription unlocks capabilities that justify the subscription for power users:

| Feature | Free (GVB) | MCL Paid CLI |
|---------|-----------|--------------|
| **Platform coverage** | YouTube, Instagram | + LinkedIn, TikTok, Reddit, Hacker News, X |
| **Direct posting** | Manual publish + paste URL | `mcl publish <script_id> --platform=youtube` posts directly via platform APIs |
| **Carousel/infographic generation** | Not available | `mcl design <script_id> --carousel` generates carousel slides and infographics from script content |
| **Cloud brain sync** | Local brain only (`~/.mcl/data/`) | Brain syncs across devices via Supabase. Work on laptop, continue on desktop. Always connected. |
| **Team/workspace collaboration** | Single user | Multiple team members share a workspace. `mcl workspace invite <email>`. Editors can generate content against a shared brain. |
| **Cross-device state** | Local JSON/JSONL files | Pipeline state (topics, angles, scripts, analytics) persists in cloud. No data loss on machine swap. |

**Direct posting** leverages the same `PublishChannel` interface from the channel plugin architecture. Each platform's OAuth credentials are stored encrypted per-workspace. The CLI authenticates via `mcl auth login` and uses the stored credentials server-side.

**Carousel/infographic generation** uses an AI design pipeline that converts script structure (sections, key points, CTAs) into visual assets. Output formats: PNG carousel slides, PDF infographic, Instagram story frames.

---

## 12. MCP Server Integration

### Overview

The MCP (Model Context Protocol) server exposes MCL pipeline operations as tools that any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf, etc.) can invoke.

### Status: v1.5 (Post-Launch)

MCP integration is a future enhancement. The architecture is designed to support it, but it ships after the web dashboard and CLI are stable.

### MCP Tools (Planned)

```
mcl_discover        -- Start topic discovery with specified mode
mcl_get_topics      -- Retrieve discovered topics with optional filters
mcl_generate_angles -- Generate angles for a topic
mcl_generate_hooks  -- Generate hooks for an angle
mcl_generate_script -- Generate full script from hook + angle
mcl_analyze         -- Trigger analytics collection
mcl_get_brain       -- Read current brain state
mcl_update_brain    -- Trigger brain evolution
mcl_get_analytics   -- Retrieve performance data
```

### MCP Resources (Planned)

```
mcl://brain          -- Current brain state (auto-updated)
mcl://topics/recent  -- Last 10 discovered topics
mcl://scripts/draft  -- Scripts in draft status
mcl://analytics/summary -- Performance summary
```

### Technical Approach

The MCP server imports `mcl-pipeline` directly (same as CLI) and calls the MCL API for cloud features. It runs as a local Python process registered with the MCP client.

```bash
# Install and register
pip install mcl[mcp]
mcl mcp register  # registers with Claude Desktop / other MCP clients
```

---

## 13. Data Model

### Migration from GVB File-Based Storage

GVB stores everything in local JSON/JSONL files under `goviralbitch/data/`. MCL migrates this to Supabase Postgres with the following mapping:

| GVB File | GVB Format | MCL Table | Key Changes |
|----------|-----------|-----------|-------------|
| `data/agent-brain.json` | Single JSON | `brain_*` (multiple tables) | Split into normalized tables: `brain_identities`, `brain_icps`, `brain_pillars`, `brain_platforms`, `brain_competitors`, `brain_cadences`, `brain_monetizations`, `brain_blockers`, `brain_content_jobs`, `brain_learning_weights`, `brain_hook_preferences`, `brain_performance_patterns`, `brain_visual_patterns` |
| `data/topics/*.jsonl` | JSONL per date | `topics` | Single table, all dates. Added `workspace_id`. |
| `data/angles.jsonl` | Single JSONL | `angles` | FK to `topics.id`. Added `workspace_id`. |
| `data/hooks.jsonl` | Single JSONL | `hooks` | FK to `angles.id`. Added `workspace_id`. |
| `data/hooks/hook-repo.jsonl` | Single JSONL | `hooks` (same table) | Merged with generated hooks. `source` column distinguishes. |
| `data/hooks/swipe-hooks.jsonl` | Single JSONL | `swipe_hooks` | Separate table. FK to competitor. Added `workspace_id`. |
| `data/scripts.jsonl` | Single JSONL | `scripts` | FK to `angles.id`. JSON columns for `script_structure`, `filming_cards[]`, `shortform_structure`. Added `workspace_id`. |
| `data/analytics/*.jsonl` | JSONL per date | `analytics_entries` | Single table, all dates. FK to `scripts.id`. Added `workspace_id`. |
| `data/insights/insights.json` | Single JSON | `insights` | Single row per workspace, JSON column for aggregated data. |
| `data/cta-templates.json` | Single JSON | `cta_templates` | Seed data table. Shared across workspaces (system-level). |
| `data/recon/` | Directory tree | `recon_*` tables | `recon_runs`, `recon_skeletons`, `recon_reports` |

### Schema Mapping: GVB JSON Schemas -> Pydantic Models

The 9 GVB JSON Schema files (`goviralbitch/schemas/`) become Pydantic v2 models in `mcl-pipeline`:

| GVB Schema | MCL Pydantic Model | Postgres Table |
|------------|-------------------|----------------|
| `agent-brain.schema.json` | `AgentBrain` (composite) | Multiple `brain_*` tables |
| `topic.schema.json` | `Topic` | `topics` |
| `angle.schema.json` | `Angle` | `angles` |
| `hook.schema.json` | `Hook` | `hooks` |
| `script.schema.json` | `Script` | `scripts` |
| `analytics-entry.schema.json` | `AnalyticsEntry` | `analytics_entries` |
| `insight.schema.json` | `Insight` | `insights` |
| `swipe-hook.schema.json` | `SwipeHook` | `swipe_hooks` |
| `competitor-reel.schema.json` | `CompetitorReel` | `recon_content` |

### Core Tables

```sql
-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_workspace_id UUID REFERENCES workspaces(id),  -- NULL for top-level
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workspace Members
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Topics (from schemas/topic.schema.json)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    external_id TEXT,  -- e.g., "topic_20260304_001" (GVB format, for migration)
    title TEXT NOT NULL,
    description TEXT,
    source JSONB NOT NULL,  -- {platform, url, author, engagement_signals}
    discovered_at TIMESTAMPTZ NOT NULL,
    scoring JSONB NOT NULL,  -- {icp_relevance, timeliness, content_gap, proof_potential, total, weighted_total, ccn_fit}
    pillars TEXT[] DEFAULT '{}',
    competitor_coverage JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'developing', 'scripted', 'passed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Angles (from schemas/angle.schema.json)
CREATE TABLE angles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    topic_id UUID REFERENCES topics(id),
    external_id TEXT,
    format TEXT NOT NULL CHECK (format IN ('longform', 'shortform', 'linkedin')),
    title TEXT NOT NULL,
    contrast JSONB NOT NULL,  -- {common_belief, surprising_truth, contrast_strength}
    target_audience TEXT,
    pain_addressed TEXT,
    proof_method TEXT,
    funnel_direction JSONB,  -- {cta_type, cta_copy, monetization_tie}
    competitor_angles JSONB DEFAULT '[]',
    content_job TEXT CHECK (content_job IN ('build_trust', 'demonstrate_capability', 'drive_action')),
    blocker_destroyed TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scripted', 'passed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hooks (from schemas/hook.schema.json)
CREATE TABLE hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    angle_id UUID REFERENCES angles(id),
    external_id TEXT,
    platform TEXT NOT NULL,
    pattern TEXT NOT NULL CHECK (pattern IN (
        'contradiction', 'specificity', 'timeframe_tension',
        'pov_as_advice', 'vulnerable_confession', 'pattern_interrupt'
    )),
    hook_text TEXT NOT NULL,
    visual_cue TEXT,
    score JSONB NOT NULL,  -- {contrast_fit, pattern_strength, platform_fit, composite}
    cta_pairing TEXT,
    source TEXT DEFAULT 'original' CHECK (source IN ('original', 'swipe')),
    swipe_reference UUID REFERENCES swipe_hooks(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'used', 'winner', 'dud')),
    performance JSONB,  -- {ctr, retention_30s, engagement_rate, analyzed_at}
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scripts (from schemas/script.schema.json)
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    angle_id UUID REFERENCES angles(id),
    hook_ids UUID[] DEFAULT '{}',
    external_id TEXT,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    script_structure JSONB,  -- longform: {opening_hook, intro_framework, retention_hook, sections[], mid_cta, closing_cta, outro}
    filming_cards JSONB,  -- [{scene_number, section_name, shot_type, say[], show, duration_estimate, notes}]
    shortform_structure JSONB,  -- {beats[], caption, hashtags[], cta, estimated_duration}
    estimated_duration TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filming', 'published', 'analyzed')),
    performance JSONB,  -- {views, ctr, avg_view_duration, retention_30s, engagement_rate, analyzed_at}
    published_url TEXT,
    published_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics Entries (from schemas/analytics-entry.schema.json)
CREATE TABLE analytics_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    script_id UUID REFERENCES scripts(id),
    external_id TEXT,
    platform TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ NOT NULL,
    days_since_publish INTEGER,
    metrics JSONB NOT NULL,  -- {views, impressions, ctr, retention_30s, avg_view_duration, likes, comments, shares, saves, subscribers_gained, engagement_rate}
    thumbnail JSONB,  -- {url, text_overlay, emotion, style, ctr_performance}
    hook_pattern_used TEXT,
    topic_category TEXT,
    content_pillar TEXT,
    is_winner BOOLEAN DEFAULT false,
    winner_reason TEXT,
    winner_metrics JSONB,
    collection_method TEXT,
    source_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Swipe Hooks (from schemas/swipe-hook.schema.json)
-- MCL ships with ~50 curated seed hooks (is_system=true) across niches.
-- Every new workspace inherits seed hooks on creation.
-- After onboarding, a background recon job auto-populates niche-specific swipe hooks.
CREATE TABLE swipe_hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    hook_text TEXT NOT NULL,
    pattern TEXT NOT NULL,
    why_it_works TEXT NOT NULL,
    competitor TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    engagement JSONB NOT NULL,  -- {views, likes, comments, engagement_rate}
    competitor_angle TEXT,
    topic_keywords TEXT[] DEFAULT '{}',
    source_video_title TEXT,
    visual_hook JSONB,  -- {on_screen, text_overlays, visual_type, pattern_interrupt, pacing}
    used_count INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,  -- true = curated seed hook, false = user/recon generated
    notes TEXT DEFAULT '',
    saved_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform Connections
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    platform TEXT NOT NULL,
    connection_type TEXT NOT NULL,  -- 'oauth', 'api_key', 'token'
    credentials_encrypted BYTEA,  -- encrypted at rest
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_verified_at TIMESTAMPTZ,
    token_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, platform)
);

-- AI Usage Tracking
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    operation TEXT NOT NULL,  -- 'angle_generation', 'hook_generation', 'script_generation', etc.
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd DECIMAL(10, 6),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Brain Events (evolution log)
CREATE TABLE brain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    event_type TEXT NOT NULL,  -- 'onboard', 'evolve', 'manual_update'
    reason TEXT NOT NULL,
    changes JSONB NOT NULL,  -- [{field, old_value, new_value}]
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Background Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    job_type TEXT NOT NULL,  -- 'discover', 'analyze', 'brain_evolve'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress DECIMAL(3, 2) DEFAULT 0,
    result JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_topics_workspace ON topics(workspace_id);
CREATE INDEX idx_topics_status ON topics(workspace_id, status);
CREATE INDEX idx_topics_score ON topics(workspace_id, (scoring->>'weighted_total') DESC);
CREATE INDEX idx_angles_workspace ON angles(workspace_id);
CREATE INDEX idx_angles_topic ON angles(topic_id);
CREATE INDEX idx_hooks_workspace ON hooks(workspace_id);
CREATE INDEX idx_hooks_angle ON hooks(angle_id);
CREATE INDEX idx_scripts_workspace ON scripts(workspace_id);
CREATE INDEX idx_scripts_status ON scripts(workspace_id, status);
CREATE INDEX idx_analytics_workspace ON analytics_entries(workspace_id);
CREATE INDEX idx_analytics_script ON analytics_entries(script_id);
CREATE INDEX idx_analytics_winner ON analytics_entries(workspace_id, is_winner) WHERE is_winner = true;
CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX idx_jobs_status ON jobs(workspace_id, status);
CREATE INDEX idx_ai_usage_workspace ON ai_usage(workspace_id);
CREATE INDEX idx_brain_events_workspace ON brain_events(workspace_id);
```

### Supabase Storage

File storage (video downloads, PDF exports, thumbnails) uses Supabase Storage buckets:

| Bucket | Content | Access |
|--------|---------|--------|
| `scripts-pdf` | Generated PDF scripts | Private, per workspace |
| `recon-media` | Downloaded competitor videos/thumbnails | Private, per workspace |
| `exports` | Data exports (CSV, JSON) | Private, per workspace |

---

## 14. Authentication & Authorization

### Authentication Provider

Supabase Auth, supporting:
- Email/password signup + login
- Google OAuth (social login)
- GitHub OAuth (for developer users)
- Magic link (passwordless email)
- JWT tokens with refresh token rotation

### JWT Flow

```
1. User logs in via Supabase Auth (web or CLI)
2. Supabase returns access_token (JWT, 1hr TTL) + refresh_token (30d TTL)
3. Client includes access_token in all API requests: Authorization: Bearer <jwt>
4. FastAPI middleware verifies JWT signature + expiry via Supabase public key
5. User ID extracted from JWT claims
6. Workspace access verified via workspace_members table
7. RLS policies enforce data isolation at the database level
```

### CLI Authentication

```bash
mcl auth login
# Opens browser: app.microcelebritylabs.com/auth/cli
# User logs in via Supabase Auth
# Callback returns auth code to localhost
# CLI exchanges code for JWT
# JWT stored in ~/.mcl/auth.json (chmod 600)
```

### Authorization Middleware

```python
# FastAPI dependency
async def get_current_workspace(
    workspace_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceAccess:
    """Verify user has access to the workspace and return their role."""
    member = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .where(WorkspaceMember.user_id == user.id)
    )
    if not member:
        raise HTTPException(403, "No access to this workspace")
    return WorkspaceAccess(workspace=workspace, role=member.role)
```

### Permission Matrix

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| View workspace data | yes | yes | yes | yes |
| Create/edit content (topics, angles, scripts) | yes | yes | yes | no |
| Run discovery/analysis jobs | yes | yes | yes | no |
| Edit brain (user-managed sections) | yes | yes | no | no |
| Manage platform connections | yes | yes | no | no |
| Invite/remove members | yes | yes | no | no |
| Manage billing | yes | no | no | no |
| Delete workspace | yes | no | no | no |
| Create child workspaces | yes | yes | no | no |

---

## 15. Monetization & Billing

### Strategy: Learn First, Monetize Smart

MCL launches with a flexible tier structure backed by the `plans` table -- fully admin-configurable, database-driven. The exact tier boundaries and pricing are intentionally TBD -- PostHog analytics will reveal who the real buyer is and what they value most before pricing is locked.

### Admin-Configurable Plan Limits

Every billable limit lives in the `plans` table (see DESIGN.md Section 9.1). Admins can update limits at any time via `PATCH /admin/plans/{id}` -- changes take effect immediately for all workspaces on that plan. No code deploy needed.

The `plans` table stores:
- **AI limits**: `ai_calls_per_day`, `ai_tokens_per_month`, `ai_max_tokens_per_call`
- **Pipeline limits**: `discover_runs_per_day`, `max_competitors`, `max_workspaces`, `max_team_members`
- **Platform access**: `platforms_allowed` (TEXT array)
- **Feature flags**: `features` JSONB (extensible: `export_pdf`, `api_access`, `priority_jobs`, `default_model`, `analytics_history_days`, etc.)
- **Pricing**: `price_monthly_cents`, `price_yearly_cents`, `stripe_price_id_monthly`, `stripe_price_id_yearly`

Usage is tracked in the `workspace_usage` table (per workspace, per month) and enforced at the API layer via `check_ai_limit()` and `check_pipeline_limit()` functions that return HTTP 429 with actionable detail (limit type, current usage, reset time, upgrade URL).

Before changing plan limits, admins can preview impact via `GET /admin/plans/{id}/impact` to see how many workspaces/users would be affected.

### Preliminary Tier Structure

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| Pipeline stages | All 7 | All 7 | All 7 |
| Discovery jobs/day | 3 | 20 | Unlimited |
| AI calls/day (web) | 20 | 200 | Unlimited |
| AI tokens/month | 1M | 10M | Unlimited |
| Workspaces | 1 | 3 | 20 |
| Team members | 1 | 5 | 25 |
| Competitors monitored | 2 | 10 | 50 |
| Analytics history | 30 days | 1 year | Unlimited |
| Platforms | YT, IG | All | All |
| PDF export | -- | yes | yes |
| API access | -- | yes | yes |
| Priority job queue | -- | yes | yes |
| Custom CTA templates | -- | yes | yes |
| White-label | -- | -- | yes |
| Default AI model | claude-haiku-4-5 | claude-sonnet-4-6 | claude-sonnet-4-6 |
| Price | $0 | TBD | TBD |

### Billing Infrastructure

- **Provider:** Stripe (via Supabase billing integration or direct)
- **Model:** Monthly subscription with annual discount option
- **AI overage:** Metered billing for AI usage beyond tier limits (tracked in `ai_usage` table)
- **Webhook:** Stripe webhooks update `subscriptions` table in Supabase

### Revenue Signals to Watch (PostHog)

Before setting prices, MCL tracks:
1. Which pipeline stages are used most (discovery vs scripting vs analytics)
2. Time-to-value (how quickly users reach their first published script)
3. Feature engagement by persona (solopreneur vs agency vs power user)
4. AI usage patterns (which operations consume the most tokens)
5. Retention curves by tier boundary (do users hit the free limit and churn, or convert?)

---

## 16. Analytics & Instrumentation

### Product Analytics: PostHog

PostHog is the primary product analytics tool. Integrated into both web dashboard and API.

**Key Events Tracked:**

| Event | Properties | Purpose |
|-------|-----------|---------|
| `workspace_created` | `{type, source}` | Funnel: signup -> activated |
| `onboard_step_completed` | `{step, duration}` | Identify onboarding friction |
| `discovery_started` | `{mode, platform_count}` | Feature engagement |
| `discovery_completed` | `{topics_found, duration}` | Quality signal |
| `topic_approved` | `{score, pillar}` | What content resonates |
| `angle_generated` | `{format, contrast_strength}` | AI usage pattern |
| `hook_generated` | `{pattern, composite_score}` | Pattern preference |
| `script_generated` | `{format, duration_estimate}` | Production output |
| `script_published` | `{platform}` | Content shipped |
| `analytics_collected` | `{platform, content_count}` | Feedback loop engagement |
| `brain_evolved` | `{changes_count}` | System intelligence |
| `ai_call` | `{operation, tokens, model}` | Cost tracking |
| `feature_flag_hit` | `{flag, tier, allowed}` | Conversion signal |

**Key Funnels:**
1. Signup -> Onboard Complete -> First Discovery -> First Script -> First Publish
2. Publish -> Analytics Collected -> Brain Evolved -> Next Discovery (feedback loop completion)
3. Free Tier -> Feature Flag Hit -> Upgrade (conversion funnel)

**Cohort Analysis:**
- By persona type (solopreneur, operator, power user, agency)
- By primary platform (YouTube-first, Instagram-first, multi-platform)
- By CLI vs web usage
- By pipeline stage engagement depth

### Error Monitoring: Sentry

Sentry tracks exceptions across all services:
- **API:** FastAPI error handler reports to Sentry with request context
- **Background Jobs:** ARQ worker exceptions reported to Sentry
- **CLI:** opt-in error reporting (user must consent)
- **Web Dashboard:** React error boundaries report to Sentry

### Uptime Monitoring

- API health endpoint: `GET /health` (returns `{"status": "healthy" | "degraded" | "unhealthy", "checks": {...}, "version": "...", "timestamp": "..."}`, 200 or 503)
- Background job health: ARQ worker heartbeat monitoring
- External uptime check: BetterUptime or similar (alerts on downtime)

---

## 17. Non-functional Requirements

### Performance

| Operation | Target Latency | Strategy |
|-----------|---------------|----------|
| API CRUD operations | < 200ms | Postgres indexes, connection pooling |
| Brain read | < 100ms | Cached in Redis (invalidated on write) |
| Discovery job start | < 500ms | Job queued immediately, work is async |
| Hook generation (web) | < 10s | Direct Anthropic API call, streaming response |
| Script generation (web) | < 30s | Streaming response via WebSocket |
| Dashboard page load | < 2s | SPA with code splitting, API calls parallelized |
| WebSocket message delivery | < 100ms | Redis pub/sub |

### Scalability

| Dimension | v1 Target | Architecture |
|-----------|-----------|-------------|
| Concurrent users | 1,000 | Single FastAPI instance + ARQ workers |
| Workspaces | 10,000 | RLS-based, no per-tenant infrastructure |
| Topics per workspace | 50,000 | Postgres with proper indexing |
| Background jobs/hour | 500 | ARQ with 4 worker processes |
| WebSocket connections | 1,000 | FastAPI + Redis pub/sub |

Horizontal scaling path: Add FastAPI instances behind a load balancer, add ARQ workers, Supabase handles Postgres scaling.

### Security

| Requirement | Implementation |
|-------------|---------------|
| Data isolation | Supabase RLS with `workspace_id` on every table |
| Credential storage | Encrypted at rest in Supabase vault (not plain text) |
| API authentication | Supabase JWT, verified per request |
| HTTPS | Enforced on all endpoints (TLS 1.3) |
| API key rotation | Platform OAuth tokens refreshed automatically |
| Input validation | Pydantic models on all API inputs |
| SQL injection | Parameterized queries via SQLAlchemy / Supabase client |
| XSS prevention | React's built-in escaping + CSP headers |
| Rate limiting | Redis-based sliding window per user/workspace |
| Secrets management | Environment variables + Supabase vault (no secrets in code) |
| GDPR compliance | `GET /workspaces/{id}/export` returns ZIP of all workspace data. `DELETE /workspaces/{id}` soft deletes with 30-day grace period, then hard purge cascade. `POST /account/delete` deletes user account + all owned workspaces. Nightly purge job cleans expired workspaces. Privacy policy. |
| AI-generated content IP ownership | All content generated through MCL (scripts, hooks, angles, carousels, infographics) is owned by the user. MCL retains no intellectual property rights over user outputs. This must be explicitly stated in Terms of Service before launch. For agencies: content ownership follows the workspace -- agency-generated content for a creator workspace belongs to that workspace's owner (the creator), unless workspace access grants specify otherwise. |
| Terms of Service (TOS) | Must be drafted and published before launch. Required clauses: (1) AI content IP ownership (user owns all generated content), (2) Instagram scraping TOS acknowledgment for CLI users, (3) data processing agreement for GDPR. |

### Reliability

| Requirement | Target | Strategy |
|-------------|--------|----------|
| API uptime | 99.9% | Managed hosting (Railway/Fly.io), health checks, auto-restart |
| Data durability | 99.999% | Supabase managed Postgres with automated backups |
| Job completion | 99.5% | ARQ retry with exponential backoff, dead letter queue |
| Zero data loss | Critical | Database transactions for all write operations |

### Observability

| Layer | Tool | What's Tracked |
|-------|------|---------------|
| Application errors | Sentry | Exceptions, stack traces, request context |
| Product analytics | PostHog | User events, funnels, cohorts |
| API metrics | FastAPI middleware | Request count, latency, status codes |
| Background jobs | ARQ dashboard | Job queued/running/completed/failed |
| Database | Supabase dashboard | Query performance, connection count |
| Uptime | BetterUptime | Endpoint availability, response time |

### Language Support

v1 is **English-only**. This applies to:

- **UI:** All dashboard text, labels, help text, and error messages are in English.
- **Content generation:** AI prompts, hook patterns (contradiction, specificity, timeframe tension, POV-as-advice, vulnerable confession, pattern interrupt), and contrast formula templates are all tuned and tested for English-language content creation.
- **Research/Discovery:** The `last30days` research skill, Brave Search queries, Reddit/X analysis, and competitor scraping all assume English-language sources and outputs.

Non-English content creation (localized AI prompts, translated hook patterns, cross-cultural contrast formula adaptations, multi-language UI) is deferred to v2 (see V2 Roadmap, item 12: Internationalization).

---

## 18. Success Metrics & KPIs

### North Star Metric

**Completed Content Cycles per active workspace per month** -- a completed cycle means the user went from Discovery -> Script -> Publish -> Analyze at least once. This measures the full feedback loop, not just feature usage.

### Activation Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| Onboarding completion rate | > 70% | Users who complete all 9 brain sections within 7 days of signup |
| Time to first discovery | < 24 hours | Time from signup to first `discovery_completed` event |
| Time to first script | < 72 hours | Time from signup to first `script_generated` event |
| Day 7 retention | > 40% | % of users who return within 7 days of signup |

### Engagement Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| Weekly active workspaces | Growing 15% MoM | Workspaces with at least 1 pipeline action per week |
| Feedback loop completion rate | > 30% | % of published scripts that get analytics collected + brain evolution |
| Average pipeline depth | > 3 stages | Average number of pipeline stages used per content piece |
| CLI vs web split | Track only | Ratio of CLI to web usage (informs product investment) |

### Business Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| Free-to-paid conversion | > 5% | % of free users who upgrade to paid within 60 days |
| Monthly recurring revenue (MRR) | Track growth | Total monthly subscription revenue |
| AI cost per workspace | < $5/month | Average Anthropic API cost per active workspace |
| Net promoter score (NPS) | > 50 | Quarterly survey |
| Churn rate | < 5% monthly | % of paid subscribers who cancel |

### Content Quality Metrics (MCL's unique advantage)

| Metric | Target | Definition |
|--------|--------|-----------|
| Brain evolution cycles | > 2/month per active workspace | Number of brain update cycles completed |
| Hook pattern diversity | > 3 patterns used | Average distinct hook patterns used per workspace |
| Contrast strength distribution | > 50% moderate/strong | % of generated angles with moderate or strong contrast |
| Winner identification rate | > 20% | % of analyzed content flagged as winners |

---

## 19. Competitive Landscape

### Competitor Analysis

| Competitor | What They Do | MCL Differentiator |
|---|---|---|
| **Taplio** | LinkedIn viral post search + scheduling | MCL is multi-platform + full pipeline (not just discovery). MCL generates scripts, evolves a brain, and tracks performance across YouTube, Instagram, and LinkedIn. |
| **VidIQ / TubeBuddy** | YouTube SEO + thumbnail testing | MCL adds script generation, hook pattern engine (HookGenie), brain evolution from performance data, and competitor skeleton ripping. VidIQ/TubeBuddy optimize existing content; MCL creates it. |
| **Castmagic** | Podcast/video -> content repurposing | MCL starts from strategy (ICP, pillars, Contrast Formula), not from existing content. Castmagic is post-production; MCL is pre-production. |
| **Lately.ai** | AI content generation from long-form | MCL has competitor intelligence (skeleton ripper), a feedback loop (analyze -> brain evolves -> better discovery), and the Contrast Formula for angle development. Lately generates content in isolation. |
| **ContentStudio** | Multi-platform scheduling + analytics | MCL has the evolving AI brain that learns from YOUR performance data, the Contrast Formula for differentiated angles, and HookGenie scoring. ContentStudio is a scheduling tool with basic analytics. |

### MCL's Moat

The combination of four systems creates MCL's defensible moat -- no competitor combines all four into a single feedback loop:

1. **Evolving Brain** -- Persistent AI memory that learns from performance data and gets smarter over time. Not a static prompt or template.
2. **Contrast Formula** -- Structured angle development framework (Common Belief -> Surprising Truth) that consistently produces differentiated content.
3. **HookGenie Scoring** -- 6-pattern hook engine with composite scoring (contrast_fit, pattern_strength, platform_fit) informed by brain preferences and swipe hooks.
4. **Competitor Skeleton Ripping** -- LLM-powered reverse engineering of competitor content structures, hooks, and patterns.

### Positioning

> "The only content intelligence platform that learns from YOUR performance data and reverse-engineers competitor strategies -- not just another AI content generator."

MCL competes on intelligence depth, not feature breadth. While competitors offer broader surface-level features (scheduling, thumbnail testing, post templates), MCL offers a deeper, self-improving pipeline that gets measurably better at generating content the more a creator uses it.

---

## 20. Risks & Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| YouTube API quota exhaustion | Medium | Medium | BYOK model for free tier (each user's key has its own 10K/day ceiling). Paid tier uses MCL-managed keys with per-call metering. Rate limiting per-key, not per-platform. Intelligent caching of competitor data reduces redundant API calls. |
| Instagram scraping breaks (instaloader) | High | Medium | **Split model:** Web dashboard uses Apify API (MCL never scrapes directly; Apify accepts TOS liability). CLI users run instaloader locally with their own session and must acknowledge TOS (`tos_accepted_at` in workspace settings). Graph API as primary for analytics. Instaloader version monitoring preserved for CLI mode. This split eliminates server-side TOS violation risk. |
| Anthropic API rate limits | Medium | High | Request queuing, retry with backoff (ported from `recon/utils/retry.py`), response caching (ported from `recon/skeleton_ripper/cache.py`), OpenAI fallback |
| Supabase RLS performance | Low | High | Index all `workspace_id` foreign keys, test with 10K+ workspaces, use `auth.uid()` in policies |
| WebSocket scaling | Medium | Medium | Redis pub/sub backend, sticky sessions if needed |
| GVB code port introduces bugs | Medium | Medium | Comprehensive test suite mirroring GVB behavior, schema validation at every stage |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CLI users don't need web dashboard | Medium | High | Ship CLI first, validate demand for web independently. Both clients share the same API. |
| AI costs exceed revenue per user | Medium | High | Track `ai_usage` per workspace, set tier limits, optimize prompts for token efficiency |
| Users don't complete the feedback loop | High | Critical | Automated analytics collection (reduce friction), email reminders (Resend), in-app nudges |
| Agency use case premature | Medium | Medium | B2B features gated behind feature flags, focus on B2C first, validate with design partners |
| Platform API changes break channels | High | Medium | Channel plugin architecture isolates changes, automated integration tests per channel |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pricing too high/low | High | High | Launch free tier first, learn from PostHog data, iterate pricing quarterly |
| Competitor launches similar SaaS | Medium | Medium | Speed to market (GVB head start), depth of feedback loop (hard to replicate), Claude Code community distribution |
| Creator market saturation | Low | Medium | Focus on "creator-to-founder" niche (not generic creators), monetization integration differentiates |

---

## 21. Out of Scope (v1)

The following are explicitly excluded from v1.0 and slated for consideration in future versions:

| Feature | Reason | Planned For |
|---------|--------|-------------|
| **Direct publishing** (auto-post to YouTube/Instagram) | Requires complex OAuth scopes, risk of account bans. Users publish manually and link the URL in MCL. Available in paid CLI tier as early access (see Section 11, CLI Value Proposition). | v1.5 (web), v1.0 paid (CLI) |
| **Video editing / generation** | Out of MCL's core competency for v1. MCL produces scripts and filming cards. Remotion integration planned for v2/v3 (see Future Integrations). | v2/v3 (via Remotion) |
| **TikTok channel** | TikTok API access is restricted and unstable. Shortform scripts work on TikTok but publishing/analytics are manual. Discovery available in paid CLI tier. | v1.2 (web analytics), v1.0 paid (CLI discovery) |
| **LinkedIn channel** | LinkedIn API is heavily restricted. Requires Apify or similar. Discovery available in paid CLI tier. | v1.5 (web), v1.0 paid (CLI discovery) |
| **X/Twitter channel** | API pricing is prohibitive. Research only (not analytics). Discovery available in paid CLI tier. | v1.5 (web), v1.0 paid (CLI discovery) |
| **Mobile app** | Web dashboard is mobile-responsive. Native app not justified at launch. | v2.0+ |
| **White-label** | Agency feature. Requires significant frontend customization infrastructure. | v2.0 |
| **Cross-workspace benchmarks** | Requires anonymized data aggregation and privacy considerations. | v1.5 |
| **MCP server** | Requires MCP ecosystem maturity and validated demand from AI tool users. | v1.5 |
| **AI-generated thumbnails** | Adjacent feature, not core pipeline. Could integrate with external thumbnail tools. | v2.0+ |
| **Content calendar / scheduling** | Complementary feature. v1 users manage scheduling externally. | v1.5 |
| **Collaboration / commenting** | Agency feature. Team comments on scripts, angles. Basic workspace sharing available in paid CLI tier (see Section 11). | v1.5 (web), v1.0 paid (CLI workspace sharing) |
| **Custom AI model fine-tuning** | Per-creator fine-tuned models for better voice matching. Requires significant data + cost. | v2.0+ |
| **Webhook notifications** | Outbound webhooks for integrations (Zapier, Make). | v1.5 |
| **Data import from other tools** | Migration from VidIQ, TubeBuddy, etc. | v1.5 |

---

## Future Integrations

The following integrations are planned for Phase 2/3 of the MCL roadmap:

### 1. Zernio -- Social Media Publishing & Engagement Management

**What it does:** Social media posting to multiple platforms, comment management, and DM management.

**MCL Impact:**
- Powers the "publish" stage of the pipeline, replacing manual posting
- Enables direct posting from both the web dashboard and CLI (`mcl publish <script_id> --platform=youtube`)
- Comment and DM management provides engagement data that feeds back into the analytics/brain evolution loop
- Eliminates the manual "paste URL" step -- publishing through Zernio auto-links the platform content ID to the script record

**Planned for:** Phase 2 (post-beta)

### 2. Remotion -- React-Based Video & Visual Content Generation

**What it does:** React-based programmatic video editing, carousel creation, and infographic design.

**MCL Impact:**
- Powers video generation from script data (automated YouTube shorts, Instagram Reels)
- Enables carousel creation from script sections and key points (Instagram carousels, LinkedIn slides)
- Generates infographics from topic/angle data (Pinterest, LinkedIn)
- CLI users can generate visual content programmatically: `mcl design <script_id> --carousel`
- Can create YouTube thumbnails from script metadata (title, hook pattern, key visual cue)
- The carousel/infographic generation capability in the CLI value proposition section is powered by Remotion

**Planned for:** Phase 2 (carousel/infographic), Phase 3 (video generation)

---

## V2 Roadmap -- Deferred Features

The following features are explicitly deferred from v1. This is the comprehensive list of planned future work, with each item's description and reason for deferral. See also Section 21 (Out of Scope) for the v1 exclusion rationale.

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

12. **Internationalization (i18n)** -- Multi-language UI. Non-English content generation with localized AI prompts, hook patterns, and contrast formula adaptations. *Deferred because:* v1 is English-only (see Section 17, Language Support); localization requires translating all UI strings, re-tuning AI prompts per language, and validating hook patterns cross-culturally.

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

## Appendix A: GVB File Reference

Complete mapping of GVB files to MCL components for developers porting the codebase.

### Commands (`.claude/commands/`)

| File | Lines | MCL Destination | Port Priority |
|------|-------|-----------------|---------------|
| `viral-setup.md` | ~730 | `mcl_pipeline/setup/`, API OAuth flows | P1 |
| `viral-onboard.md` | ~270 | `mcl_pipeline/onboard/`, web wizard | P1 |
| `viral-discover.md` | ~500+ | `mcl_pipeline/discover/`, background jobs | P1 |
| `viral-angle.md` | ~520 | `mcl_pipeline/angle/`, prompt templates | P1 |
| `viral-script.md` | ~500+ | `mcl_pipeline/script/`, prompt templates | P1 |
| `viral-analyze.md` | ~500+ | `mcl_pipeline/analyze/`, background jobs | P1 |
| `viral-update-brain.md` | ~200+ | `mcl_pipeline/brain/`, evolution engine | P1 |

### Python Modules (`recon/`)

| File | MCL Destination | Changes Needed |
|------|-----------------|---------------|
| `recon/config.py` | `mcl_pipeline/config.py` | Read from Supabase instead of local JSON files |
| `recon/bridge.py` | `mcl_pipeline/discover/bridge.py` | Replace file I/O with DB writes |
| `recon/scraper/youtube.py` | `mcl_pipeline/channels/youtube.py` | Implement `DiscoverChannel` + `AnalyzeChannel` interfaces |
| `recon/scraper/instagram.py` | `mcl_pipeline/channels/instagram.py` | Implement `DiscoverChannel` + `AnalyzeChannel` interfaces |
| `recon/scraper/downloader.py` | `mcl_pipeline/channels/shared/downloader.py` | Add Supabase Storage uploads |
| `recon/skeleton_ripper/pipeline.py` | `mcl_pipeline/discover/skeleton_pipeline.py` | Async, DB storage |
| `recon/skeleton_ripper/extractor.py` | `mcl_pipeline/discover/extractor.py` | Minimal changes |
| `recon/skeleton_ripper/llm_client.py` | `mcl_pipeline/ai/llm_client.py` | Add Anthropic primary, keep OpenAI fallback |
| `recon/skeleton_ripper/prompts.py` | `mcl_pipeline/ai/prompts/extraction.py` | Minimal changes |
| `recon/skeleton_ripper/synthesizer.py` | `mcl_pipeline/discover/synthesizer.py` | Minimal changes |
| `recon/skeleton_ripper/cache.py` | `mcl_pipeline/ai/cache.py` | Redis-based instead of file-based |
| `recon/skeleton_ripper/aggregator.py` | `mcl_pipeline/discover/aggregator.py` | Minimal changes |
| `recon/storage/models.py` | `mcl_pipeline/models/` (Pydantic) | JSON Schema -> Pydantic v2 |
| `recon/storage/database.py` | `mcl_pipeline/db/` | SQLite -> Supabase Postgres |
| `recon/utils/logger.py` | `mcl_pipeline/utils/logger.py` | Add structured logging, Sentry integration |
| `recon/utils/retry.py` | `mcl_pipeline/utils/retry.py` | Minimal changes |
| `recon/utils/state_manager.py` | `mcl_pipeline/utils/state.py` | Redis-based state instead of file-based |
| `recon/web/` | Not ported | Replaced entirely by React dashboard |

### Scoring (`scoring/`)

| File | MCL Destination | Changes Needed |
|------|-----------------|---------------|
| `scoring/engine.py` | `mcl_pipeline/scoring/engine.py` | Read brain from DB instead of file. Core logic unchanged. |
| `scoring/rescore.py` | `mcl_pipeline/scoring/rescore.py` | Batch rescore via DB queries |

### Schemas (`schemas/`)

| File | MCL Destination | Changes Needed |
|------|-----------------|---------------|
| `schemas/agent-brain.schema.json` | `mcl_pipeline/models/brain.py` | Split into multiple Pydantic models |
| `schemas/topic.schema.json` | `mcl_pipeline/models/topic.py` | Direct Pydantic translation |
| `schemas/angle.schema.json` | `mcl_pipeline/models/angle.py` | Direct Pydantic translation |
| `schemas/hook.schema.json` | `mcl_pipeline/models/hook.py` | Direct Pydantic translation |
| `schemas/script.schema.json` | `mcl_pipeline/models/script.py` | Direct Pydantic translation |
| `schemas/analytics-entry.schema.json` | `mcl_pipeline/models/analytics.py` | Direct Pydantic translation |
| `schemas/insight.schema.json` | `mcl_pipeline/models/insight.py` | Direct Pydantic translation |
| `schemas/swipe-hook.schema.json` | `mcl_pipeline/models/swipe_hook.py` | Direct Pydantic translation |
| `schemas/competitor-reel.schema.json` | `mcl_pipeline/models/competitor_reel.py` | Direct Pydantic translation |

### Skills (`skills/last30days/`)

| Directory | MCL Destination | Changes Needed |
|-----------|-----------------|---------------|
| `skills/last30days/` | `mcl_pipeline/channels/reddit.py` | Wrap as `RedditChannel` implementing `DiscoverChannel` |

### Data Files (`data/`)

| File | MCL Destination | Changes Needed |
|------|-----------------|---------------|
| `data/cta-templates.json` | `cta_templates` table (seed data) | Loaded via database migration |
| `data/agent-brain.json` | `brain_*` tables | Split across normalized tables |

---

## Appendix B: Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Pipeline Core | Python 3.11+ (`mcl-pipeline`) | Business logic, scoring, data models |
| API | FastAPI | HTTP/WebSocket, auth, routing |
| Frontend | Vite + React + TypeScript | SPA dashboard |
| UI Components | shadcn/ui | Design system |
| Database | Supabase (Postgres) | Data storage, auth, RLS, realtime |
| Cache / Queue | Redis | API caching, job queue, rate limiting |
| Background Jobs | ARQ | Async pipeline execution |
| CLI | Python (`mcl`) | Terminal interface |
| AI (primary) | Anthropic Claude API | Content generation (web users) |
| AI (fallback) | OpenAI GPT-4o | Fallback for Anthropic outages |
| Auth | Supabase Auth | JWT, OAuth, magic links |
| Monitoring | Sentry | Error tracking |
| Analytics | PostHog | Product analytics, feature flags |
| Email | Resend | Transactional email |
| Payments | Stripe | Subscriptions, metered billing |
| Marketing Site | Framer / Webflow | `microcelebritylabs.com` |
| Hosting (API) | Railway / Fly.io | Managed containers |
| Hosting (Frontend) | Vercel | SPA hosting + CDN |

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Agent Brain** | Central persistent memory for a workspace. Contains identity, ICP, pillars, competitors, performance patterns, and learned preferences. Evolves over time. |
| **Contrast Formula** | Content angle framework: Common Belief (A) -> Surprising Truth (B). The bigger the gap, the stronger the angle. |
| **HookGenie** | Hook generation engine using 6 proven patterns: contradiction, specificity, timeframe tension, POV-as-advice, vulnerable confession, pattern interrupt. |
| **CCN Fit** | Core/Casual/New audience fit test. Topics must appeal to 2 of 3 audience segments to be saved. |
| **Skeleton Ripper** | LLM-powered system that analyzes competitor video transcripts to extract hook techniques, value structures, and content patterns. |
| **Content Job** | Each content pillar has a primary job: build trust, demonstrate capability, or drive action (Sam Gaudet's framework). |
| **Audience Blocker** | A false belief the audience holds that content exists to destroy. Maps to content pillars. |
| **Learning Weights** | Four scoring multipliers (icp_relevance, timeliness, content_gap, proof_potential) that evolve based on performance data, changing how topics are scored over time. |
| **Filming Card** | Scene-by-scene production reference for longform content: shot type, talking points, visual direction, duration estimate. |
| **Beat** | Timed action unit in shortform scripts: timestamp window, action, visual, text overlay, audio note. |
| **Swipe Hook** | A competitor hook saved as inspiration reference. Used to inform (not copy) hook generation. |
| **Channel Plugin** | Platform implementation conforming to DiscoverChannel, PublishChannel, and/or AnalyzeChannel interfaces. |
| **Workspace** | Tenant unit in MCL. Contains one brain, all pipeline data, and team members. |
| **BYOK** | Bring Your Own Key. Users supply their own platform API keys (e.g., YouTube Data API key) rather than sharing a MCL-managed key. |

---

## Revision History

| Date | Changes | Resolution |
|------|---------|-----------|
| 2026-03-24 | Initial draft | -- |
| 2026-03-24 | **Section 5.3 (Topic Discovery)**: Replaced "10,000 units/day shared across all workspaces" with BYOK model (free tier) + MCL-managed keys (paid tier). Per-key rate limiting. **Section 10 (Error Format)**: Updated quota error message to reflect BYOK. **Section 19 (Risks)**: Updated YouTube quota risk mitigation to reflect BYOK architecture. | Resolution 2: YouTube API -- BYOK + Paid Fallback |
| 2026-03-24 | **Section 11 (CLI Integration)**: Added "CLI Value Proposition (Paid Tier)" subsection. Documents 6 paid CLI features: additional platform access (LinkedIn, TikTok, Reddit, HN, X), direct posting, carousel/infographic generation, cloud brain sync, team/workspace collaboration, cross-device state. | Resolution 3: CLI Paid Value Proposition |
| 2026-03-24 | **Section 19 (Risks)**: Updated Instagram scraping risk with split model (Apify for web, instaloader for CLI with TOS acknowledgment). | Resolution 10: Instagram Scraping Split Model |
| 2026-03-24 | **Section 9 (Multi-tenancy)**: Added creator-controlled agency permissions model with granular boolean flags, `workspace_access_grants` table, `user_has_parent_access()` function. | Resolution 11: Creator-Controlled Agency Permissions |
| 2026-03-24 | **Section 5.2 (Onboarding)**: Replaced 9-step wizard with hybrid model -- quick form (~2 min) for minimum viable brain + optional AI coaching chat for depth. Defined minimum viable brain fields and defaults. **Section 7.1**: Updated onboarding user flow. | Resolution 12: Onboarding UX Hybrid Model |
| 2026-03-24 | **Section 5.0**: New section -- Dashboard Home Screen. Pipeline status board as first screen after login with brain health, pipeline funnel, top performer, activity feed, quick actions. | Resolution 13: Dashboard Home Screen |
| 2026-03-24 | **Section 11**: Removed offline mode (`mcl --offline`, `mcl sync`) from v1 scope. CLI requires internet. Added "Future: v2 Offline Mode" section noting server-wins sync with conflict flagging for v2. Updated CLI Value Proposition table. | Resolution 17: Offline Mode -- v1 Online Only, v2 Server-Wins Sync |
| 2026-03-24 | **Section 10 (API)**: Added `GET /workspaces/{id}/export`, `POST /account/delete`. Updated `DELETE /workspaces/{id}` to soft delete with 30-day grace. **Section 17**: Expanded GDPR compliance details with export, cascade deletion, and nightly purge. | Resolution 18: GDPR Export/Deletion |
| 2026-03-24 | **Section 5.5 (Hooks)**: MCL ships with ~50 curated seed hooks (`is_system: true`). Post-onboarding recon auto-populates niche hooks. **Section 13 (Data Model)**: Added `is_system` column to `swipe_hooks` table. | Resolution 19: Swipe Hooks -- Seed Library + Auto Recon |
| 2026-03-24 | **Section 5.3, 5.6, 5.7, 10**: Added full request body schemas for `POST /discover` (DiscoverRequest), `POST /analyze` (AnalyzeRequest), `POST /brain/evolve` (EvolveRequest). | Resolution 20: Discover Request Schema |
| 2026-03-24 | **Section 7.3, 7.4, 10, 11**: Added `PATCH /scripts/{id}/publish` with PublishRequest. `mcl publish --script <id> --url <url>` CLI command. Dashboard "I Published This" button. On publish: status->published, analytics at 48h, weekly for 90 days. Pipeline diagram updated from POST to PUBLISH (manual). | Resolution 21: Mark as Published Flow |
| 2026-03-24 | **Section 20 (Out of Scope)**: Updated video editing to reference Remotion for v2/v3. **New section**: Future Integrations -- Zernio (social posting, comment/DM management) and Remotion (video/carousel/infographic generation). | Resolution 24: Future Integrations -- Zernio + Remotion |
| 2026-03-24 | **Section 15 (Monetization)**: Replaced hardcoded `FEATURE_FLAGS` dict with admin-configurable `plans` table. Plan limits, pricing, and feature flags are database-driven; admin changes via `PATCH /admin/plans/{id}` take effect immediately with no code deploy. Added `workspace_usage` table for consumption tracking, `check_ai_limit()`/`check_pipeline_limit()` enforcement returning 429, and `GET /admin/plans/{id}/impact` preview endpoint. Updated tier table with AI tokens/month, platforms, and default AI model columns. | Resolution 24: Admin-Configurable Plan Limits |
| 2026-03-24 | **Section 5.5 (Script Generation)**: Replaced flat hook/script UI description with 4-step Script Wizard (Format Selection, Angle Selection, Hook Generation, Script Generation). Each step detailed with interactions (cards, badges, regenerate, combine). **Section 7.3**: Updated web content creation flow to include wizard steps and long-running job UX. **Section 7.4**: Updated CLI content creation flow with interactive wizard, background job support, and non-interactive mode. **Section 11**: Added `mcl script` interactive flow, non-interactive flags (`--format`, `--angle`, `--hook auto`, `--output`, `--no-prompt`), and `mcl jobs list/status/cancel` commands. | Resolution 29: Script Generation UX -- Web + CLI |
| 2026-03-24 | **Section 10 (WebSocket Endpoints)**: New subsection "Long-Running Job UX (Web Dashboard)" -- toast on start, global nav bar job indicator, slide-out job detail drawer with WebSocket progress, background operation, browser notification on completion. **Section 11**: New subsection "Long-Running Job UX (CLI)" -- foreground mode with `[q]` to background, `--background` flag, `mcl jobs list/status/cancel`, desktop notifications, `--no-prompt` for automation. | Resolution 30: Long-Running Job UX -- Web + CLI |
| 2026-03-24 | **New Section 19 (Competitive Landscape)**: Added competitor analysis table (Taplio, VidIQ/TubeBuddy, Castmagic, Lately.ai, ContentStudio) with MCL differentiators. Defined MCL's moat (evolving brain + Contrast Formula + HookGenie scoring + skeleton ripping). Positioning statement. Existing Section 19 (Risks) renumbered to Section 20. | Resolution 31: Competitive Landscape |
| 2026-03-24 | **Section 17 (Security)**: Added AI-generated content IP ownership (user owns all outputs, MCL retains no IP rights) and Terms of Service requirement with required clauses. Agency content ownership follows workspace. | Resolution 32: User Owns All AI-Generated Content IP |
| 2026-03-24 | **Section 17 (Non-functional Requirements)**: New subsection "Language Support" -- v1 is English-only for UI, content generation, AI prompts, hook patterns, and contrast formula. Non-English content creation deferred to V2 Roadmap item 12. | Resolution 37: English Only v1 |
| 2026-03-24 | **Section 5.3 (Topic Discovery)**: Merged separate Recon page into Discovery page. Discovery now has two tabs: "Discover Topics" (keyword search + results) and "Competitor Intel" (competitor scraping, skeleton ripper, swipe hooks). Matches GVB's `/viral:discover` which handles both in one command. | Fix 58: Merge Recon and Discovery Pages |
| 2026-03-24 | **New section**: V2 Roadmap -- Deferred Features. 19 items across 4 milestone groups (V2.0 Platform Expansion & Publishing, V2.1 Offline & Sync, V2.2 Accessibility & i18n, V2.3 Advanced Analytics, V2.4 Enterprise). Each item includes description and deferral rationale. Updated Table of Contents. | V2 Roadmap |
| 2026-03-24 | Final consistency fixes -- 17 issues resolved from post-resolution review. Added `/api/v1/` prefix to Section 10 endpoint summary, standardized WebSocket paths to `/ws/pipeline/{job_id}` and `/ws/chat`, verified pipeline diagram uses 5-stage DISCOVER -> ANGLE -> SCRIPT -> PUBLISH -> ANALYZE. | Post-Resolution Review Fixes 1-17 |
