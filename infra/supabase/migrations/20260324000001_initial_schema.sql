-- ============================================================
-- MCL Database Schema
-- Multi-tenant content pipeline data store
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Core: Workspaces & Users
-- ============================================================

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    deleted_at  TIMESTAMPTZ,  -- Soft delete: NULL = active, non-NULL = deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,  -- bcrypt hash of the API key
    key_prefix TEXT NOT NULL,  -- First 8 chars for identification
    name TEXT NOT NULL DEFAULT 'Default',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Pipeline: Agent Brain
-- ============================================================

CREATE TABLE brains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',  -- Full AgentBrain JSON
    version INTEGER NOT NULL DEFAULT 1,  -- Optimistic lock version (integer, not semver)
    updated_by UUID,                     -- User or system actor who last modified
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One brain per workspace
);

-- Brain Audit Log (append-only change history)
CREATE TABLE brain_audit_log (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    section TEXT NOT NULL,
    diff JSONB NOT NULL,              -- JSON Merge Patch (RFC 7396)
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key')),
    actor_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brain_audit_workspace ON brain_audit_log(workspace_id, version DESC);

-- ============================================================
-- Pipeline: Topics
-- ============================================================

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,  -- e.g., topic_20260324_001
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source JSONB NOT NULL DEFAULT '{}',
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scoring JSONB NOT NULL DEFAULT '{}',
    pillars TEXT[] DEFAULT '{}',
    competitor_coverage JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'developing', 'scripted', 'published', 'analyzed', 'passed')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_topics_workspace ON topics(workspace_id);
CREATE INDEX idx_topics_status ON topics(workspace_id, status);
CREATE INDEX idx_topics_discovered ON topics(workspace_id, discovered_at DESC);

-- ============================================================
-- Pipeline: Angles
-- ============================================================

CREATE TABLE angles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    format TEXT NOT NULL,  -- longform | shortform | linkedin
    title TEXT DEFAULT '',
    contrast JSONB NOT NULL DEFAULT '{}',
    target_audience TEXT DEFAULT '',
    pain_addressed TEXT DEFAULT '',
    proof_method TEXT DEFAULT '',
    funnel_direction JSONB DEFAULT '{}',
    competitor_angles JSONB DEFAULT '[]',
    content_job TEXT DEFAULT '',
    blocker_destroyed TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_angles_workspace ON angles(workspace_id);
CREATE INDEX idx_angles_topic ON angles(topic_id);
CREATE INDEX idx_angles_status ON angles(workspace_id, status);

-- ============================================================
-- Pipeline: Hooks
-- ============================================================

CREATE TABLE hooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    angle_id UUID REFERENCES angles(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    pattern TEXT NOT NULL,
    hook_text TEXT NOT NULL,
    visual_cue TEXT DEFAULT '',
    score JSONB NOT NULL DEFAULT '{}',
    cta_pairing TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    performance JSONB DEFAULT NULL,
    source TEXT DEFAULT 'original',
    swipe_reference TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_hooks_workspace ON hooks(workspace_id);
CREATE INDEX idx_hooks_angle ON hooks(angle_id);
CREATE INDEX idx_hooks_pattern ON hooks(workspace_id, pattern);

-- ============================================================
-- Pipeline: Scripts
-- ============================================================

CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    angle_id UUID REFERENCES angles(id) ON DELETE SET NULL,
    hook_ids UUID[] DEFAULT '{}',
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    script_structure JSONB DEFAULT NULL,
    filming_cards JSONB DEFAULT '[]',
    shortform_structure JSONB DEFAULT NULL,
    estimated_duration TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'filming', 'published', 'analyzed', 'archived')),
    performance JSONB DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_scripts_workspace ON scripts(workspace_id);
CREATE INDEX idx_scripts_status ON scripts(workspace_id, status);

-- ============================================================
-- Pipeline: Analytics Entries
-- ============================================================

CREATE TABLE analytics_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    content_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    days_since_publish INT DEFAULT 0,
    metrics JSONB NOT NULL DEFAULT '{}',
    thumbnail JSONB DEFAULT NULL,
    hook_pattern_used TEXT DEFAULT '',
    topic_category TEXT DEFAULT '',
    content_pillar TEXT DEFAULT '',
    is_winner BOOLEAN DEFAULT false,
    winner_reason TEXT DEFAULT '',
    winner_metrics JSONB DEFAULT NULL,
    collection_method TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_analytics_workspace ON analytics_entries(workspace_id);
CREATE INDEX idx_analytics_content ON analytics_entries(content_id);
CREATE INDEX idx_analytics_winners ON analytics_entries(workspace_id, is_winner) WHERE is_winner = true;

-- ============================================================
-- Pipeline: Insights
-- ============================================================

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',  -- Full Insight JSON
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)
);

-- ============================================================
-- Pipeline: Swipe Hooks
-- ============================================================

-- MCL ships with ~50 curated seed hooks (is_system=true) across niches.
-- Every new workspace inherits seed hooks on creation.
-- After onboarding, a background recon job auto-populates niche-specific swipe hooks.
CREATE TABLE swipe_hooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    hook_text TEXT NOT NULL,
    pattern TEXT NOT NULL,
    why_it_works TEXT NOT NULL,
    competitor TEXT NOT NULL,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    engagement JSONB NOT NULL DEFAULT '{}',
    competitor_angle TEXT DEFAULT '',
    topic_keywords TEXT[] DEFAULT '{}',
    source_video_title TEXT DEFAULT '',
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_count INT DEFAULT 0,
    is_system BOOLEAN DEFAULT false,  -- true = curated seed hook, false = user/recon generated
    visual_hook JSONB DEFAULT NULL,
    notes TEXT DEFAULT '',
    UNIQUE(workspace_id, external_id)
);

CREATE INDEX idx_swipe_hooks_workspace ON swipe_hooks(workspace_id);
CREATE INDEX idx_swipe_hooks_pattern ON swipe_hooks(workspace_id, pattern);

-- ============================================================
-- Recon: Competitor Data
-- ============================================================

CREATE TABLE competitor_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    shortcode TEXT NOT NULL,
    url TEXT NOT NULL,
    video_url TEXT DEFAULT '',
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    caption TEXT DEFAULT '',
    posted_at TIMESTAMPTZ,
    profile JSONB DEFAULT '{}',
    competitor_handle TEXT NOT NULL,
    platform TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, shortcode)
);

CREATE INDEX idx_reels_workspace ON competitor_reels(workspace_id);
CREATE INDEX idx_reels_competitor ON competitor_reels(workspace_id, competitor_handle);

-- ============================================================
-- Recon: Skeleton Reports
-- ============================================================

CREATE TABLE skeleton_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    skeletons JSONB NOT NULL DEFAULT '[]',
    synthesis JSONB DEFAULT NULL,
    report_markdown TEXT DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | complete | failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_workspace ON skeleton_reports(workspace_id);

-- ============================================================
-- Recon: Tracker State (duplicate prevention, from GVB tracker.py)
-- ============================================================

CREATE TABLE recon_tracker_state (
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL,
    handle          TEXT NOT NULL,
    last_content_id TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen_urls       TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE(workspace_id, platform, handle)
);

CREATE INDEX idx_recon_tracker_lookup ON recon_tracker_state(workspace_id, platform, handle);

-- ============================================================
-- Recon: Assets & Collections (from GVB storage/database.py)
-- ============================================================

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    content_path TEXT,
    preview TEXT,
    metadata JSONB,
    starred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_type ON assets(workspace_id, type);
CREATE INDEX idx_assets_starred ON assets(workspace_id, starred) WHERE starred = true;

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_collections (
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (asset_id, collection_id)
);

-- ============================================================
-- Jobs: Background job tracking
-- ============================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,  -- discover | recon | angle | script | analyze | rescore
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | complete | failed
    progress JSONB DEFAULT '{}',
    result JSONB DEFAULT NULL,
    error TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX idx_jobs_status ON jobs(workspace_id, status);

-- ============================================================
-- Jobs: Dead Letter Queue (auto-retry failed jobs)
-- ============================================================

CREATE TABLE dead_letter_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    error TEXT NOT NULL,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    original_params JSONB NOT NULL DEFAULT '{}',
    auto_retry_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_auto_retries INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'pending_retry' CHECK (status IN ('pending_retry', 'retrying', 'permanent_failure'))
);

CREATE INDEX idx_dlq_workspace ON dead_letter_jobs(workspace_id);
CREATE INDEX idx_dlq_status ON dead_letter_jobs(status);
CREATE INDEX idx_dlq_retry_at ON dead_letter_jobs(auto_retry_at) WHERE status = 'pending_retry';

-- ============================================================
-- Plans (admin-configurable, database-driven)
-- ============================================================

CREATE TABLE plans (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    TEXT UNIQUE NOT NULL,
    display_name            TEXT NOT NULL,
    ai_calls_per_day        INT NOT NULL DEFAULT 20,
    ai_tokens_per_month     BIGINT NOT NULL DEFAULT 1000000,
    ai_max_tokens_per_call  INT NOT NULL DEFAULT 4096,
    discover_runs_per_day   INT NOT NULL DEFAULT 3,
    max_competitors         INT NOT NULL DEFAULT 2,
    max_workspaces          INT NOT NULL DEFAULT 1,
    max_team_members        INT NOT NULL DEFAULT 1,
    platforms_allowed       TEXT[] NOT NULL DEFAULT '{youtube,instagram}',
    features                JSONB NOT NULL DEFAULT '{}',
    price_monthly_cents     INT NOT NULL DEFAULT 0,
    price_yearly_cents      INT NOT NULL DEFAULT 0,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly  TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Workspace Connections (platform OAuth / API key storage)
-- ============================================================

CREATE TABLE workspace_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('api_key', 'oauth', 'session')),
    credentials_encrypted JSONB,  -- encrypted via Supabase Vault
    key_source TEXT CHECK (key_source IN ('user_provided', 'mcl_provided')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, platform)
);
CREATE INDEX idx_connections_workspace ON workspace_connections(workspace_id);
CREATE INDEX idx_connections_status ON workspace_connections(status) WHERE status = 'expired';

-- ============================================================
-- Subscriptions (Stripe billing)
-- ============================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id)  -- One active subscription per workspace
);
CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ============================================================
-- Workspace Access Grants (creator-controlled agency permissions)
-- ============================================================

CREATE TABLE workspace_access_grants (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,  -- Child workspace (creator)
    grantee_workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,  -- Parent workspace (agency)
    -- Read permissions
    can_read_topics     BOOLEAN NOT NULL DEFAULT false,
    can_read_angles     BOOLEAN NOT NULL DEFAULT false,
    can_read_scripts    BOOLEAN NOT NULL DEFAULT false,
    can_read_analytics  BOOLEAN NOT NULL DEFAULT false,
    can_read_brain      BOOLEAN NOT NULL DEFAULT false,
    -- Write permissions
    can_edit_topics     BOOLEAN NOT NULL DEFAULT false,
    can_edit_scripts    BOOLEAN NOT NULL DEFAULT false,
    -- Action permissions
    can_trigger_discover BOOLEAN NOT NULL DEFAULT false,
    can_trigger_analyze  BOOLEAN NOT NULL DEFAULT false,
    -- Metadata
    granted_by   UUID NOT NULL REFERENCES auth.users(id),
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ,  -- NULL = active, non-NULL = revoked
    UNIQUE(workspace_id, grantee_workspace_id)
);

CREATE INDEX idx_grants_workspace ON workspace_access_grants(workspace_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_grants_grantee ON workspace_access_grants(grantee_workspace_id) WHERE revoked_at IS NULL;

-- ============================================================
-- Workspace Usage (tracks consumption against plan limits)
-- ============================================================

CREATE TABLE workspace_usage (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    period                  TEXT NOT NULL,
    ai_calls_today          INT NOT NULL DEFAULT 0,
    ai_calls_today_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()) + interval '1 day',
    ai_tokens_this_month    BIGINT NOT NULL DEFAULT 0,
    discover_runs_today     INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, period)
);

CREATE INDEX idx_workspace_usage_lookup ON workspace_usage(workspace_id, period);

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_workspaces_updated BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_brains_updated BEFORE UPDATE ON brains FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_topics_updated BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_angles_updated BEFORE UPDATE ON angles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_hooks_updated BEFORE UPDATE ON hooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_scripts_updated BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_plans_updated BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_workspace_usage_updated BEFORE UPDATE ON workspace_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
