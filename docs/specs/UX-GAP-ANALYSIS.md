# MCL UI/UX Gap Analysis Report

**Version:** 1.0.0
**Date:** 2026-03-24
**Author:** Senior Product Design Review
**Scope:** PRD v1.0.0, DESIGN v0.1.0, IMPLEMENTATION-PLAN v1.0.0, GVB Commands (onboard, discover, script, analyze)

---

## Methodology

This report cross-references every user-facing interaction described in the GVB CLI commands against the MCL spec documents (PRD, DESIGN, IMPLEMENTATION-PLAN) to identify UI/UX logic that is undefined, underspecified, or contradictory. Each gap is assigned a severity based on its impact on implementation and user experience.

**Severity Definitions:**
- **Critical**: Blocks implementation or creates a broken user experience. Must be resolved before development begins.
- **High**: Creates significant UX confusion or requires major design decisions during development. Should be resolved before the relevant phase.
- **Medium**: Creates suboptimal UX but has reasonable fallback assumptions. Should be resolved before launch.
- **Low**: Polish item or future consideration. Can be deferred post-launch.

---

## Gap Summary

| Severity | Count |
|----------|-------|
| Critical | 8 |
| High | 14 |
| Medium | 16 |
| Low | 9 |
| **Total** | **47** |

---

## 1. Onboarding Flow Gaps

### GAP-001: Onboarding Interaction Model Undefined
- **Severity:** Critical
- **Category:** Onboarding
- **Description:** GVB onboarding is a conversational AI coaching session where Claude asks questions one-by-one, probes for depth ("Can you give me 2-3 more examples?"), and synthesizes free-text answers into structured fields. The PRD says "Multi-step form wizard with save-per-section" (Section 5.2) but also mentions "AI-assisted field suggestions." These are fundamentally different UX paradigms. A form wizard requires predefined input fields; a conversational flow is open-ended. The docs never specify which model to use or how to reconcile them.
- **Impact:** Front-end team cannot begin building the onboarding without this decision. Wrong choice leads to a complete rebuild.
- **Recommended Fix:** Define a hybrid model: structured form wizard as the primary path (9 steps, each a card with specific input fields), with an optional "AI Coach" toggle that opens a chat sidebar for each section. The chat can suggest values that auto-populate form fields. Specify exact form fields per step, field types (text, multi-select, tag input), and which fields support AI suggestions.

### GAP-002: Minimum Viable Onboarding Not Defined
- **Severity:** Critical
- **Category:** Onboarding
- **Description:** GVB collects 9 sections with ~30+ individual fields during onboarding. The PRD says "Each step saves independently (user can leave and resume)" but never defines which sections are required to unlock the dashboard vs. which can be deferred. Can a user skip Section 7 (Monetization) and still run discovery? Can they skip Section 5 (Competitors) and still get scored topics?
- **Impact:** Without a minimum-viable-brain definition, the dashboard either blocks users behind a 10-minute onboarding wall (killing activation) or allows access with incomplete data (breaking scoring and hook generation).
- **Recommended Fix:** Define three tiers: (1) **Required to unlock dashboard**: Identity (name, brand, niche) + at least 1 content pillar + at least 1 posting platform. (2) **Required for discovery**: At least 1 ICP segment + pillar keywords OR at least 1 competitor. (3) **Required for scripting**: Monetization CTA strategy. Show a "Brain Health" progress bar that nudges users to complete remaining sections. Each pipeline stage should check prerequisites and show a targeted prompt (e.g., "Add competitors to unlock competitor discovery").

### GAP-003: Pre-Onboarding Empty State Undefined
- **Severity:** High
- **Category:** Onboarding
- **Description:** The user flow (PRD Section 7.1) goes: signup -> onboarding wizard launches. But what if the user closes the wizard? What does the dashboard look like with an empty brain? Can they browse the product? The PRD mentions "Dashboard unlocks with brain overview" only after step 9. No empty state is designed.
- **Impact:** Users who bounce during onboarding see a broken or blank dashboard on return, increasing churn.
- **Recommended Fix:** Design an empty-state dashboard that shows: (1) prominent "Complete your setup" CTA with progress indicator, (2) a product tour or demo data view showing what the dashboard looks like when populated, (3) locked pipeline stages with clear labels ("Complete onboarding to unlock Discovery"). Allow read-only exploration of sample data to demonstrate value before requiring full setup.

### GAP-004: AI-Assisted Onboarding Specifics Missing
- **Severity:** Medium
- **Category:** Onboarding
- **Description:** PRD Section 5.2 mentions "AI-assisted field suggestions (e.g., 'Based on your niche, common pain points include...')" but provides no detail on: which fields get AI suggestions, when suggestions trigger (on field focus? after identity is filled?), how suggestions are displayed (dropdown? inline chips?), or what happens if the AI suggestion is wrong.
- **Impact:** AI assistance is the web's key advantage over CLI onboarding. Without specification, it either gets cut for v1 or implemented inconsistently.
- **Recommended Fix:** Specify AI suggestion triggers: after Identity section is complete, subsequent sections show a "Suggest with AI" button that generates contextual recommendations. Display as dismissible chip suggestions above each field. AI calls are metered (count toward the workspace's AI usage). Provide a clear "AI generated this" indicator and allow one-click acceptance or manual override.

### GAP-005: Onboarding Section Order and Skip Logic
- **Severity:** Medium
- **Category:** Onboarding
- **Description:** GVB walks through 9 sections in a fixed order with conversational flow. The web wizard shows "9-step flow with progress indicator" but doesn't specify whether steps can be completed out of order, whether users can skip back and forth, or what happens when a section depends on data from a prior section (e.g., Content Jobs in Section 9 references pillars from Section 3).
- **Impact:** Non-linear navigation in a wizard with data dependencies can lead to broken states.
- **Recommended Fix:** Enforce linear progression for first-time onboard (steps 1-9 in order), but allow jumping back to any completed step. Sections 8 (Audience Blockers) and 9 (Content Jobs) require Section 3 (Pillars) data and should show a dependency notice if accessed out of order during an update flow. On re-onboarding, allow direct section access since pillars already exist.

---

## 2. Dashboard Information Architecture Gaps

### GAP-006: Main Dashboard Content Undefined
- **Severity:** Critical
- **Category:** Dashboard IA
- **Description:** The IMPLEMENTATION-PLAN lists `Dashboard.tsx` with the comment "Overview: brain summary + recent activity" but never specifies what "recent activity" means, what widgets/cards are shown, or what the primary CTA is. The PRD mentions a "brain overview dashboard" in Section 5.2 and "Discover your first topics" CTA in Section 7.1, but no wireframe or component specification exists. Every other page (Discovery, Analytics, etc.) has more detail than the page users see first.
- **Impact:** The dashboard is the first thing users see after onboarding. Without a spec, developers will either build a placeholder or make ad-hoc decisions that don't align with the product vision.
- **Recommended Fix:** Define the dashboard as four zones: (1) **Brain Health Summary** -- card showing completeness percentage, last updated, key stats (total content analyzed, avg CTR). (2) **Pipeline Status** -- visual flow diagram (DISCOVER -> ANGLE -> SCRIPT -> POST -> ANALYZE) with counts at each stage (e.g., "12 topics | 5 angles | 2 scripts | 1 published"). (3) **Recent Activity Feed** -- chronological list of recent actions (topics discovered, scripts created, analytics collected, brain evolved). (4) **Quick Actions** -- "Discover Topics", "Write Script", "Collect Analytics" buttons. Also include a "Wins" highlight if any content has been marked as a winner.

### GAP-007: Navigation Model Between Pipeline Stages
- **Severity:** High
- **Category:** Dashboard IA
- **Description:** The sidebar (DESIGN file) lists pages: Dashboard, Discovery, Angles, Scripts, Analytics, Recon, Brain, Settings, Chat. The PRD Section 7.3 describes a linear flow (discover -> angles -> hooks -> scripts -> publish -> analyze). But the sidebar implies non-linear navigation. Can a user jump directly to Scripts without having discovered topics first? If so, what do they see? The PRD doesn't specify whether pages show "all items ever" or "items in the current pipeline run."
- **Impact:** Conflicting navigation models lead to dead-end pages and confused users.
- **Recommended Fix:** Support both models: (1) **Pipeline View** (default for new users) -- a guided linear flow where each stage links to the next, with breadcrumbs showing the pipeline chain (Topic X -> Angle Y -> Hook Z -> Script W). (2) **Library View** (for power users) -- each sidebar page shows all items of that type with filters (status, date, pillar, format). The pipeline visual component (`PipelineFlow.tsx` from DESIGN) should be a persistent element showing the current chain context, appearing as a breadcrumb bar at the top of pipeline pages. Add filter presets: "Show only items from this discovery run" vs "Show all."

### GAP-008: Brain Visualization Undefined
- **Severity:** High
- **Category:** Dashboard IA
- **Description:** The brain is described as the core differentiator (PRD: "persistent AI brain that learns what works"), and multiple components reference it (`BrainViewer.tsx`, `WeightSliders.tsx`, `EvolutionLog.tsx`, `BrainSummary.tsx`, `BrainEditor.tsx`). But no spec describes what the Brain page actually looks like. How are learning weights visualized? How does a user understand that "icp_relevance went from 1.0 to 1.3"? How is the evolution timeline displayed? The `WeightSliders.tsx` component implies users can manually adjust weights, but the PRD says learning weights are "system-managed" and "NEVER modified" by users (only by the analyze/update-brain stages).
- **Impact:** The brain is the product's #1 selling point, yet its visualization is entirely unspecified. The `WeightSliders.tsx` component contradicts the PRD's protected-fields rule.
- **Recommended Fix:** Define the Brain page as three sections: (1) **User-Managed Brain** -- editable cards for Identity, ICP, Pillars, Platforms, Competitors, Cadence, Monetization, Blockers, Content Jobs. Click to expand and edit inline. (2) **System-Managed Intelligence** -- read-only visualization of learning weights (radar/spider chart), hook preferences (horizontal bar chart comparing 6 patterns), performance patterns (key metrics with sparkline trends), visual patterns (thumbnail style breakdown). Weight sliders should be view-only gauges, not interactive sliders, unless a future "expert mode" is designed. (3) **Evolution Timeline** -- vertical timeline showing each brain update event with diff badges ("hook_preferences.contradiction: 0.42 -> 0.79, reason: 3 winners used contradiction hooks"). Include a "before/after" toggle for each evolution event.

---

## 3. Discovery UX Gaps

### GAP-009: Topic Card Information Hierarchy Undefined
- **Severity:** High
- **Category:** Discovery
- **Description:** GVB displays discovery results as formatted ASCII tables with columns: Rank, Title, Competitor, Views, Likes, Engagement. The PRD says "Results table: sortable by weighted_total, filterable by pillar and platform" and also mentions "topic cards." The DESIGN lists `TopicCard.tsx` and `TopicScoring.tsx` as components. But no spec defines what a topic card contains at a glance vs. on expansion, how the 4-criteria scoring is visualized, or how CCN fit (Core/Casual/New) is displayed.
- **Impact:** Developers must guess the information hierarchy of the most-used component in the product.
- **Recommended Fix:** Define TopicCard as: **Collapsed view** -- title, weighted score (large badge, color-coded: green >= 28, yellow 20-27, red < 20), source platform icon, pillar tag(s), competitor name if from competitor discovery, status badge (New/Developing/Scripted/Passed). **Expanded view** -- all collapsed fields plus: 4-criteria breakdown (mini bar chart: ICP relevance, timeliness, content gap, proof potential), CCN fit badges (Core/Casual/New with checkmarks), competitor coverage list, source URL link, description, notes field. Add a "Develop Angles" button prominently in the expanded view.

### GAP-010: Topic-to-Angle Transition Flow
- **Severity:** High
- **Category:** Discovery
- **Description:** The PRD content creation flow (Section 7.3) says "User clicks topic -> 'Develop Angles' button." But the Angles page (`Angles.tsx`) also exists independently in the sidebar. When a user clicks "Develop Angles" from a topic card, where do they go? A new page? A modal? Does it navigate to the Angles page filtered to that topic? The PRD also says "AI generates 15 angles (5 per format)" -- is this automatic or does the user choose which formats to generate for (as in GVB's viral-angle.md which has a format selector)?
- **Impact:** Unclear transition between pipeline stages is a core navigation problem.
- **Recommended Fix:** "Develop Angles" navigates to the Angles page with a generation wizard overlay: Step 1 -- format selector (Longform / Shortform / LinkedIn / All, defaulting to All). Step 2 -- AI generates angles in the background (show streaming progress). Step 3 -- results appear as angle cards within the Angles page, filtered to the source topic. The Angles page should support both "filtered by topic" view (from pipeline flow) and "all angles" view (from sidebar). Add a breadcrumb: "Discovery > [Topic Title] > Angles."

### GAP-011: Long-Running Discovery Job UX
- **Severity:** High
- **Category:** Discovery
- **Description:** The DESIGN specifies WebSocket progress for discovery jobs with detailed progress events (stage, progress percentage, message). But no spec defines the actual UI: Is it a modal? A toast notification? An inline progress section on the Discovery page? Can the user navigate away and come back? What happens if they start a second discovery job while one is running? GVB competitor scraping involves multiple API calls per competitor (channel search, video list, statistics, duration filtering) -- this can take 2-5 minutes.
- **Impact:** Without clear loading state design, users will think the app is broken during the most common operation.
- **Recommended Fix:** Design a two-part progress UI: (1) **Inline progress panel** at the top of the Discovery page showing: overall progress bar, current stage label ("Scraping @competitor3 (3 of 5)..."), estimated time remaining, and a "Cancel" button. (2) **Background job indicator** in the header/navbar showing an animated icon when any job is running, with a dropdown showing all active jobs. Allow navigation away from Discovery -- the job continues in the background, and results appear when the user returns. Prevent duplicate discovery jobs (disable the "Discover" button while one is running, show "Job in progress" state). Use Supabase Realtime to push updates even if the user navigated away.

### GAP-012: Multi-Platform Discovery Results Presentation
- **Severity:** Medium
- **Category:** Discovery
- **Description:** GVB discovery combines YouTube and Instagram results into "a single ranked list" sorted by engagement. The PRD mentions a "Results table: sortable by weighted_total, filterable by pillar and platform." But when keyword discovery also adds Reddit and GitHub results (from skills/last30days), the result set can be heterogeneous -- YouTube topics have views/likes, Reddit topics have upvotes/comments, GitHub topics have stars. How are these normalized and displayed together?
- **Impact:** Mixed-platform results with incomparable metrics confuse users about what "top score" means.
- **Recommended Fix:** Display all results in a unified list sorted by the 4-criteria weighted score (which is platform-agnostic). Add a platform filter bar (YouTube | Instagram | Reddit | All) at the top. Each topic card shows the platform icon. In the expanded view, show platform-specific raw engagement metrics with a note: "Engagement metrics vary by platform -- the weighted score normalizes for cross-platform comparison." For the default "All" view, group results by discovery method (Competitor Analysis | Keyword Search) with a toggle to switch to a flat sorted list.

### GAP-013: Discovery Keyword Management UX
- **Severity:** Medium
- **Category:** Discovery
- **Description:** GVB shows current pillar keywords before discovery and allows session-only edits ("Using modified keywords for this session"). The PRD mentions a "Keyword editor (edit pillar keywords for this session or permanently)" but provides no UI detail. Where does the keyword editor appear? Inline on the Discovery page? A modal? How does the user distinguish between "edit for this run" and "save permanently to brain"?
- **Impact:** Keyword management is a frequently used feature with ambiguous UI placement.
- **Recommended Fix:** Place an expandable "Discovery Keywords" panel at the top of the Discovery page (below the mode selector). Show keywords grouped by pillar, each as a removable chip. Add an "Add keyword" input per pillar. Include a toggle: "Save changes to brain" (off by default = session only). If toggled on, modifications are persisted to the brain on save. Show a visual indicator when session-only keywords are active: "Custom keywords for this run" badge.

---

## 4. Content Creation UX Gaps

### GAP-014: Script Generation Multi-Step Flow Unspecified
- **Severity:** Critical
- **Category:** Content Creation
- **Description:** GVB's viral-script.md is the most interactive command: format selection -> angle picking -> brain context display -> 10 hooks generated (5 brain-influenced + 5 swipe-influenced) -> user selects winning hook -> full script generation -> filming cards (longform) / beat timeline (shortform) / paragraph structure (LinkedIn). This involves at minimum 4 user decision points. The PRD says "Hook -> Script generation with live preview" and the DESIGN lists `ScriptEditor.tsx`, `FilmingCards.tsx`, `BeatTimeline.tsx`. But the multi-step interactive flow is never specified for the web. Is it a wizard? A single page with sections? How do the 4 decision points translate?
- **Impact:** Script generation is the highest-value feature. Without a clear flow specification, the implementation will either oversimplify (losing the interactive coaching that makes GVB effective) or become an incoherent set of UI components.
- **Recommended Fix:** Design as a 4-step wizard within the Scripts page: **Step 1: Hook Generation** -- Shows the angle context (contrast formula, target audience), brain context sidebar (hook preferences, visual intelligence), and generates 10 hooks. Display hooks as ranked cards in two groups (Brain-Influenced, Swipe-Influenced) with composite score badges and a "Recommended" ribbon on the top scorer. **Step 2: Hook Selection** -- User selects 1-3 hooks (primary + alternates). Single-click selects, double-click to preview hook in context. **Step 3: Script Generation** -- AI generates full script with streaming preview. For longform: show section-by-section build with live word count and estimated duration. For shortform: show beat-by-beat timeline building. **Step 4: Review & Edit** -- Full script editor with format-specific layout. Include "Generate Filming Cards" button (longform) or "Preview Beat Timeline" (shortform). Save and export options.

### GAP-015: Hook Display and Comparison UX
- **Severity:** High
- **Category:** Content Creation
- **Description:** GVB generates 10 hooks scored on three criteria (contrast_fit * 0.4 + pattern_strength * 0.35 + platform_fit * 0.25) and displays them in a formatted table. The PRD says "10 hooks displayed as ranked cards (composite score badge)" with a "Brain context sidebar." But the spec never defines: how the 3 sub-scores are visualized, how brain-influenced vs swipe-influenced hooks are distinguished, whether hooks can be compared side-by-side, or how the "recommended" hook is highlighted.
- **Impact:** Hook selection is the critical creative decision in the pipeline. Poor display leads to uninformed choices.
- **Recommended Fix:** Display hooks in two columns: Left column "From Your Brain" (5 hooks), Right column "From the Swipe File" (5 hooks). Each hook card shows: hook text (large, readable), pattern badge (e.g., "Contradiction"), composite score (large number with color), 3-sub-score mini bar (contrast fit, pattern strength, platform fit), visual cue suggestion (if present). The top-scoring hook gets a "Recommended" badge with a tooltip explaining why. Add a "Compare" checkbox on each card -- selecting 2-3 hooks enables a side-by-side comparison modal. The brain context sidebar (right panel) shows hook preference weights and past performance data for each pattern.

### GAP-016: Script Inline Editing Capability Unspecified
- **Severity:** High
- **Category:** Content Creation
- **Description:** The DESIGN lists `ScriptEditor.tsx` but provides no detail on editing capabilities. GVB outputs scripts as formatted text that the user reads in the terminal -- there is no editing. For a web product, users expect to: edit script text inline, reorder sections, adjust talking points, modify CTAs, and regenerate individual sections. None of this is specified. Is it a plain text editor? A structured editor (edit each section separately)? A rich text editor (WYSIWYG with formatting)?
- **Impact:** A script tool without editing is a script viewer -- that's half a feature.
- **Recommended Fix:** Design a structured section-based editor for longform scripts: each section (opening hook, intro framework, retention hook, body sections, mid CTA, closing CTA, outro) is a collapsible block with editable fields. Talking points within sections are editable list items (drag to reorder, click to edit, delete, add). For shortform, use a beat timeline editor where each beat is a card with editable fields (action, visual, text overlay, audio note) on a vertical timeline with timestamps. For LinkedIn, use a simple rich text editor with paragraph structure guidance. Add a "Regenerate this section" button on each section to have AI rewrite just that part while preserving the rest. Include "Undo" support and version history.

### GAP-017: Filming Cards Display and Export Unspecified
- **Severity:** Medium
- **Category:** Content Creation
- **Description:** GVB generates filming cards for longform scripts: scene-by-scene cards with scene_number, section_name, shot_type, say[], show, duration_estimate, notes. The PRD mentions "filming card preview" and the DESIGN lists `FilmingCards.tsx`. But no spec defines: How are cards displayed? Can they be reordered? Are they printable? Are they optimized for mobile (for on-set use)? Can they be exported as a separate PDF? The GVB PDF generation (`scripts/generate-pdf.py`) is mentioned but its output format for filming cards is unspecified in MCL.
- **Impact:** Filming cards are a unique feature that differentiates MCL from competitors. If they're just a data dump, they lose their production value.
- **Recommended Fix:** Display filming cards as a swipeable card deck (think flashcards). Each card shows: scene number (large), section name, shot type icon, "SAY" section (key lines in large readable text), "SHOW" section (visual direction), duration, and notes. Include three views: (1) **Desktop grid** -- all cards visible in a grid for overview. (2) **Presentation mode** -- full-screen single card view with large text, forward/back navigation, ideal for teleprompter or on-set reference. (3) **Print layout** -- optimized for paper printing (4 cards per page). Export options: PDF (print layout), individual card images (for sharing), and "Send to phone" (email/SMS link to a mobile-optimized view). Mobile view should be a full-screen swipeable card interface with extra-large text.

### GAP-018: Teleprompter Mode Unspecified
- **Severity:** Medium
- **Category:** Content Creation
- **Description:** The PRD mentions "Teleprompter mode: full-screen script display for recording" (Section 5.5) but provides no detail on: scroll speed control, font size, mirror mode (for teleprompter hardware), pause/resume, section highlighting, or whether it works on mobile/tablet.
- **Impact:** Teleprompter mode is a compelling feature for creators but needs more specification than a single line item.
- **Recommended Fix:** Design teleprompter mode as: full-screen overlay with configurable scroll speed (slider or keyboard shortcuts), large high-contrast text (white on black, configurable), adjustable font size, mirror toggle (horizontal flip for beam-splitter teleprompters), play/pause button (spacebar), section markers in the scroll margin, and a countdown timer before start. Support tablet landscape mode as the primary on-set use case. This can be a v1.1 feature but needs a spec before that phase.

---

## 5. Analytics UX Gaps

### GAP-019: Manual vs Automated Analytics Entry UX
- **Severity:** Critical
- **Category:** Analytics
- **Description:** GVB's analyze command has extensive logic for manual metric entry when APIs aren't connected (asking users to paste metrics from YouTube Studio, offering instaloader as a fallback, etc.). The PRD says "Configurable collection frequency: daily, every 3 days, weekly" and "Dashboard charts." But for the web product, the spec never resolves: What is the primary analytics path? Is it fully automated (requiring OAuth setup first)? What if a user hasn't connected YouTube Analytics OAuth? Is there a manual entry form? The GVB command has a sophisticated fallback hierarchy (API -> instaloader -> manual input) that has no web equivalent specified.
- **Impact:** Analytics is the feedback loop that powers brain evolution. If users can't get data in, the brain never improves, and the core product loop breaks.
- **Recommended Fix:** Design three analytics paths: (1) **Automated** (preferred) -- OAuth connected, scheduled background collection, no user action needed. Show "Auto-collecting every 3 days" badge on Analytics page. (2) **Semi-automated** -- YouTube Data API key connected but no OAuth. Collects public metrics (views, likes, comments) automatically but not CTR/retention/subscribers. Show a "Connect YouTube Analytics for full metrics" upgrade prompt. (3) **Manual entry** -- A form per published content piece where users can paste metrics from YouTube Studio / Instagram Insights. Design as a structured form matching the AnalyticsEntry schema (views, impressions, CTR, retention, likes, comments, etc.) with a "Copy from YouTube Studio" helper that parses pasted text. Show "Manual entry" badge on content. Prioritize path 1 setup during onboarding/setup to minimize manual entry.

### GAP-020: Analytics Dashboard Visualization Unspecified
- **Severity:** High
- **Category:** Analytics
- **Description:** The PRD lists: "Analytics overview: key metrics cards", "Content performance table", "Winner badges", "Pattern analysis charts", "Time-series graphs." The DESIGN lists `PerformanceChart.tsx`, `InsightCard.tsx`, `InsightPanel.tsx`, `WinnerBadge.tsx`. But no spec defines what charts are shown, what axes and time ranges are used, how winners are visually distinguished, or how the pattern report (a text-heavy output in GVB) becomes a visual dashboard.
- **Impact:** Analytics visualization is the primary way users understand if MCL is working. Vague specs lead to generic chart implementations that don't communicate the system's unique insights.
- **Recommended Fix:** Define the Analytics page as four sections: (1) **KPI Strip** -- 4 metric cards: Avg CTR (with trend arrow), Avg Retention @ 30s, Total Views (this month), Content Analyzed count. (2) **Performance Table** -- sortable list of all analyzed content with columns: Title, Platform, Published, Views, CTR, Retention, Engagement Rate, Winner badge. Click to expand for full metrics. (3) **Pattern Analysis** -- Two charts side-by-side: (a) Hook Pattern Performance -- grouped bar chart showing avg CTR per hook pattern (contradiction, specificity, etc.), (b) Topic/Pillar Performance -- bar chart showing avg engagement per content pillar. (4) **Winner Feed** -- filtered view of content marked as winners, each with a "Why it won" tag (e.g., "CTR 2.3x median", "Top 10% views"). Include a date range selector affecting all sections.

### GAP-021: Brain Evolution Diff Visualization
- **Severity:** High
- **Category:** Analytics
- **Description:** GVB's update-brain command shows a text diff: "Proposed changes: learning_weights.icp_relevance: 1.0 -> 1.3 (reason: high-ICP topics consistently outperform)." The PRD says "Proposed changes shown as a diff in the web dashboard with approve/reject per change" and "Evolution history timeline." But no spec defines: How is a diff rendered for JSON-like data? Can users approve individual field changes or only all-or-nothing? What does the timeline look like? How do users understand what a weight change means in plain language?
- **Impact:** Brain evolution is the product's core differentiator ("it gets smarter"). If users don't see or understand the evolution, they miss the value.
- **Recommended Fix:** Design the brain evolution UI as a modal/page with three sections: (1) **Summary** -- "Based on 12 new content pieces analyzed, I recommend 4 changes to your brain." (2) **Change Cards** -- each proposed change as a card showing: field name in plain language (e.g., "ICP Relevance Weight"), old value -> new value with a visual gauge, reason in natural language, supporting evidence (e.g., "Your top 3 winners all scored 8+ on ICP relevance"), and an individual approve/reject toggle. (3) **Preview** -- "If applied, your next Discovery will prioritize topics with higher ICP relevance scores." Allow "Accept All" or individual approve/reject. After approval, show a brief animation of the brain "evolving" and log the event to the timeline.

### GAP-022: Winner Extraction Visual Representation
- **Severity:** Medium
- **Category:** Analytics
- **Description:** GVB's winner extraction (viral-analyze.md Phase G) uses statistical thresholds (CTR >= median * 1.5, views >= 75th percentile) and produces text-heavy output including transcript analysis and visual analysis. The PRD mentions "Winner badges" and "Deep analysis button." No spec defines: how winners are visually highlighted across the product (not just on the Analytics page but also on the Scripts page, Hook cards, etc.), what the deep analysis output looks like in a web UI, or how transcript + visual analysis results are displayed.
- **Impact:** Winners are the most actionable insight in the system. If they're hard to find or poorly presented, users miss the feedback loop's value.
- **Recommended Fix:** Design a "Winner System" that propagates across the product: (1) **Winner Badge** -- a gold star or trophy icon that appears on content cards everywhere (Scripts page, Analytics page, Dashboard recent activity). (2) **Winner Detail Panel** -- when clicking a winner, show: performance metrics vs. median (visual comparison bars), reason for winner status, hook pattern used, topic/pillar, and a "What worked" section with AI-generated insight. (3) **Deep Analysis View** -- for top 10 content, show a full breakdown: transcript excerpts highlighting the hook and retention hooks, visual analysis (thumbnail style, text overlay analysis), and "Replicate this" action button that creates a new topic pre-filled with the winning topic's characteristics.

---

## 6. AI Chat Integration Gaps

### GAP-023: Chat Interface Location and Scope Undefined
- **Severity:** Critical
- **Category:** AI Chat
- **Description:** The DESIGN lists `ChatPanel.tsx`, `MessageBubble.tsx`, `ChatWindow.tsx` components and a dedicated `Chat.tsx` page. The PRD mentions a WebSocket endpoint `/ws/chat`. The IMPLEMENTATION-PLAN lists `apps/web/src/pages/Chat.tsx`. But no document specifies: Is the chat a full page or a sidebar? Is it always visible or toggled? Is it context-aware (knows which page the user is on)? Can it modify data (create topics, regenerate hooks) or is it advisory only? How does it differ from the AI that powers angle/hook/script generation?
- **Impact:** Chat is listed as a major feature but has zero UX specification. The front-end team cannot build it without knowing its scope, location, and capabilities.
- **Recommended Fix:** Define the AI chat as a collapsible right sidebar (not a full page) that is available on all pages. The chat is context-aware: opening it on the Discovery page preloads the current topic context; on the Scripts page, it preloads the current script. Define two modes: (1) **Advisory** (v1) -- chat can answer questions, explain scoring, suggest improvements, but cannot directly modify data. Actions are suggested as buttons in the chat ("Click to regenerate hooks"). (2) **Actionable** (v1.5) -- chat can directly trigger pipeline operations ("Regenerate these hooks with more specificity patterns"). Streaming responses render as Markdown with syntax highlighting. Move the Chat page to be a sidebar toggle, not a separate page.

### GAP-024: AI Chat vs Pipeline AI Distinction
- **Severity:** Medium
- **Category:** AI Chat
- **Description:** The product has two AI interaction models: (1) pipeline AI that generates angles, hooks, scripts in response to structured triggers, and (2) chat AI for freeform conversation. These use the same Anthropic API key and metered usage. No spec distinguishes their prompting, context windows, or cost implications. Can a user generate a full script through chat instead of the pipeline? Are chat messages counted differently from pipeline operations in AI usage tracking?
- **Impact:** Users may default to chat for everything (it's familiar), bypassing the structured pipeline and burning AI credits on unstructured requests. Or chat may be underpowered because it lacks the detailed prompt templates from GVB commands.
- **Recommended Fix:** Define clear boundaries: Pipeline AI uses the structured prompt templates ported from GVB commands (high quality, specific output format). Chat AI uses a general coaching prompt with brain context for advisory responses. Chat cannot trigger full pipeline operations directly in v1 but can navigate users to the right pipeline stage ("Sounds like you need to run Discovery for that topic -- click here"). Track chat AI usage separately in the `ai_usage` table with `operation: 'chat'`. Set a per-session message limit for chat (e.g., 50 messages for free, unlimited for pro).

### GAP-025: Streaming Response Rendering
- **Severity:** Medium
- **Category:** AI Chat
- **Description:** The DESIGN mentions WebSocket for chat (`/ws/chat`) but doesn't specify how streaming AI responses render. GVB outputs formatted text directly in the terminal. In a web UI, streaming responses need: Markdown rendering, code block formatting, table rendering, and potentially interactive elements (buttons, links to pipeline items).
- **Impact:** Poor streaming UX (jittery text, broken markdown during stream) degrades the AI coaching experience.
- **Recommended Fix:** Use a Markdown renderer (e.g., react-markdown) with streaming support: buffer tokens until a complete line or paragraph, then render. During streaming, show a typing indicator. After streaming completes, post-process the response for: interactive elements (linkify topic IDs, angle IDs), action buttons ("View in Discovery", "Generate Angles"), and formatted tables. Use a monospace font for data tables and code blocks within chat.

---

## 7. Multi-Creator / Agency UX Gaps

### GAP-026: Workspace Switcher UX Undefined
- **Severity:** High
- **Category:** Agency
- **Description:** The PRD defines parent/child workspaces for agencies (Section 9) and a user flow (Section 7.5) that says "Agency owner signs up, creates parent workspace, adds child workspaces for each client." But no spec defines: How does the UI switch between workspaces? Is it a dropdown in the header? A sidebar with workspace list? Does switching workspaces reload the entire page? What does the parent workspace dashboard show? The DESIGN has `useWorkspace.ts` hook and `workspace.ts` Zustand store but no visual components for workspace management.
- **Impact:** Multi-creator is a v2 feature per the PRD strategy, but the data model (workspace_id on every table) is built from v1. Without at minimum a workspace selector stub in v1, agencies can't use the product.
- **Recommended Fix:** Design a workspace selector in the header bar: dropdown showing workspace name with a caret. For individual users (v1), this shows their single workspace (non-interactive). For agencies (v2), the dropdown lists all accessible workspaces with: workspace name, creator name, last activity indicator, and brain health status. Switching workspaces triggers a full context reload (all React Query caches invalidated, brain reloaded). The parent workspace has a special "Agency Overview" dashboard showing: all child workspaces in a table with key metrics (content count, avg CTR, last activity), plus aggregate charts.

### GAP-027: Agency Aggregate Analytics
- **Severity:** Low
- **Category:** Agency
- **Description:** PRD Section 7.5 mentions "Agency dashboard shows cross-workspace metrics" and "Parent workspace admins see aggregate performance." No spec defines what aggregate metrics are shown, how cross-workspace comparison works, or how data is displayed for 3-20 creators on a single screen.
- **Impact:** This is a v2 feature, but the lack of spec will delay agency launch if not addressed before Phase 3.
- **Recommended Fix:** Define the Agency Overview page (v2) with: (1) workspace table (name, creator, total views this month, avg CTR, content count, brain health percentage), (2) comparison chart (select 2-5 workspaces to compare on any metric), (3) aggregate KPIs (total views across all creators, average CTR, total content pieces). Defer to v2 but document the data requirements now so the schema supports aggregation queries.

### GAP-028: Agency Onboarding Model
- **Severity:** Low
- **Category:** Agency
- **Description:** Does the agency owner fill in each client's brain, or does each client onboard themselves? The PRD mentions "Invites team members with roles" but doesn't specify whether clients are team members or external users. Can an agency owner run the onboarding wizard on behalf of a client?
- **Impact:** v2 feature but needs early design thinking.
- **Recommended Fix:** Define two agency onboarding paths: (1) **Agency-managed** -- agency admin fills in the brain for the client (they know the brand, ICP, etc.). (2) **Client-managed** -- agency sends a branded onboarding link to the client, who fills in their own brain. The client gets viewer access to their workspace; the agency gets editor/admin access. Support both paths via the same onboarding wizard, just with different auth contexts.

---

## 8. CLI/Web Parity Gaps

### GAP-029: Real-Time Sync Between CLI and Web
- **Severity:** Critical
- **Category:** CLI/Web Parity
- **Description:** The PRD says both CLI and web save to the same Supabase database. But no spec addresses: (1) If a user creates a topic via CLI, does it appear on the web dashboard immediately? (2) If a user edits the brain via web, does the next CLI command see the change? (3) What happens if CLI and web modify the same data concurrently? The DESIGN mentions Supabase Realtime for web updates, but the CLI uses direct API calls or `mcl-pipeline` imports. There is no WebSocket subscription in the CLI.
- **Impact:** Users who switch between CLI and web (Persona C: "Claude Code Power User") will encounter stale data, duplicate entries, or conflicting edits.
- **Recommended Fix:** Specify sync behavior: (1) **CLI -> Web**: CLI API calls go through the same FastAPI endpoints. Supabase Realtime subscriptions on the web dashboard will pick up changes within seconds. No special handling needed. (2) **Web -> CLI**: CLI should always fetch the latest data from the API before each command (add a `--refresh` default behavior). Brain data is loaded fresh each time `mcl discover`, `mcl angle`, etc. runs. (3) **Concurrent edits**: Use optimistic concurrency control. Each record has an `updated_at` timestamp. On PATCH, include `If-Match: {updated_at}` header. If the record was modified since the client last read it, return 409 Conflict with the current state. The CLI or web can then show a diff and ask the user to resolve. For v1, last-write-wins is acceptable given single-user workspaces.

### GAP-030: CLI Offline Mode Data Format Parity
- **Severity:** Medium
- **Category:** CLI/Web Parity
- **Description:** PRD Section 11 defines an offline mode: "Data stored locally in ~/.mcl/data/ (JSON/JSONL, matching GVB format)" with "Sync when back online: mcl sync." But no spec defines: How does sync work when offline data was created without UUIDs (GVB format uses date-based IDs like `topic_20260304_001`)? How are conflicts resolved during sync? What if the same topic was discovered offline and online?
- **Impact:** Offline mode is a differentiating feature for CLI users but sync conflicts could corrupt data.
- **Recommended Fix:** Define offline sync as: (1) Offline data uses UUID v4 IDs (not GVB format) so they're globally unique. (2) `mcl sync` uploads all local data that doesn't exist on the server (by ID). (3) If a brain section was modified both locally and remotely, show a diff and prompt the user to choose. (4) Topics, angles, hooks, scripts are append-only in offline mode (no edits to server data while offline). Mark offline items with `source: 'offline'` until synced. For v1, defer offline mode entirely and require an internet connection.

---

## 9. Mobile Responsiveness Gaps

### GAP-031: Mobile Responsive Design Requirements Absent
- **Severity:** High
- **Category:** Mobile
- **Description:** No document mentions responsive design, breakpoints, or mobile layout. The DESIGN specifies a sidebar + header + main content layout which is desktop-oriented. Creators check analytics on their phones frequently. The filming cards feature is explicitly designed for on-set use (where a phone or tablet is the available device).
- **Impact:** If the dashboard is desktop-only, a significant portion of the use cases (analytics checking, filming card reference) are inaccessible.
- **Recommended Fix:** Define three breakpoints: Desktop (>= 1280px, full sidebar + content), Tablet (768-1279px, collapsible sidebar, full content), Mobile (< 768px, bottom nav, stacked content). Specify mobile-priority views: (1) **Analytics** -- full responsive, cards stack vertically, charts resize. (2) **Filming Cards** -- full-screen swipeable card view with large text, optimized for portrait mode on phones. (3) **Scripts** -- read-only view on mobile, editing deferred to desktop. (4) **Discovery** -- topic cards stack vertically, scoring breakdown visible on tap. (5) **Brain** -- summary view only on mobile, editing deferred to desktop. Specify that the sidebar becomes a hamburger menu on mobile, with bottom navigation for: Dashboard, Discovery, Scripts, Analytics, Brain.

### GAP-032: Mobile Filming Card Experience
- **Severity:** Medium
- **Category:** Mobile
- **Description:** Filming cards are specifically designed for on-set production use (GVB viral-script.md generates "scene-by-scene: scene_number, section_name, shot_type, say[], show, duration_estimate, notes"). No spec addresses mobile optimization for this use case.
- **Impact:** The filming cards feature loses its production value if it requires a laptop on set.
- **Recommended Fix:** Design a dedicated mobile filming card view: full-screen, swipeable, landscape-supported, with: extra-large "SAY" text (teleprompter-style), shot type icon, scene counter (3/12), swipe to advance, tap to toggle notes, and a persistent timer. This view should be accessible via a direct URL (shareable, no login required for the duration of the session) so the creator can open it on any phone. Add a "Send to my phone" button on the desktop filming cards view that generates a temporary access link.

### GAP-033: Mobile App Roadmap
- **Severity:** Low
- **Category:** Mobile
- **Description:** No document mentions a native mobile app. The PWA approach (responsive web) may suffice for v1, but some use cases (push notifications for analytics updates, offline filming card access) benefit from a native app.
- **Impact:** No immediate impact, but competitors with mobile apps have an advantage.
- **Recommended Fix:** Add to the PRD's out-of-scope section: "Native mobile app is out of scope for v1. The web dashboard is designed as mobile-responsive. A PWA with push notifications is planned for v1.5. Native iOS/Android apps are a v3.0 consideration." Ensure the responsive web design is PWA-ready (service worker, manifest.json) from v1.

---

## 10. Accessibility & Internationalization Gaps

### GAP-034: WCAG Compliance Not Addressed
- **Severity:** High
- **Category:** Accessibility
- **Description:** No document mentions accessibility, WCAG compliance, screen reader support, keyboard navigation, or color contrast requirements. The product uses color-coded scoring (green/yellow/red), pattern badges, and charts -- all of which have accessibility implications.
- **Impact:** Excluding users with disabilities is both an ethical and legal concern. SaaS products increasingly require WCAG 2.1 AA compliance for enterprise sales (relevant for the Agency tier).
- **Recommended Fix:** Add a section to the PRD's non-functional requirements: "WCAG 2.1 AA compliance is required for v1. All color-coded elements must have text/icon alternatives (not color-only). All interactive elements must be keyboard-navigable. All images and charts must have alt text. Forms must have proper labels and error messages. Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text." Use shadcn/ui's built-in accessibility features. Add axe-core automated accessibility testing to CI.

### GAP-035: Language Support Unaddressed
- **Severity:** Medium
- **Category:** Internationalization
- **Description:** All GVB prompts are English-only. The MCL specs make no mention of internationalization. The AI generates English-language hooks, scripts, and angles. But non-English creators exist (Spanish, Portuguese, Hindi creators are massive markets).
- **Impact:** English-only limits the total addressable market significantly.
- **Recommended Fix:** For v1, explicitly state "English-only" in the PRD. Add i18n infrastructure to the web app from day 1 (use react-i18next for UI strings) even if only English translations exist. Add a `language` field to the brain's Identity section. For the AI pipeline, add a `language` parameter to prompt templates. Support for non-English content generation is a v2.0 feature. UI localization is a v3.0 feature.

### GAP-036: Non-English Content Creation
- **Severity:** Low
- **Category:** Internationalization
- **Description:** Even with an English UI, creators may want to generate content in other languages. Can the AI generate Spanish hooks and scripts? The prompt templates would need language-aware versions. The scoring engine's keyword matching assumes English.
- **Impact:** Deferred feature, but the scoring engine's language assumption should be noted as a limitation.
- **Recommended Fix:** Document as a known limitation in v1. Add a `content_language` field to the brain. For v2, allow prompt templates to include a language directive. For the scoring engine, use embedding-based similarity instead of keyword matching (language-agnostic). The LLM itself supports multilingual generation, so the main work is in scoring and UI.

---

## 11. Additional Gaps Discovered During Analysis

### GAP-037: Error State Design Missing
- **Severity:** High
- **Category:** General UX
- **Description:** No document specifies error states for: API failures, rate limit exceeded, YouTube quota exhausted, AI generation failures, network disconnection, or background job failures. The API spec defines error JSON format but not how errors are displayed in the web UI.
- **Impact:** Error states are some of the most common user experiences in early products. Without design, users see raw error messages or blank screens.
- **Recommended Fix:** Define a global error handling strategy: (1) **Toast notifications** for transient errors (network timeout, rate limit -- auto-retry). (2) **Inline error panels** for form validation errors (field-level red messages). (3) **Full-page error states** for critical failures (quota exceeded, auth expired). (4) **Job failure states** for background jobs (show failure reason on the job progress panel with a "Retry" button). (5) **YouTube quota exceeded** gets a specific design: "YouTube API quota reached (resets at midnight Pacific). You can still work with existing topics or try keyword discovery on other platforms." Include a quota usage indicator on the Settings page.

### GAP-038: Notification System Undefined
- **Severity:** Medium
- **Category:** General UX
- **Description:** No document mentions notifications. When a background job completes (discovery finds 15 topics, analytics identifies a winner, brain evolution proposes changes), how is the user notified? The WebSocket progress updates cover active monitoring but not passive notification (e.g., user is on another page or has the browser minimized).
- **Impact:** Without notifications, users must manually check for completed jobs, reducing engagement.
- **Recommended Fix:** Implement a notification system: (1) **In-app notification bell** in the header with unread count. Notifications for: job completion, new winners identified, brain evolution proposed, API connection expiring. (2) **Browser notifications** (with permission) for high-priority events: "New winner detected! Your video on AI Agents is outperforming by 2.3x." (3) **Email notifications** (via Resend, already in the tech stack) for weekly summaries and critical alerts. Notification preferences configurable in Settings.

### GAP-039: Data Export and Portability
- **Severity:** Medium
- **Category:** General UX
- **Description:** The PRD mentions a `scripts-pdf` storage bucket and `exports` bucket. The DESIGN mentions `exports.py` worker and `/api/v1/exports/*` routes. But no spec defines what can be exported, in what formats, or how the export UI works.
- **Impact:** Creators need to export scripts to docs, PDFs, and other tools. Agencies need to export reports for clients.
- **Recommended Fix:** Define export capabilities: (1) **Scripts** -- export as PDF (existing GVB feature), Markdown, Google Docs (via API), plain text, and clipboard copy. (2) **Filming Cards** -- export as PDF, image cards (PNG per card), or printable sheet. (3) **Analytics** -- export as CSV (for spreadsheet analysis), PDF report (for agency client presentations). (4) **Brain** -- export as JSON (for backup/portability). (5) **Full workspace** -- export all data as JSON archive (GDPR compliance). Add an "Export" button wherever content is viewable, with a format selector dropdown.

### GAP-040: Onboarding Re-Entry and Brain Updates
- **Severity:** Medium
- **Category:** Onboarding
- **Description:** GVB's onboard command checks if the brain is already populated and offers "update specific sections, or start completely fresh." The web product has "Inline editing: click any section to edit in place" on the brain dashboard. But these are different experiences: the web brain editor allows direct field editing, while GVB's re-onboarding is conversational. Is there a web equivalent of the guided re-onboarding? When should a user edit fields directly vs. go through the wizard again?
- **Impact:** Users who outgrow their initial setup need a clear path to update their brain without the overhead of re-running the full wizard.
- **Recommended Fix:** Provide two paths: (1) **Direct edit** -- on the Brain page, each section has an "Edit" button that opens an inline editor for that section's fields. Good for quick changes (add a competitor, update CTA URL). (2) **Guided review** -- a "Review My Brain" button that walks through all 9 sections as a wizard (similar to onboarding) but pre-populated with current values. Good for periodic strategy reviews. The AI can suggest updates based on performance data: "Your ICP pain points haven't been updated in 3 months, and your analytics show your audience is responding to different topics. Want to review?"

### GAP-041: Content Calendar / Posting Schedule View
- **Severity:** Medium
- **Category:** Dashboard IA
- **Description:** GVB's cadence section captures posting schedule (shorts_per_day, longform_per_week, specific days). The brain stores optimal_times (filled by analyze). But no MCL page shows a content calendar or schedule view. Users know WHAT to create (from the pipeline) but not WHEN to post it. The cadence data exists but has no visual representation.
- **Impact:** Missing a calendar view means the cadence data is collected but unused in the web UI.
- **Recommended Fix:** Add a Calendar page (or a calendar widget on the Dashboard) that shows: (1) planned posting slots based on cadence (e.g., "Monday: 2 shorts, 1 longform"), (2) scripts assigned to slots (drag-and-drop from scripts list), (3) published content on past dates (with performance indicators), (4) optimal posting times (from brain) shown as highlighted time slots. This bridges the gap between "content created" and "content posted." Can be a v1.1 feature but the cadence data model is ready.

### GAP-042: Swipe File / Hook Repository UX
- **Severity:** Medium
- **Category:** Content Creation
- **Description:** GVB maintains a swipe file (`data/hooks/swipe-hooks.jsonl`) of competitor hooks extracted during recon. The script command uses these as inspiration ("5 swipe-influenced hooks"). The PRD mentions `swipe_hooks` table and a `GET /workspaces/{id}/swipe-hooks` endpoint. But no spec describes a UI for browsing, searching, or managing the swipe file. Where do users see their collected swipe hooks? Can they add hooks manually? Can they tag and organize them?
- **Impact:** The swipe file is a growing competitive intelligence asset. Without a UI, it's invisible to web users.
- **Recommended Fix:** Add a "Swipe File" section within the Recon or Scripts page. Display swipe hooks as cards with: hook text, pattern tag, competitor source, platform, engagement metrics, and a "Use in script" button. Include search (by text or pattern), filter (by competitor, platform, pattern), and manual add capability. Show "Swipe-inspired" hooks in the HookGenie results with a link to the source swipe hook. This surfaces competitive intelligence that currently exists only in the database.

### GAP-043: Competitor Recon Dashboard UX
- **Severity:** Medium
- **Category:** Discovery
- **Description:** The DESIGN lists `Recon.tsx` page with `CompetitorList.tsx`, `ReconJobStatus.tsx`, `SkeletonViewer.tsx` components. The PRD describes recon as part of discovery. But the Recon page is listed separately in the sidebar from Discovery. How do these relate? Is Recon a standalone page for deep competitor analysis, or is it a tab within Discovery? What does the SkeletonViewer show (extracted content structures from competitor videos)?
- **Impact:** Unclear relationship between Recon and Discovery pages leads to redundant or confusing navigation.
- **Recommended Fix:** Merge Recon into Discovery as a tab or section. Discovery page has two modes: "Discover Topics" (keyword + competitor topic scraping) and "Deep Recon" (skeleton ripper -- downloads, transcribes, and extracts hooks/structures from competitor videos). The Recon components (CompetitorList, ReconJobStatus, SkeletonViewer) appear within the "Deep Recon" tab. The SkeletonViewer shows extracted content structures: hook technique, value structure, CTA type, with links to the source video. Remove "Recon" as a separate sidebar item to reduce navigation complexity.

### GAP-044: Search and Filter Global Pattern
- **Severity:** Medium
- **Category:** General UX
- **Description:** No document defines a global search capability. Users will accumulate hundreds of topics, dozens of angles, many scripts. How do they find a specific topic from last month? How do they search across all content types? The PRD mentions "filterable" on several pages but never defines the filter UI pattern or a global search.
- **Impact:** As usage grows, finding past content becomes increasingly difficult without search.
- **Recommended Fix:** Design two levels: (1) **Page-level filters** -- each list page (Topics, Angles, Scripts, Analytics) has a filter bar with: text search (fuzzy match on title/description), status filter (multi-select dropdown), date range picker, pillar filter, platform filter, format filter. Standardize the filter bar component across all list pages. (2) **Global search** -- Cmd+K shortcut opens a global search modal that searches across all content types (topics, angles, hooks, scripts). Results grouped by type with quick-jump links. Use Supabase full-text search for implementation.

### GAP-045: Undo / Version History for AI-Generated Content
- **Severity:** Medium
- **Category:** Content Creation
- **Description:** When AI generates 15 angles for a topic, the user approves some and rejects others. If they later realize they rejected a good angle, can they recover it? When a script is regenerated, is the previous version preserved? GVB appends to JSONL files so nothing is truly deleted. The web product has no specified version history or undo capability.
- **Impact:** AI-generated content is probabilistic -- the same prompt may produce different results. Without version history, regeneration destroys previous output.
- **Recommended Fix:** Implement soft-delete and version history: (1) Rejected/archived items are soft-deleted (status: 'archived') and accessible via a "Show archived" toggle on list pages. (2) Scripts have a version history: each regeneration or major edit creates a new version. A "History" button shows previous versions with diff view. (3) Hooks are never truly deleted -- rejected hooks remain in the database with status 'rejected' and can be recovered. (4) Add an "Undo" action on recent operations (last 5 minutes) using a simple action log.

### GAP-046: Onboarding Progress Persistence
- **Severity:** Low
- **Category:** Onboarding
- **Description:** PRD Section 7.1 says "Each step saves independently (user can leave and resume)" but no spec defines how progress is persisted. Is it saved to the database after each step? To local storage? What does the UI look like when a user returns mid-onboarding? Which step are they returned to?
- **Impact:** Minor, but a broken resume experience during onboarding increases drop-off.
- **Recommended Fix:** Save onboarding progress to the brain table after each section completion. The onboarding wizard checks brain completeness on load: completed sections show green checkmarks, the first incomplete section is the active step. A "Skip for now" button on each section sets it to a special "skipped" state that counts toward resume logic but not toward brain health. Local storage saves form field values as the user types (prevent loss on accidental page close).

### GAP-047: CTA Template Management UI
- **Severity:** Low
- **Category:** Content Creation
- **Description:** GVB uses `data/cta-templates.json` for CTA generation in angles and scripts. The PRD mentions "Custom CTA templates" as a paid feature. But no spec defines: how users view the default CTA templates, how they customize them, or where the CTA template editor lives in the UI. The CLAUDE.md warns "Don't modify cta-templates.json structure without updating dependent commands."
- **Impact:** Low for v1 (defaults work), but the paid feature needs a design before the pricing tier is finalized.
- **Recommended Fix:** Add a "CTA Templates" section to the Settings page (Pro/Agency tiers only). Show default templates as read-only cards. Allow Pro+ users to: clone a default template and modify it, create new templates from scratch, set a template as default for a specific format (longform, shortform, LinkedIn), and archive unused templates. Include template variables (e.g., `{brand_name}`, `{lead_magnet_url}`) with a variable reference sheet.

---

## Priority Matrix

### Must Resolve Before Development Begins (Critical)
1. GAP-001: Onboarding interaction model (form wizard vs conversational vs hybrid)
2. GAP-002: Minimum viable onboarding requirements
3. GAP-006: Main dashboard content definition
4. GAP-014: Script generation multi-step flow
5. GAP-019: Manual vs automated analytics entry UX
6. GAP-023: Chat interface location and scope
7. GAP-029: CLI/Web real-time sync behavior
8. GAP-008: Brain visualization (due to contradicting `WeightSliders.tsx`)

### Must Resolve Before Phase 4 (Web Dashboard)
9. GAP-003: Pre-onboarding empty state
10. GAP-007: Navigation model (pipeline vs library)
11. GAP-009: Topic card information hierarchy
12. GAP-010: Topic-to-angle transition flow
13. GAP-011: Long-running discovery job UX
14. GAP-015: Hook display and comparison
15. GAP-016: Script inline editing
16. GAP-020: Analytics dashboard visualization
17. GAP-021: Brain evolution diff visualization
18. GAP-031: Mobile responsive design requirements
19. GAP-034: WCAG compliance requirements
20. GAP-037: Error state design
21. GAP-026: Workspace switcher (stub for v1)

### Should Resolve Before Launch
22. GAP-004: AI-assisted onboarding specifics
23. GAP-005: Onboarding section order and skip logic
24. GAP-012: Multi-platform discovery results
25. GAP-013: Discovery keyword management
26. GAP-017: Filming cards display and export
27. GAP-022: Winner extraction visual representation
28. GAP-024: Chat vs pipeline AI distinction
29. GAP-025: Streaming response rendering
30. GAP-035: Language support statement
31. GAP-038: Notification system
32. GAP-039: Data export and portability
33. GAP-040: Brain re-entry and updates
34. GAP-041: Content calendar view
35. GAP-042: Swipe file UI
36. GAP-043: Recon/Discovery page relationship
37. GAP-044: Search and filter pattern
38. GAP-045: Version history for AI content

### Can Defer Post-Launch
39. GAP-018: Teleprompter mode details
40. GAP-027: Agency aggregate analytics
41. GAP-028: Agency onboarding model
42. GAP-030: CLI offline mode sync
43. GAP-032: Mobile filming card experience
44. GAP-033: Mobile app roadmap
45. GAP-036: Non-English content creation
46. GAP-046: Onboarding progress persistence
47. GAP-047: CTA template management UI
