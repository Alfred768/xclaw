-- Migration: Add subscription and trial fields to user_profiles
-- Date: 2025-03-15

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Update subscription_tier to include new values
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_subscription_tier_check
CHECK (subscription_tier IN ('free', 'monthly', 'yearly', 'pro', 'enterprise'));

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends_at ON user_profiles(trial_ends_at) WHERE is_trial = true;

-- Function to start trial for new users
CREATE OR REPLACE FUNCTION start_user_trial()
RETURNS trigger AS $$
BEGIN
  -- Set trial period for new users (3 days)
  UPDATE public.user_profiles
  SET
    is_trial = true,
    trial_ends_at = NOW() + INTERVAL '3 days',
    subscription_tier = 'free'
  WHERE id = NEW.id;

  -- Update usage quota for trial users
  UPDATE public.usage_quotas
  SET
    total_tokens_quota = 100000,  -- 100K tokens for trial
    billing_cycle_start = NOW(),
    billing_cycle_end = NOW() + INTERVAL '3 days'
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to start trial when user is created
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION start_user_trial();

-- Function to handle subscription upgrade
CREATE OR REPLACE FUNCTION upgrade_user_subscription(
  p_user_id UUID,
  p_plan_type TEXT,
  p_duration_months INTEGER DEFAULT 1
)
RETURNS json AS $$
DECLARE
  v_tokens_quota BIGINT;
  v_subscription_ends TIMESTAMPTZ;
  v_result json;
BEGIN
  -- Calculate tokens and end date based on plan
  CASE p_plan_type
    WHEN 'monthly' THEN
      v_tokens_quota := 1000000;  -- 1M tokens
      v_subscription_ends := NOW() + (p_duration_months || ' months')::interval;
    WHEN 'yearly' THEN
      v_tokens_quota := 100000000;  -- 100M tokens
      v_subscription_ends := NOW() + '1 year'::interval;
    ELSE
      v_tokens_quota := 100000;  -- 100K tokens (default)
      v_subscription_ends := NOW() + '1 month'::interval;
  END CASE;

  -- Update user profile
  UPDATE public.user_profiles
  SET
    subscription_tier = p_plan_type::text,
    is_trial = false,
    trial_ends_at = NULL,
    subscription_ends_at = v_subscription_ends
  WHERE id = p_user_id
  AND subscription_tier IN ('free', 'monthly', 'yearly', 'pro', 'enterprise');

  -- Update usage quota
  UPDATE public.usage_quotas
  SET
    total_tokens_quota = v_tokens_quota,
    tokens_used = 0,
    billing_cycle_start = NOW(),
    billing_cycle_end = v_subscription_ends
  WHERE user_id = p_user_id;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'subscription_tier', p_plan_type,
    'tokens_quota', v_tokens_quota,
    'subscription_ends_at', v_subscription_ends
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON COLUMN user_profiles.is_trial IS 'Whether user is in trial period';
COMMENT ON COLUMN user_profiles.trial_ends_at IS 'When the trial period ends';
COMMENT ON COLUMN user_profiles.subscription_ends_at IS 'When the current subscription ends';
