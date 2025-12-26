-- Fix RLS policies for profiles table to allow admin updates
-- Run this in Supabase SQL Editor

-- First, let's check if we need to add policies for admin updates
-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated can update profiles" ON profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to update any profile (admin check done in app)
-- This is needed for admin to approve subscriptions
CREATE POLICY "Authenticated can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to view all profiles (for admin)
CREATE POLICY "Authenticated can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
