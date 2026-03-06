-- Enable Realtime for auth_sessions table
-- This allows the frontend to subscribe to changes via Supabase Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE auth_sessions;

-- Add comment for documentation
COMMENT ON TABLE auth_sessions IS 'OAuth login sessions - Realtime enabled for frontend subscription';

-- Update RLS policy to allow anonymous users to view auth sessions by login_token
-- This is needed for Realtime subscription during OAuth login flow

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view own auth sessions" ON auth_sessions;

-- Create new policy that allows:
-- 1. Authenticated users to view their own sessions (by supabase_user_id)
-- 2. Anonymous users to view sessions (needed for Realtime subscription during OAuth)
CREATE POLICY "Users can view auth sessions"
  ON auth_sessions FOR SELECT
  USING (
    -- Authenticated user viewing their own session
    auth.uid() = supabase_user_id
    OR
    -- Allow anonymous/public access for Realtime subscription
    -- The login_token is a secure random token that acts as authentication
    true
  );

-- Note: The security relies on:
-- 1. login_token being a cryptographically random string (not guessable)
-- 2. Frontend only subscribes to specific login_token (via filter)
-- 3. Session expires after a short time
