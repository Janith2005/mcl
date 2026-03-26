-- ============================================================
-- Row-Level Security Policies
-- Users can only access data in workspaces they belong to
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_hooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE skeleton_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_tracker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_access_grants ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND accepted_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces: members can read, owners can update
CREATE POLICY workspace_select ON workspaces FOR SELECT USING (is_workspace_member(id) AND deleted_at IS NULL);
CREATE POLICY workspace_insert ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY workspace_delete ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace members: members can read their workspace's members
CREATE POLICY members_select ON workspace_members FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY members_insert ON workspace_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);
CREATE POLICY members_delete ON workspace_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
);

-- Generic workspace-scoped policies for all data tables
-- Pattern: SELECT/INSERT/UPDATE/DELETE all require workspace membership

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'brains', 'topics', 'angles', 'hooks', 'scripts',
            'analytics_entries', 'insights', 'swipe_hooks', 'competitor_reels',
            'skeleton_reports', 'recon_tracker_state', 'assets', 'collections', 'jobs',
            'plans', 'workspace_usage', 'workspace_connections', 'subscriptions',
            'dead_letter_jobs', 'workspace_access_grants'
        ])
    LOOP
        EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT USING (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE USING (is_workspace_member(workspace_id))', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE USING (is_workspace_member(workspace_id))', tbl, tbl);
    END LOOP;
END
$$;

-- API keys: users can only manage their own
CREATE POLICY apikeys_select ON api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY apikeys_insert ON api_keys FOR INSERT WITH CHECK (user_id = auth.uid() AND is_workspace_member(workspace_id));
CREATE POLICY apikeys_delete ON api_keys FOR DELETE USING (user_id = auth.uid());

-- Asset collections: inherit from assets
CREATE POLICY ac_select ON asset_collections FOR SELECT USING (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
CREATE POLICY ac_insert ON asset_collections FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
CREATE POLICY ac_delete ON asset_collections FOR DELETE USING (
    EXISTS (SELECT 1 FROM assets WHERE id = asset_id AND is_workspace_member(workspace_id))
);
