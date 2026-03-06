-- Add processed_auth_code column to prevent duplicate OAuth callback processing
-- Each auth_code from Alipay/WeChat can only be used once
-- This column acts as a lock to ensure idempotent processing

ALTER TABLE auth_sessions
ADD COLUMN IF NOT EXISTS processed_auth_code TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_sessions_processed_code
ON auth_sessions(processed_auth_code);

-- Add comment for documentation
COMMENT ON COLUMN auth_sessions.processed_auth_code IS
  'Stores the OAuth auth_code that was processed. Used for idempotency to prevent duplicate processing of the same callback.';
