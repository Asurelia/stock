-- Migration: Create user_permissions table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_profile_id, permission_key)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow all access (adjust as needed)
CREATE POLICY "Allow all access to user_permissions" ON user_permissions
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_permissions_updated_at();
