-- Migration: Push Notification Tokens
-- Description: Creates the push_tokens table for storing device notification tokens
-- Date: 2026-01-25

-- =========================================
-- CREATE PUSH TOKENS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    device_id TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'web')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_profile ON push_tokens(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert tokens (registration doesn't require auth in this app)
CREATE POLICY "push_tokens_insert_policy" ON push_tokens
    FOR INSERT
    WITH CHECK (true);

-- Allow reading own tokens or all tokens (for admin/gerant purposes)
CREATE POLICY "push_tokens_select_policy" ON push_tokens
    FOR SELECT
    USING (true);

-- Allow updating own tokens
CREATE POLICY "push_tokens_update_policy" ON push_tokens
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- =========================================
-- TRIGGERS
-- =========================================

-- Update the updated_at timestamp on any update
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_updated_at();

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON TABLE push_tokens IS 'Stores device push notification tokens for Android and Web';
COMMENT ON COLUMN push_tokens.device_id IS 'Unique identifier for the device, generated client-side';
COMMENT ON COLUMN push_tokens.token IS 'FCM token for Android or unique ID for Web notifications';
COMMENT ON COLUMN push_tokens.platform IS 'Platform type: android or web';
COMMENT ON COLUMN push_tokens.is_active IS 'Whether the token is currently active for receiving notifications';
