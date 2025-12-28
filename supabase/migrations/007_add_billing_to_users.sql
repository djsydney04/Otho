-- Migration: Add billing & custom fields tables
-- This allows quick access to user tier without joining billing_info
-- Also adds company_custom_fields table for dynamic company data

-- ============================================
-- BILLING INFO TABLE
-- ============================================

-- Ensure billing_info table exists (in case migration 002 hasn't run)
CREATE TABLE IF NOT EXISTS billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'hobby', -- hobby, angel, fund
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT, -- active, canceled, past_due, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on billing_info if not already enabled
ALTER TABLE billing_info ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist (migration 002 may have created them with different names)
DO $$
BEGIN
  -- Drop existing policies if they exist (to avoid conflicts)
  DROP POLICY IF EXISTS "Users can view own billing" ON billing_info;
  DROP POLICY IF EXISTS "Users can update own billing" ON billing_info;
  DROP POLICY IF EXISTS "Users can insert own billing" ON billing_info;
  DROP POLICY IF EXISTS "Users can view own billing info" ON billing_info;
  DROP POLICY IF EXISTS "Users can update own billing info" ON billing_info;
  DROP POLICY IF EXISTS "Users can insert own billing info" ON billing_info;
  
  -- Create new policies
  CREATE POLICY "Users can view own billing info" ON billing_info
    FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert own billing info" ON billing_info
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own billing info" ON billing_info
    FOR UPDATE USING (auth.uid() = user_id);
END $$;

-- Add billing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS billing_tier TEXT DEFAULT 'hobby' CHECK (billing_tier IN ('hobby', 'angel', 'fund')),
ADD COLUMN IF NOT EXISTS billing_status TEXT CHECK (billing_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_billing_tier ON users(billing_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Function to sync billing info to users table
CREATE OR REPLACE FUNCTION sync_billing_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users table when billing_info changes
  UPDATE users
  SET 
    billing_tier = NEW.plan,
    billing_status = NEW.subscription_status,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically sync billing_info to users
DROP TRIGGER IF EXISTS trigger_sync_billing_to_users ON billing_info;
CREATE TRIGGER trigger_sync_billing_to_users
  AFTER INSERT OR UPDATE ON billing_info
  FOR EACH ROW
  EXECUTE FUNCTION sync_billing_to_users();

-- Backfill existing billing data to users table
-- Map old plan values (free/pro/enterprise) to new ones (hobby/angel/fund)
UPDATE users u
SET 
  billing_tier = CASE 
    WHEN b.plan IN ('free', 'hobby') THEN 'hobby'
    WHEN b.plan = 'pro' THEN 'angel'
    WHEN b.plan = 'enterprise' THEN 'fund'
    ELSE COALESCE(b.plan, 'hobby')
  END,
  billing_status = b.subscription_status,
  stripe_customer_id = b.stripe_customer_id,
  stripe_subscription_id = b.stripe_subscription_id
FROM billing_info b
WHERE u.id = b.user_id;

-- Also update billing_info plan values to match new schema if they're old values
UPDATE billing_info
SET plan = CASE 
  WHEN plan = 'free' THEN 'hobby'
  WHEN plan = 'pro' THEN 'angel'
  WHEN plan = 'enterprise' THEN 'fund'
  ELSE plan
END
WHERE plan IN ('free', 'pro', 'enterprise');

-- Add comment for documentation
COMMENT ON COLUMN users.billing_tier IS 'User subscription tier: hobby, angel, or fund. Synced from billing_info.';
COMMENT ON COLUMN users.billing_status IS 'Stripe subscription status. Synced from billing_info.';
COMMENT ON FUNCTION sync_billing_to_users() IS 'Automatically syncs billing_info changes to users table for faster tier lookups.';

-- ============================================
-- COMPANY CUSTOM FIELDS TABLE
-- ============================================

-- Create table for dynamic custom fields on companies
CREATE TABLE IF NOT EXISTS company_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT DEFAULT 'text', -- text, url, email, date, number
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_company_custom_fields_company_id ON company_custom_fields(company_id);

-- Enable RLS
ALTER TABLE company_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can manage custom fields for companies they own
CREATE POLICY "Users can view own company custom fields" ON company_custom_fields
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_custom_fields.company_id AND companies.owner_id = auth.uid())
  );

CREATE POLICY "Users can insert own company custom fields" ON company_custom_fields
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_custom_fields.company_id AND companies.owner_id = auth.uid())
  );

CREATE POLICY "Users can update own company custom fields" ON company_custom_fields
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_custom_fields.company_id AND companies.owner_id = auth.uid())
  );

CREATE POLICY "Users can delete own company custom fields" ON company_custom_fields
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_custom_fields.company_id AND companies.owner_id = auth.uid())
  );

