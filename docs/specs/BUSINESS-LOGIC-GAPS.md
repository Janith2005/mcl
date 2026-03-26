# MCL Business Logic Gap Analysis

**Date:** 2026-03-24
**Scope:** PRD.md, DESIGN.md, IMPLEMENTATION-PLAN.md, GVB agent-brain.json
**Author:** Strategic Review

---

## Gap Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 11 |
| Medium | 10 |
| Low | 5 |
| **Total** | **33** |

---

## 1. Value Proposition Gaps

### GAP-01: GVB-to-MCL Upgrade Justification is Weak for CLI Power Users
- **Severity:** Critical
- **Category:** Value Proposition
- **Description:** The PRD's hybrid AI model explicitly states CLI users bring their own Claude session at zero cost to MCL. GVB is open-source and already provides all 7 pipeline stages. The docs never articulate a compelling reason for a Claude Code power user (Persona C) to pay for MCL when they already get the full pipeline for free via GVB + their own Claude subscription.
- **Impact:** The most technically sophisticated segment — the one most likely to evangelize MCL — has no reason to pay. They get identical pipeline functionality locally. The web dashboard, team features, and analytics history are not enough for solo CLI users.
- **Recommended Fix:** Define CLI-exclusive paid value: (1) cloud-synced brain that persists across machines, (2) cross-creator benchmark data only available to MCL subscribers (network effect), (3) scheduled analytics collection that runs without the user's machine being on, (4) priority access to new pipeline stages before they ship as open-source commands. Make clear what CLI users gain that they cannot replicate locally.

### GAP-02: The "Evolving Brain" Moat is Easily Replicable
- **Severity:** High
- **Category:** Value Proposition
- **Description:** The agent brain is a JSON file with ICP data, hook preferences, and performance patterns. The "evolution" logic is straightforward: increment weights on winning hook patterns, adjust learning weights based on analytics. Any developer who reads the GVB source can replicate this in a weekend. The PRD claims the feedback loop depth is "hard to replicate" but the scoring engine uses simple keyword matching and hardcoded weight thresholds.
- **Impact:** No durable moat. A competitor could clone GVB, add a web UI, and match MCL's brain evolution in weeks.
- **Recommended Fix:** The real moat must be (1) network-effect data — anonymized cross-creator benchmarks that improve everyone's scoring (Phase 2 feature, but must be architected from day one), (2) proprietary prompt engineering in the Contrast Formula and HookGenie that is NOT open-sourced (currently the prompts live in `.claude/commands/` markdown files, fully visible), (3) the accumulated brain data itself — once a creator has 6+ months of evolved brain, switching cost is real. Quantify this switching cost in onboarding.

### GAP-03: No Articulated "10x Moment" — What Makes Someone Say "I Need This"
- **Severity:** High
- **Category:** Value Proposition
- **Description:** The PRD tracks time-to-first-discovery (< 24h) and time-to-first-script (< 72h) but never defines what the "aha moment" is. Is it seeing a perfectly scored topic list? Is it the first Contrast Formula angle that surprises them? Is it the first time the brain evolution suggests a hook pattern they hadn't considered?
- **Impact:** Without a defined activation moment, onboarding UX will be built by guessing. Product-led growth requires a clear "aha" that you engineer users toward.
- **Recommended Fix:** Define the activation moment explicitly: "The user runs their first discovery, sees topics scored against their ICP, and realizes the system understands their niche better than they expected." Build the onboarding flow to guarantee this happens within 15 minutes of signup. Measure it with a specific PostHog event.

---

## 2. Pricing & Monetization Logic Gaps

### GAP-04: No Value Metric Defined — Pricing is Entirely Placeholder
- **Severity:** Critical
- **Category:** Pricing
- **Description:** Both Pro and Agency tiers say "TBD" for price. More critically, the docs never decide on a value metric. Is the user paying for discovery runs? AI calls? Workspaces? The feature flag table gates multiple dimensions simultaneously (jobs/day, AI calls/day, workspaces, team members, competitors monitored, analytics history). This creates a "Swiss cheese" model where users hit random limits unpredictably.
- **Impact:** Users will encounter friction at whichever limit they hit first, and it may not correlate with the value they're getting. A creator who does 4 discoveries/day but never uses team features hits the free limit on the wrong axis.
- **Recommended Fix:** Choose ONE primary value metric. The strongest candidate is **workspaces** (maps to creators managed, scales naturally for agencies, simple for solopreneurs to understand). Gate generously on other dimensions. Secondary gating should be on analytics history (30 days free vs unlimited paid) — this creates natural upgrade pressure as the brain's value increases over time and free users lose their history.

### GAP-05: Free Tier May Be Too Generous (Freemium Trap)
- **Severity:** High
- **Category:** Pricing
- **Description:** Free tier includes all 7 pipeline stages, 3 discovery jobs/day, 20 AI calls/day, and 1 workspace. For a solo creator posting 1 video/day, 3 discoveries and 20 AI calls are sufficient for their entire workflow. The only meaningful limits for a solo creator are 2 competitors monitored and 30-day analytics history.
- **Impact:** Solo creators (Persona A and B — the primary market) can run the full pipeline indefinitely on the free tier. Only agencies and multi-workspace users have a reason to upgrade. The 5% free-to-paid conversion target may be optimistic.
- **Recommended Fix:** Either (1) reduce free AI calls to 10/day (enough to try one full pipeline run but not enough for daily use), (2) limit free discovery to keyword-only (no competitor scraping — this is the most valuable feature), or (3) add a 14-day full-featured trial that degrades to restricted free tier. The 30-day analytics history is a good constraint but takes 30 days to feel the pinch — too late.

### GAP-06: Agency Pricing Model is Unspecified
- **Severity:** High
- **Category:** Pricing
- **Description:** Agency tier shows 20 workspaces and 25 team members at "TBD" price. The docs don't address: Is it flat rate? Per-workspace? Per-seat? Does the agency pay for all child workspaces, or does each creator have their own billing? What happens when an agency needs 21 workspaces — is there an enterprise tier?
- **Impact:** Agencies are the highest-value segment (B2B recurring revenue). Without a clear model, you can't validate willingness-to-pay during design.
- **Recommended Fix:** Model as **base fee + per-creator-workspace**. Agency base covers the parent workspace + 5 child workspaces + unlimited seats. Each additional child workspace is a per-workspace fee (e.g., $X/workspace/month). This scales with the agency's revenue (more clients = more workspaces = more MCL fees) and aligns MCL's growth with the agency's growth. Seats should be unlimited within a tier — gating on seats punishes growing teams for collaborating.

### GAP-07: CLI BYOK Users Have Zero Revenue Path
- **Severity:** Critical
- **Category:** Pricing
- **Description:** The hybrid AI model means CLI users cost MCL $0 in AI spend and also pay MCL $0 in revenue. The PRD identifies this as a feature ("zero cost to MCL") but doesn't address that these users also generate zero revenue. The CLI is positioned as a launch channel (Claude Code community) but there's no mechanism to convert CLI users to paying customers.
- **Impact:** If 80% of early adopters use CLI (likely, given the Claude Code community distribution), MCL could have thousands of active users and zero revenue.
- **Recommended Fix:** CLI users must still authenticate with MCL for: (1) brain cloud sync, (2) analytics collection, (3) cross-creator benchmarks. These cloud features require an MCL account and are subject to tier limits. The CLI becomes a free acquisition channel that funnels users into the MCL ecosystem, where cloud-dependent features drive conversion. Alternatively, the CLI could be a paid product ($X/month) that includes pipeline updates and brain sync.

---

## 3. User Acquisition & Retention Logic Gaps

### GAP-08: No Acquisition Strategy Beyond "Launch Channels"
- **Severity:** High
- **Category:** Acquisition
- **Description:** The GTM section lists: Product Hunt, Claude Code marketplace, creator communities (Skool, Twitter/X), and a marketing site. There's no content marketing plan, no referral program, no partnership strategy, no paid acquisition budget, and no community-building plan. For a tool built by a creator-founder with an existing audience, the docs don't mention leveraging Yogi's "Acceleration Guy" brand.
- **Impact:** Without a deliberate acquisition engine, MCL relies entirely on organic discovery. Product Hunt gives a one-day spike. The Claude Code marketplace is niche. Creator communities are saturated with tool launches.
- **Recommended Fix:** (1) Build-in-public content from Yogi using MCL on his own content creates authentic case studies. (2) Add a referral program: creators who refer others get extended free tier limits. (3) Partner with creator cohort programs (On Deck, Skool groups) for distribution. (4) Create a "MCL-powered" badge that creators can optionally display, creating organic awareness. (5) Use GVB's open-source community as top-of-funnel — GVB users who outgrow local are the natural MCL upgrade path.

### GAP-09: Retention Hook is Unclear — Why Come Back After First Pipeline Run?
- **Severity:** Critical
- **Category:** Retention
- **Description:** A creator can run discover -> angle -> script -> publish in one session and have a week's worth of content. The feedback loop (analyze -> brain evolves -> better discover) requires multiple publish cycles, which means weeks of waiting. The docs don't address what brings a user back between publish cycles.
- **Impact:** High churn risk. The tool is most valuable at the start (content ideation) and then has a dead zone until analytics are meaningful. Users may churn in the gap.
- **Recommended Fix:** (1) Add a content calendar/scheduling view (currently out of scope for v1 — reconsider this decision) that gives users a reason to return daily. (2) Push notifications: "Your video from last week has analytics ready — your brain has new insights." (3) Competitor monitoring alerts: "Your competitor just posted about a topic in your pillar — here's an angle." (4) Weekly brain digest email: "Here's what your brain learned this week." These create recurring engagement touchpoints between publish cycles.

### GAP-10: Feedback Loop Requires 5+ Content Cycles to Show Value
- **Severity:** High
- **Category:** Retention
- **Description:** The GVB analyze command requires "at least 5 pieces analyzed" before weight adjustments happen. Hook preference updates need "50%+ win rate for boosts, 0% with 3+ uses for penalties." For a creator posting weekly, this means 5+ weeks before the brain evolution becomes visible.
- **Impact:** Most users will churn before experiencing the feedback loop. The "trainable AI" differentiator is invisible for over a month.
- **Recommended Fix:** (1) Seed the brain with niche-specific benchmarks on signup (e.g., "creators in the AI/tech niche typically see these hook patterns perform best"). (2) Reduce the minimum threshold from 5 to 3 for initial adjustments. (3) Show a "brain intelligence score" that visually progresses with each content cycle, giving users a gamified reason to continue. (4) Show projected improvements: "Based on your first 2 analyses, your brain is on track to improve topic relevance by X% after 5 more cycles."

---

## 4. Multi-tenancy Business Logic Gaps

### GAP-11: No Creator Portability — What Happens When a Creator Leaves an Agency?
- **Severity:** High
- **Category:** Multi-tenancy
- **Description:** The B2B model creates child workspaces under a parent agency workspace. The docs don't address: Who owns the child workspace data (brain, topics, scripts, analytics) if the creator-client relationship ends? Can the agency transfer a workspace to the creator? Can a creator export their brain and import it into their own MCL account?
- **Impact:** Data ownership ambiguity creates legal liability and customer dissatisfaction. Agencies won't adopt MCL if they can't guarantee client data portability. Creators won't consent to agencies managing their brand data without export rights.
- **Recommended Fix:** Define clear ownership: (1) The brain, topics, and scripts belong to the creator identity (whoever's ICP/pillars are in the brain). (2) Agencies have a "managed access" license while the relationship is active. (3) On termination, the workspace can be "detached" from the parent and converted to a standalone creator workspace. (4) GDPR data export endpoint (mentioned in security) must work at the workspace level, not just the account level.

### GAP-12: No Multi-Agency Support for Creators
- **Severity:** Medium
- **Category:** Multi-tenancy
- **Description:** The model assumes one parent workspace owns child workspaces. It doesn't address whether a creator can belong to multiple agencies (e.g., one for YouTube, one for LinkedIn) or have both a personal workspace and an agency-managed workspace.
- **Impact:** Real-world agency relationships are messy. A creator might switch agencies or work with multiple specialized agencies. The current model forces a binary ownership.
- **Recommended Fix:** Allow workspaces to exist independently of the parent-child hierarchy. Agencies "link" to existing workspaces with permission grants rather than "owning" child workspaces. This is architecturally cleaner and avoids the ownership problem entirely.

### GAP-13: Agency Aggregate Dashboard Has No Defined Metrics
- **Severity:** Medium
- **Category:** Multi-tenancy
- **Description:** The PRD says the parent workspace dashboard shows "aggregate metrics across all children" but never specifies what metrics. Is it total content produced? Average engagement? Brain evolution progress? Revenue attribution?
- **Impact:** Agencies buy tools that help them prove ROI to clients. Without defined aggregate metrics, the agency dashboard is a feature checkbox, not a value driver.
- **Recommended Fix:** Define agency dashboard metrics: (1) Content production velocity per creator, (2) average topic score trending over time (brain getting smarter), (3) hook pattern win rates across all creators (cross-pollination opportunity), (4) pipeline stage completion rates (which creators are stuck), (5) total content published and aggregate engagement metrics.

---

## 5. Competitive Positioning Gaps

### GAP-14: Competitive Landscape is Dismissed as "Unknown"
- **Severity:** Critical
- **Category:** Competitive
- **Description:** The PRD's market gap section mentions Jasper, Copy.ai, TubeBuddy, VidIQ, and Metricool but frames them as two separate camps without analyzing overlap. It ignores direct competitors: Taplio (LinkedIn AI content), Castmagic (podcast-to-content repurposing), Opus Clip (AI video editing), Lately.ai (AI content repurposing), ContentStudio (multi-platform management), and Vista Social. Business risks table rates "competitor launches similar SaaS" as only "Medium" likelihood.
- **Impact:** Entering the market without competitive intelligence is exactly the problem MCL is supposed to solve for its users. If MCL can't do competitive analysis on its own market, the product's credibility is undermined.
- **Recommended Fix:** Create a proper competitive matrix. Map each competitor's features against MCL's 7 pipeline stages. Identify where MCL is genuinely unique (the brain evolution + Contrast Formula + multi-platform pipeline in one tool) vs. where competitors are stronger (video editing, scheduling, publishing). Use this to sharpen positioning: MCL is not a content management tool — it's a content intelligence system.

### GAP-15: The Contrast Formula is Undifferentiated in Marketing
- **Severity:** Medium
- **Category:** Competitive
- **Description:** The Contrast Formula (common belief -> surprising truth) is a specific, branded methodology. But the PRD treats it as just one feature among many. This is potentially the strongest differentiator — it's an intellectual framework, not just a software feature.
- **Impact:** Without elevating the Contrast Formula as a branded methodology (like "Jobs to Be Done" or "Blue Ocean Strategy"), MCL is competing on features where bigger, better-funded tools will eventually match it.
- **Recommended Fix:** Position the Contrast Formula as MCL's intellectual property — the core methodology that makes MCL's content systematically more engaging. Create educational content around it. Make it the thing people associate with MCL. "MCL uses the Contrast Formula" should be as recognizable as "Basecamp uses Shape Up."

---

## 6. Content Ownership & Legal Gaps

### GAP-16: No Terms of Service for AI-Generated Content IP
- **Severity:** Critical
- **Category:** Legal
- **Description:** The docs specify security requirements, GDPR compliance, and data isolation but never address who owns the IP of AI-generated scripts, hooks, and angles. When MCL's Anthropic API key generates a script for a user, the ownership chain is: Anthropic model -> MCL's API key -> user's workspace. Anthropic's own terms grant users commercial rights to outputs, but MCL is the API subscriber, not the end user.
- **Impact:** Without clear terms, a legal dispute over AI-generated content could expose MCL to liability. Agencies generating content for clients need explicit IP assignment.
- **Recommended Fix:** Terms of Service must state: (1) All AI-generated content produced within a user's workspace is the user's property. (2) MCL retains no ownership or license to user-generated content. (3) MCL may use anonymized, aggregated data (never specific content) for model improvement. (4) For agency workspaces, the workspace owner (agency) and the creator-client determine IP ownership between themselves — MCL is not a party to that arrangement.

### GAP-17: Competitor Scraping as a SaaS is Legally Riskier Than Individual Use
- **Severity:** High
- **Category:** Legal
- **Description:** GVB uses yt-dlp to download YouTube videos for transcription and instaloader for Instagram scraping. As an individual tool, this falls under personal use and fair use arguments. As a SaaS with paying customers, MCL is commercially facilitating scraping at scale. The hiQ v. LinkedIn precedent protects public data scraping, but YouTube's TOS explicitly prohibits downloading, and Meta actively fights scraping tools.
- **Impact:** A cease-and-desist from Google/Meta could force removal of core features (competitor transcription, Instagram recon). This would gut the discovery pipeline.
- **Recommended Fix:** (1) For YouTube: pivot to YouTube Data API for metadata + official transcript API (many videos have auto-captions accessible via API) instead of yt-dlp downloads. (2) For Instagram: invest in Graph API integration as primary (not fallback) and sunset instaloader for SaaS use. (3) Add Terms of Service requiring users to comply with platform terms. (4) Implement rate limiting that prevents abuse. (5) Consult a lawyer specializing in web scraping before launch.

### GAP-18: GDPR Implementation is Checkbox-Level, Not Architecture-Level
- **Severity:** Medium
- **Category:** Legal
- **Description:** The security table lists "Data export endpoint, workspace deletion cascade, privacy policy" for GDPR compliance. But GDPR requires more: right to explanation (how AI decisions are made about their content), data processing agreements for agencies acting as data processors, legitimate interest basis for storing competitor data (which includes third-party personal data), and cookie consent for the web dashboard.
- **Impact:** A GDPR complaint from an EU user or a competitor whose data is being stored could result in fines and forced architecture changes.
- **Recommended Fix:** (1) Add a data processing agreement template for agencies. (2) Implement right-to-explanation: when the brain suggests a topic or hook, show the scoring factors. (3) Define retention policies for competitor data (auto-purge after X days). (4) Add cookie consent (PostHog requires it). (5) Store competitor data as aggregated insights, not raw personal profiles, where possible.

---

## 7. Pipeline Logic Gaps

### GAP-19: Scoring Engine is Too Simplistic for Cross-Niche Accuracy
- **Severity:** High
- **Category:** Pipeline
- **Description:** The scoring engine uses keyword matching against ICP segments, pain points, and goals. Scoring bands are: 0 matches = 4, 1-2 = 6, 3-5 = 7, 6-9 = 8, 10+ = 9. Content gap scoring starts at base 6, +2 for pillar keyword match. These are hardcoded thresholds that work for Yogi's "Acceleration Guy" niche because the brain was tuned for it. A fitness creator, a B2B SaaS marketer, and a cooking channel would all score differently with the same logic.
- **Impact:** Users in niches with different vocabulary patterns (e.g., healthcare, fashion, education) will get inaccurate scores, eroding trust in MCL's intelligence.
- **Recommended Fix:** (1) Replace hardcoded thresholds with percentile-based scoring that adapts to each brain's keyword density. (2) Add semantic similarity scoring using embeddings (Anthropic or OpenAI embeddings API) rather than exact keyword matching. (3) Allow users to calibrate scores: "This topic scored 6 but I'd rate it 9" — use this to train per-brain scoring adjustments. (4) Phase 2's "ML-assisted pattern detection" should be accelerated as it directly addresses this.

### GAP-20: Brain Has No Decay Mechanism for Inactive Users
- **Severity:** Medium
- **Category:** Pipeline
- **Description:** The brain accumulates performance patterns and hook preferences over time. But if a user stops creating content for 3 months and returns, their brain reflects a content landscape that no longer exists. Trends shift, platform algorithms change, and competitor strategies evolve. The brain has no concept of recency weighting or data freshness.
- **Impact:** Returning users get stale recommendations. The brain's "evolved" state could actively produce worse suggestions than a fresh start.
- **Recommended Fix:** (1) Add a `last_active` timestamp to the brain and a "freshness score" that decays weights toward neutral over time. (2) When a user returns after 30+ days of inactivity, trigger a "brain refresh" flow that re-runs competitor discovery and adjusts weights. (3) Show a UI indicator: "Your brain was last trained on [date]. Run a discovery to refresh." (4) Implement exponential decay: recent analytics data is weighted more heavily than old data.

### GAP-21: Single-Creator Pipeline Doesn't Address Shared Resources in Multi-Workspace
- **Severity:** Medium
- **Category:** Pipeline
- **Description:** GVB's pipeline assumes one brain, one ICP, one set of competitors. In MCL's multi-workspace model, an agency might manage 5 creators in the same niche (e.g., 5 fitness influencers). Each runs competitor discovery independently, potentially scraping the same YouTube channels 5 times and consuming 5x the API quota.
- **Impact:** Wasted API quota, duplicate work, and higher costs. For agencies managing creators in overlapping niches, this is a significant inefficiency.
- **Recommended Fix:** (1) Add a shared competitor cache at the account level (not workspace level). If workspace A scraped @competitor yesterday, workspace B gets the cached result. (2) Implement a "competitor pool" for agency parent workspaces that child workspaces draw from. (3) Track API usage at the account level, not just workspace level, to prevent quota exhaustion.

---

## 8. Platform & Channel Logic Gaps

### GAP-22: YouTube API Quota is a Hard Ceiling That Doesn't Scale
- **Severity:** Critical
- **Category:** Platform
- **Description:** YouTube Data API v3 has a 10,000 units/day quota. Each search costs 100 units. If MCL uses a single API key, 100 discovery jobs = quota exhausted. The PRD mentions "per-workspace quota tracking, intelligent caching, quota pooling across off-peak workspaces" but doesn't explain how. You can't pool a hard ceiling — 10,000 units is 10,000 units regardless of when you use them.
- **Impact:** At scale, MCL simply cannot perform YouTube discovery for all users. This is a hard blocker for growth beyond ~100 daily active discoverers.
- **Recommended Fix:** (1) Require users to bring their own YouTube API key (BYOK) for the free tier. MCL provides a pooled key for Pro/Agency users. (2) Apply for YouTube API quota increase (Google grants these for legitimate SaaS products). (3) Implement aggressive caching: if 50 users all monitor @GregIsenberg, cache his channel data and serve from cache. (4) Shift competitor monitoring to a scheduled background job (once per day per competitor, not per user request) and serve cached results. (5) Price the Pro tier to cover the cost of additional API key projects.

### GAP-23: Instagram Strategy Relies on Tools That Break Regularly
- **Severity:** High
- **Category:** Platform
- **Description:** The PRD acknowledges instaloader breaks frequently (High likelihood) and mitigates with "Graph API as primary with instaloader fallback." But the Graph API requires Instagram Business/Creator accounts and approved Facebook app review. The current GVB implementation uses instaloader as primary, not Graph API. This means the SaaS launch would ship with a known-unreliable dependency.
- **Impact:** Paying customers expect reliability. If Instagram discovery breaks for a week (common with instaloader), customer satisfaction and retention suffer.
- **Recommended Fix:** (1) Do not launch Instagram scraping as a paid feature until Graph API integration is built and tested. (2) If instaloader is the only available method, label Instagram as "beta" with no SLA. (3) Explore Apify's Instagram scraper as an intermediate reliability layer (paid, but more resilient than raw instaloader). (4) Build the architecture so channels can be gracefully degraded — if Instagram is down, discovery still works on YouTube + Reddit.

### GAP-24: LinkedIn via Apify is a Single Point of Failure
- **Severity:** Medium
- **Category:** Platform
- **Description:** LinkedIn is a key platform for Yogi's ICP (trapped operators, B2B founders). The PRD marks it for v1.5 via Apify. Apify is a third-party scraping platform with its own pricing, rate limits, and reliability. If Apify raises prices, changes their LinkedIn actor, or gets blocked by LinkedIn, MCL has no fallback.
- **Impact:** LinkedIn is arguably the most important platform for MCL's primary persona. Dependency on a single third-party scraping provider is a business risk.
- **Recommended Fix:** (1) Budget for Apify costs in the Pro/Agency tier pricing. (2) Build an abstraction layer so the LinkedIn channel can swap providers (Apify, Phantombuster, or direct API if LinkedIn ever opens up). (3) For v1.0, support LinkedIn as a manual input channel (users paste post URLs) rather than automated scraping.

### GAP-25: No Fallback Strategy When All AI Providers Are Down
- **Severity:** Medium
- **Category:** Platform
- **Description:** Web users depend on MCL's Anthropic API key with OpenAI as fallback. If both Anthropic and OpenAI have outages simultaneously (rare but possible), the entire content generation pipeline stops. CLI users are unaffected (they use their own Claude), creating a two-class user experience.
- **Impact:** Paid web users are the revenue-generating segment. An AI outage means they're paying for a service that doesn't work.
- **Recommended Fix:** (1) Queue AI requests during outages and process when service resumes. (2) Ensure non-AI pipeline stages (scoring, deduplication, competitor data retrieval) still work during AI outages. (3) Add a status page showing AI provider health. (4) Consider adding Google Gemini as a third fallback provider.

---

## 9. Additional Structural Gaps

### GAP-26: No Content Scheduling or Calendar (Explicitly Out of Scope But Retention-Critical)
- **Severity:** High
- **Category:** Retention
- **Description:** The PRD explicitly puts "Content calendar / scheduling" in the out-of-scope table for v1, planned for v1.5. But the retention analysis (GAP-09) shows this is the primary mechanism for daily engagement. Without a calendar, MCL is a batch tool (run pipeline -> get content -> leave) rather than a daily workspace.
- **Impact:** Users open MCL only when they need new content ideas, not as part of their daily workflow. This drives high churn between content cycles.
- **Recommended Fix:** Reconsider for v1.0. Even a simple "planned content" view that shows: (1) scripts in progress, (2) scripts ready to film, (3) published content awaiting analytics, (4) analytics ready for review — would give users a reason to check MCL daily. This is not a full calendar/scheduling feature; it's a pipeline status board.

### GAP-27: No Integration Story — MCL Lives in Isolation
- **Severity:** Medium
- **Category:** Product
- **Description:** MCL generates scripts but doesn't integrate with where creators actually work: Google Docs (writing), Notion (content planning), CapCut/DaVinci (video editing), Descript (transcription), or social scheduling tools (Buffer, Hootsuite, Later). The MCP server is planned for v1.5 but no other integrations are mentioned.
- **Impact:** MCL is a standalone tool that requires manual copy-paste to connect with the rest of a creator's workflow. This reduces stickiness.
- **Recommended Fix:** (1) Add Notion integration for v1.0 (export scripts to Notion database). (2) Add Google Docs export. (3) Build a Zapier/Make trigger so power users can automate MCL into their existing workflows. (4) Prioritize the MCP server — it makes MCL composable with AI-native workflows.

### GAP-28: Phase Sequencing Risk — Agency Features Before Solo Product-Market Fit
- **Severity:** Medium
- **Category:** Strategy
- **Description:** The implementation plan builds feature flag infrastructure (Phase 1), multi-tenancy workspace model (Phase 1), and team roles (Phase 1) before validating that solo creators will pay for the product. Agency features (Phase 3: v2.0) are planned before solo creator PMF is proven.
- **Impact:** Engineering effort spent on multi-tenancy and team features delays the core solo creator experience. If solo creators don't adopt MCL, agency features are irrelevant.
- **Recommended Fix:** (1) Ship a minimal workspace model in Phase 1 (single workspace per account, no teams). (2) Defer multi-tenancy, team roles, and agency features entirely until 100+ paying solo creators validate PMF. (3) Spend the freed-up engineering time on retention features (content status board, notifications, brain intelligence visualization).

### GAP-29: PostHog Feature Flags vs Database Feature Flags — Dual System
- **Severity:** Low
- **Category:** Technical
- **Description:** The PRD uses PostHog for product analytics and mentions feature flags. The implementation uses database-stored feature flags in the `FEATURE_FLAGS` dict. This creates a dual system where some flags are in PostHog (A/B tests, rollouts) and others are in the database (tier gating).
- **Impact:** Confusion about which system is authoritative for feature access. Potential for flags to drift between systems.
- **Recommended Fix:** Use PostHog for experimentation flags (A/B tests, gradual rollouts) and the database for billing/tier flags. Document the boundary clearly.

### GAP-30: No Onboarding Completion Incentive
- **Severity:** Medium
- **Category:** Activation
- **Description:** The PRD targets >70% onboarding completion (all 9 brain sections within 7 days). The GVB onboarding is a 9-section interactive session that takes 20-30 minutes. In a web UI, users will abandon a 9-step form. There's no incentive to complete all sections.
- **Impact:** Incomplete brains produce poor scoring and irrelevant recommendations, leading to a bad first impression and immediate churn.
- **Recommended Fix:** (1) Allow users to start with a minimal brain (identity + ICP + 1 pillar) and progressively prompt for additional sections. (2) Show a "brain completeness" percentage with clear benefits for each section: "Add competitors to unlock competitor gap analysis in Discovery." (3) Pre-fill sections using AI: scrape the user's existing social profiles to suggest ICP, pillars, and competitors.

### GAP-31: No Defined SLA or Uptime Commitment
- **Severity:** Low
- **Category:** Operations
- **Description:** The docs specify technical infrastructure (Railway/Fly.io, Vercel, Supabase) but no uptime target, SLA, or incident response plan. For a tool that helps creators with time-sensitive content (trending topics), downtime means missed opportunities.
- **Impact:** Paying customers expect reliability. Without an SLA, MCL cannot serve enterprise agencies.
- **Recommended Fix:** Define an uptime target (99.5% for v1.0). Implement a status page (using Instatus or Betteruptime). Define incident response: who is on-call, what's the response time, how are users notified.

### GAP-32: No Data Backup and Recovery Strategy
- **Severity:** Low
- **Category:** Operations
- **Description:** Supabase provides daily backups on paid plans, but the docs don't address: backup frequency, recovery time objective (RTO), recovery point objective (RPO), or disaster recovery for Redis (ephemeral by default).
- **Impact:** Loss of user brain data is catastrophic — it represents months of evolution. Redis data loss means job queue state is lost.
- **Recommended Fix:** (1) Supabase Pro plan includes daily backups with point-in-time recovery — document this. (2) Add brain data versioning (keep last 10 brain states, allowing rollback). (3) Use Redis persistence (RDB + AOF) for the job queue.

### GAP-33: No Localization or Multi-Language Support Consideration
- **Severity:** Low
- **Category:** Product
- **Description:** The agent brain, scoring engine, and all prompts assume English-language content. Yogi's ICP includes Manchester-based operators but the broader creator market is global. The Contrast Formula prompts, hook patterns, and CTA templates are English-only.
- **Impact:** Limits addressable market. Non-English creators cannot use MCL effectively.
- **Recommended Fix:** Low priority for v1.0 but architect for it: (1) Add a `language` field to the brain. (2) Use it to select prompt templates. (3) Ensure the scoring engine's keyword matching works with the brain's language, not hardcoded English keywords. No need to build this for launch, but don't create architecture that prevents it.

---

## Priority Recommendations (Top 5 Actions)

1. **Define the value metric and pricing before building billing** (GAP-04, GAP-06, GAP-07). Workspace-based pricing with generous secondary limits. CLI users must authenticate with MCL for cloud features.

2. **Tighten the free tier to drive conversion** (GAP-05). Reduce free AI calls, gate competitor scraping behind Pro, or add a time-limited trial.

3. **Build the retention engine into v1.0** (GAP-09, GAP-26). A content pipeline status board is not a calendar feature — it's the difference between a batch tool and a daily workspace.

4. **Solve YouTube API scaling before launch** (GAP-22). BYOK for free tier, pooled keys for paid, aggressive caching of competitor data. This is an architectural decision that must be made in Phase 1.

5. **Get legal advice on scraping-as-a-SaaS** (GAP-17). The transition from individual tool to commercial SaaS changes the legal risk profile. Pivot to official APIs where possible, label scraping features as beta.

---

*End of analysis. 33 gaps identified across 9 categories.*
