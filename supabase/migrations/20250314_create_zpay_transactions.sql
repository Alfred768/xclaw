-- ZPay Transactions Table
-- Stores payment transaction records for ZPay integration

CREATE TABLE IF NOT EXISTS zpay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment identifiers
  out_trade_no TEXT NOT NULL UNIQUE,  -- Internal order number
  trade_no TEXT,                       -- ZPay transaction number

  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('alipay', 'wxpay')),
  product_name TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),

  -- Idempotency lock (prevents duplicate webhook processing)
  processed_trade_no TEXT UNIQUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  callback_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX idx_zpay_transactions_user_id ON zpay_transactions(user_id);
CREATE INDEX idx_zpay_transactions_out_trade_no ON zpay_transactions(out_trade_no);
CREATE INDEX idx_zpay_transactions_status ON zpay_transactions(status);
CREATE INDEX idx_zpay_transactions_created_at ON zpay_transactions(created_at);

-- Row Level Security (RLS)
ALTER TABLE zpay_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON zpay_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access"
  ON zpay_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
