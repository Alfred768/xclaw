-- Migration: Add yunwu_api_key to user_profiles
-- Date: 2025-03-15

-- Add yunwu_api_key column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS yunwu_api_key TEXT;

-- Create index for API key lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_yunwu_api_key ON user_profiles(yunwu_api_key) WHERE yunwu_api_key IS NOT NULL;

-- Comment
COMMENT ON COLUMN user_profiles.yunwu_api_key IS 'Yunwu AI API key for the user';
