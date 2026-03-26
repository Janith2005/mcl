-- ============================================================
-- Feedback: In-app user feedback collection
-- ============================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    page TEXT DEFAULT '',
    rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY feedback_insert_own ON feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY feedback_select_own ON feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role (admin) can read all feedback
-- (service_role bypasses RLS by default, but explicit policy for clarity)
CREATE POLICY feedback_admin_select ON feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.user_id = auth.uid()
            AND workspace_members.role = 'owner'
        )
    );
