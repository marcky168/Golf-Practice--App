-- Run this in your Supabase SQL Editor to add the club bag feature
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_bag JSONB DEFAULT '[]'::jsonb;
