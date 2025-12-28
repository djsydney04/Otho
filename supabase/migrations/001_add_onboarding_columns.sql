-- Migration: Add onboarding columns to users table
-- Run this in Supabase SQL Editor

-- Section A: Basics
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_location TEXT; -- renamed to avoid SQL keyword conflict
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_goals JSONB DEFAULT '[]'::jsonb;

-- Section B: Investing Context
ALTER TABLE users ADD COLUMN IF NOT EXISTS actively_investing TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invested_before BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS check_size TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deals_per_year TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stage_focus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector_focus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS geo_focus JSONB DEFAULT '[]'::jsonb;

-- Section C: Decision Style & Workflow
ALTER TABLE users ADD COLUMN IF NOT EXISTS decision_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS decision_speed TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sourcing_channels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biggest_pain TEXT;

-- Section D: Preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS discover_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_help_focus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_tone TEXT DEFAULT 'Concise';

-- Onboarding status tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'incomplete';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- RLS Policy: Users can only update their own onboarding data
-- (Assuming RLS is already enabled on users table)
-- If not, run: ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.uid() IS NULL);
