-- Fix RLS policies for payment_requests table
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can create their own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Admins can view all payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Admins can update payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can view own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can create payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Authenticated users can view all payments" ON payment_requests;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON payment_requests;

-- Create new simplified policies that work

-- Allow users to insert their own payment requests
CREATE POLICY "Users can insert own payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users to SELECT (admin check done in app)
CREATE POLICY "Authenticated can select all payments"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to UPDATE (admin check done in app)
CREATE POLICY "Authenticated can update all payments"
  ON payment_requests FOR UPDATE
  TO authenticated
  USING (true);
