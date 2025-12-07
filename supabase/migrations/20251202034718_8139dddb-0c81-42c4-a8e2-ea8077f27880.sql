-- Add currency preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD'));