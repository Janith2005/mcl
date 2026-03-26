-- No seed data for production. Workspaces are created via the API.
-- This file is a placeholder for development seed data.

-- Seed plans (required for workspace creation)
INSERT INTO plans (name, display_name, ai_calls_per_day, ai_tokens_per_month, ai_max_tokens_per_call, discover_runs_per_day, max_competitors, max_workspaces, max_team_members, platforms_allowed, price_monthly_cents, sort_order) VALUES
('free', 'Free', 20, 1000000, 4096, 3, 2, 1, 1, '{youtube,instagram}', 0, 0),
('pro', 'Pro', 100, 10000000, 8192, 20, 10, 3, 3, '{youtube,instagram,tiktok,reddit,linkedin}', 2900, 1),
('agency', 'Agency', 500, 50000000, 16384, 100, 50, 20, 20, '{youtube,instagram,tiktok,reddit,linkedin,hackernews}', 9900, 2);

-- Example for local dev (uncomment when needed):
-- INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'dev@mcl.dev');
-- INSERT INTO workspaces (id, name, slug, owner_id) VALUES ('ws-dev-001', 'Dev Workspace', 'dev', '00000000-0000-0000-0000-000000000001');
-- INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at) VALUES ('ws-dev-001', '00000000-0000-0000-0000-000000000001', 'owner', now());
