# TryHolo-Inspired Full Website Redesign Blueprint

## 1) Purpose and Scope

This document defines a full redesign direction for the MCL web product, inspired by the design language and section structure used on tryholo.ai.

Scope covered here:

- Public pages: `Login`, `Onboarding`, `Legal`.
- Authenticated app pages: `Dashboard`, `Topics`, `Angles`, `Hooks`, `Scripts`, `Analytics`, `Brain`, `Settings`, `Support`.
- Shared UI shell: left sidebar, main page headers, right tactical assistant panel.
- Global design system, reusable components, motion, responsive behavior, and rollout phases.

This is a design and execution blueprint only. No UI implementation is included in this file.

## 2) TryHolo Visual DNA (Deconstruction)

Reference snapshot used for this blueprint:

- Homepage title: `Holo | AI Marketing Tool for Ads, Social Posts & Emails`
- Core value line: `Launch 10x more content. 75% faster.`
- Published marker in source: `Published Feb 18, 2026`
- Observed section rhythm from public content: hero, social proof metrics, "How it works" steps, "All-in-one" capability cluster, swipe-based idea workflow, large stats band, use-case coverage, team/testimonials, FAQ, closing CTA.

### 2.1 Brand and Messaging Pattern

- Message style is results-first and action-heavy.
- Headlines are short and punchy with quantified outcomes.
- Supporting copy is plain-language and conversion-oriented.
- CTA language is direct: buy, launch, create, publish.

### 2.2 Visual Pattern

- Dark-forward canvas with high contrast text.
- Soft gray-black surfaces instead of bright card backgrounds.
- Bright accent colors used as highlights, pills, and CTA gradients.
- Rounded cards and compact chips for dense information blocks.
- Repeating trust and proof elements: metrics, brand statements, testimonials.

Dominant observed color tendency from public styles:

- Base dark: around `#1d1d1f` and nearby dark grays.
- Light text/surfaces: around `#fbfbfb`, `#e6e6e7`.
- Accent family appears around: `#ee4454`, `#f05427`, `#3e86c6`, `#a666aa`, `#ec4492`.

### 2.3 Typography Pattern

- Display and body style leans geometric + modern.
- Public source references include `Gabarito` and `Fragment Mono` with `Inter` support.
- Distinct separation between headline voice and utility/meta labels.

### 2.4 Interaction Pattern

- "Swipe and choose" mental model for idea selection.
- Modular card workflow (input -> generate -> edit -> publish).
- Frequent use of segmented controls and filter chips.
- Heavy use of visual proof strips and trust markers.

## 3) Translation Rules for MCL

We should borrow TryHolo's visual language and content rhythm while preserving MCL product-specific workflows.

Rules:

1. Keep all MCL functionality and route structure intact.
2. Move from current pastel/glass identity to dark, high-contrast "operator console" styling.
3. Keep conversion-style copy in headers, subheaders, and actions.
4. Use proof-forward modules (stats, performance signals, confidence badges) on every page.
5. Normalize all page headers into one reusable pattern.
6. Rebuild card hierarchy so actions are always obvious within 1 screen.

## 4) Proposed Global Design System (TryHolo-Inspired)

## 4.1 Token Direction

Proposed new token set direction:

```css
/* Core */
--mcl-bg-page: #0f1012;
--mcl-bg-elev-1: #17181b;
--mcl-bg-elev-2: #1f2125;
--mcl-border: #2e3238;
--mcl-border-soft: #252a30;

/* Text */
--mcl-text-primary: #f5f7fa;
--mcl-text-secondary: #c2c8d0;
--mcl-text-muted: #8f97a3;

/* Accent */
--mcl-accent-primary: #ee4454;
--mcl-accent-secondary: #3e86c6;
--mcl-accent-warm: #f05427;
--mcl-accent-brand: #a666aa;
--mcl-accent-pink: #ec4492;
--mcl-cta-gradient: linear-gradient(135deg, #ee4454 0%, #ec4492 100%);

/* UI */
--mcl-radius-sm: 10px;
--mcl-radius-md: 14px;
--mcl-radius-lg: 18px;
--mcl-radius-pill: 999px;
--mcl-shadow-card: 0 8px 30px rgba(0, 0, 0, 0.35);
--mcl-shadow-glow: 0 0 0 1px rgba(238, 68, 84, 0.2), 0 12px 30px rgba(238, 68, 84, 0.2);
```

## 4.2 Typography Direction

- Display: `Gabarito` (or closest available modern geometric sans).
- Body/UI: `Inter`.
- Utility/metrics/meta: `Fragment Mono` (or current mono fallback if needed).

Type behavior:

- Large short headlines.
- Tight subheader blocks.
- Mono usage for scores, counts, timestamps, and status labels.

## 4.3 Shell Direction

- Left sidebar becomes darker, slimmer, and more tactical.
- Main content uses stacked page sections with stronger contrast.
- Right assistant panel keeps fixed width but gets segmented tabs with stronger information hierarchy.
- All pages keep clear primary CTA in first viewport.

## 5) Full Section-by-Section Redesign Spec

## 5.1 Shared App Shell (All Authenticated Pages)

### Sidebar

- Add compact top brand strip with one-line product promise.
- Convert active nav style to solid/high-contrast block with subtle glow.
- Group nav into: Core Workflow, Intelligence, System.
- Add persistent "Quick Create" CTA pinned above user cluster.
- Add status pills for queued/running jobs at bottom.

### Page Header Pattern (Unified)

Every page should start with:

- Left: page title + one-line value statement.
- Middle: context chips (workspace, time range, status).
- Right: primary CTA + optional secondary action.

### Tactical Assistant Panel

- Keep 3 tabs but redesign to "Ask", "Insights", "Activity".
- Add small confidence score and freshness timestamp in header.
- Improve message styling with clearer user/assistant contrast.
- Add quick prompts as swipe chips instead of plain buttons.

## 5.2 Dashboard Page

Current role: command center.

Redesign sections:

1. Command Hero
- Short quantified headline, ex: "Ship 10 assets this week".
- Add top 3 KPIs in compact proof cards.

2. Pipeline Momentum Strip
- Replace funnel bars with clear stage progression cards.
- Show stage count, conversion rate, and blockage signal per stage.

3. Top Performer Spotlight
- Full-width performance feature card with clear "why it worked" bullets.

4. Tactical Feed
- Timeline style, each item with type badge + impact tag.

5. Action Launchpad
- Grid of high-priority actions with status (ready/running/failed).

## 5.3 Topics Page

Current role: discovery and prioritization.

Redesign sections:

1. Discovery Control Bar
- Put AI discover inputs inline with immediate generation CTA.
- Add niche and platform chips above board.

2. Swipe-to-Select Suggestion Deck
- Add TryHolo-style swipe workflow before kanban insertion.
- Actions: reject, save, evolve.

3. Priority Kanban
- Keep Discovered/Developing/Scripted columns.
- Add confidence, urgency, and opportunity badges per card.

4. Topic Detail Drawer
- Replace modal with side drawer for faster workflow continuity.

5. Table View
- Keep table but add sticky filters and quick batch actions.

## 5.4 Angles Page

Current role: contrast formula and angle generation.

Redesign sections:

1. Contrast Formula Canvas
- Two-column input with stronger visual contrast and helper examples.
- Add "auto refine" option per side.

2. Format Rail
- Format pills with icon + expected output type.

3. Angle Cards Grid
- Higher contrast cards with stronger angle score and estimated outcome.
- Add one-click promote-to-script action.

4. Drafts/Published Tabs
- Keep tabs but include counts, recency, and outcome summary.

## 5.5 Hooks Page

Current role: hook generation and refinement.

Redesign sections:

1. Hook Pattern Filter Matrix
- Turn pattern chips into grouped controls by intent (curiosity, proof, urgency).

2. Hook Deck
- Each card gets:
  - hook text (hero),
  - engagement score,
  - risk level,
  - "best use case" label.

3. Swipe Library
- Keep right rail but convert to compact "saved formulas" with quick insert.

4. Bulk Actions
- Add select-many and run refine in batch.

## 5.6 Scripts Page

Current role: long-form editing and AI rewriting.

Redesign sections:

1. Editor Command Bar
- Keep PDF export, history, share.
- Add visible "last saved" state and quality score.

2. Beat Navigator
- Keep left panel but simplify to tighter section cards and completion bars.

3. Main Editor Surface
- Use single strong reading column with clearer paragraph rhythm.
- Keep edit mode inline with richer diff preview before save.

4. AI Action Dock
- Keep rewrite/tone actions, add "generate variant" and "shorten".

5. Live Feedback
- Convert to a persistent diagnostic panel with actionable fixes.

## 5.7 Analytics Page

Current role: performance and bottleneck analysis.

Redesign sections:

1. Performance Hero
- Time range + run analysis + export in one row.
- Include delta badges (week over week).

2. Winner Cards
- Keep top performers but include reason tags (hook style, format, channel).

3. Pattern Performance
- Upgrade bars to comparative trend view with stronger legends.

4. Tactical Log Table
- Keep table, add filters and quick "turn insight into action" button.

5. Pipeline Health
- Convert side panel into stacked diagnostics with threshold colors.

## 5.8 Brain Page

Current role: knowledge model and guardrails.

Redesign sections:

1. Brain Overview Hero
- Status, sync freshness, and maturity score.

2. Persona Intelligence Card
- Structured persona with tags for pain points and buying triggers.

3. Guardrails
- Add severity filter and quick edit states.

4. Learned Insights Feed
- Timeline format with source and confidence.

5. Recon Intelligence Workspace
- Keep scraper/ripper tools, add job previews and output summaries.

6. Usage Meter
- Keep usage bar with threshold alerts and upgrade path.

## 5.9 Settings Page

Current role: workspace and system config.

Redesign sections:

1. Settings Hub Header
- Search + quick actions + save status.

2. Workspace Identity
- Cleaner inputs + helper text.

3. Team Management
- Roles and invites with clearer privilege labels.

4. Brand Voice Assets
- Upload area with stronger file states (queued/uploaded/failed).

5. API Keys
- Dedicated key cards with masked state and test connection action.

6. Platform Connections
- Add health and last sync badges.

## 5.10 Support Page

Current role: help, docs, bug report.

Redesign sections:

1. Support Action Grid
- Keep cards but increase contrast and action priority labels.

2. FAQ
- Move to accordion with search and category filters.

3. Escalation CTA
- Keep final email CTA with SLA expectation badge.

## 5.11 Login Page

Current role: entry and trust.

Redesign sections:

1. Left Trust Pane
- Add concise "what you get" bullets and proof stats.

2. Right Auth Card
- Keep social + email auth.
- Stronger CTA and cleaner toggle for sign-in/up.

3. Security Footnote
- Keep trust badges, simplify visual clutter.

## 5.12 Onboarding Page

Current role: first-time setup.

Redesign sections:

1. Step Progress Header
- Clear step count and expected completion time.

2. Single-focus Step Cards
- Keep one primary task per step.

3. Platform Selection
- Card-based selections with visual confirmation.

4. Completion Screen
- Add "what happens next" preview before redirect.

## 5.13 Legal Page

Current role: policy readability.

Redesign sections:

1. Minimal top bar with context.
2. Sticky terms/privacy switch.
3. Wider reading card with improved typography contrast.
4. In-page section jump list (optional enhancement).

## 6) Reusable Component Set to Build

Core components required for redesign consistency:

- `PageHero`
- `ProofStatRow`
- `KpiCard`
- `SectionCard`
- `SegmentedControl`
- `StatusPill`
- `ActionButtonPrimary`
- `ActionButtonSecondary`
- `SwipeDeck`
- `TimelineFeed`
- `DiagnosticPanel`
- `CommandTopBar`
- `EmptyStateBlock`

## 7) Motion and Interaction Rules

- Base transition: `180ms`.
- Card hover: `translateY(-2px)` + subtle glow.
- Section reveal on load: stagger `40ms`.
- Drawer and modal transitions: `220ms`.
- No unnecessary motion on dense tables.

## 8) Responsive Behavior

- Desktop `>=1280`: 3-pane layout (sidebar, main, assistant).
- Tablet `768-1279`: collapsible sidebar and collapsible assistant.
- Mobile `<768`: bottom nav for core routes, assistant as full-screen sheet.

Per-page requirement:

- Keep first CTA visible in first viewport.
- Avoid multi-column data grids on small widths without horizontal strategy.

## 9) Accessibility Requirements

- Minimum color contrast 4.5:1 for normal text.
- Keyboard navigation for all actionable controls.
- Focus ring visible and consistent.
- Reduced-motion mode respected.
- All status colors paired with text or icons, not color-only signals.

## 10) Rollout Plan (Implementation Phases)

Phase 1: Foundation

- Update token system and typography.
- Redesign shared shell (sidebar, header pattern, assistant panel).
- Build reusable components.

Phase 2: Core Workflow Pages

- `Dashboard`, `Topics`, `Angles`, `Hooks`, `Scripts`.

Phase 3: Intelligence and System Pages

- `Analytics`, `Brain`, `Settings`, `Support`.

Phase 4: Public Experience and Hardening

- `Login`, `Onboarding`, `Legal`.
- Accessibility pass, responsive pass, motion polish.

## 11) Acceptance Checklist

- Every route uses the new token system.
- Every page has a unified hero/header pattern.
- Primary CTA is obvious without scrolling.
- Data-heavy screens preserve readability at all breakpoints.
- Assistant panel styling and behavior is consistent across routes.
- No page keeps old pastel/glass visual defaults.
- Empty, loading, error states are designed for every major section.

## 12) Route-to-Redesign Mapping (Quick Matrix)

| Route | Primary Redesign Focus | Priority |
|---|---|---|
| `/` | Command hero, pipeline diagnostics, action launchpad | P0 |
| `/topics` | Discover + swipe + kanban optimization | P0 |
| `/angles` | Contrast canvas + angle scoring clarity | P0 |
| `/hooks` | Hook deck and filter architecture | P1 |
| `/scripts` | Editor hierarchy and AI action dock | P0 |
| `/analytics` | KPI readability + actionable diagnostics | P1 |
| `/brain` | Knowledge model transparency and recon UX | P1 |
| `/settings` | Configuration clarity and systems trust | P1 |
| `/support` | Faster self-serve and escalation path | P2 |
| `/login` | Trust + conversion-focused auth entry | P1 |
| `/onboarding` | Faster completion and clarity | P1 |
| `/legal` | Readability and structure | P2 |

