-- Migration: Create api_keys and usage_quotas tables for Account Management
-- Date: 2025-03-07

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create usage_quotas table
CREATE TABLE IF NOT EXISTS usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_tokens_quota BIGINT DEFAULT 100000,
  tokens_used BIGINT DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  billing_cycle_end TIMESTAMPTZ,
  reset_policy TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage api keys"
  ON api_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on usage_quotas
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usage_quotas
CREATE POLICY "Users can view own quota"
  ON usage_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
  ON usage_quotas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON usage_quotas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage quotas"
  ON usage_quotas FOR ALL
  USING (auth.role() = 'service_role');

-- Update handle_new_user function to also create usage_quotas record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, preferences)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->'preferences' || '{}'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create usage_quotas record for new user
  INSERT INTO public.usage_quotas (user_id, total_tokens_quota, tokens_used, billing_cycle_start, billing_cycle_end)
  VALUES (
    NEW.id,
    100000,
    0,
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_id ON usage_quotas(user_id);
