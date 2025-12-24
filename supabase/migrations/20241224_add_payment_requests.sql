-- Payment Requests Table for tracking subscription payments
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  phone_number TEXT,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment requests
CREATE POLICY "Users can view own payment requests"
  ON payment_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own payment requests
CREATE POLICY "Users can create payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow all authenticated users to view all (for admin check in app)
CREATE POLICY "Authenticated users can view all payments"
  ON payment_requests FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow all authenticated users to update (admin check done in app)
CREATE POLICY "Authenticated users can update payments"
  ON payment_requests FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);
