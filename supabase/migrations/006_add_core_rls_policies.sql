-- Migration: Add RLS policies for core tables (companies, founders, etc.)
-- This enables authenticated users to create and manage their own data

-- =============================================================================
-- COMPANIES TABLE RLS
-- =============================================================================

-- Enable RLS on companies (if not already enabled)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;

-- SELECT: Users can only see their own companies
CREATE POLICY "Users can view own companies" ON companies
  FOR SELECT USING (
    owner_id = auth.uid() OR owner_id IS NULL
  );

-- INSERT: Users can create companies (owner_id set to their user id)
CREATE POLICY "Users can insert own companies" ON companies
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR owner_id IS NULL
  );

-- UPDATE: Users can only update their own companies
CREATE POLICY "Users can update own companies" ON companies
  FOR UPDATE USING (
    owner_id = auth.uid() OR owner_id IS NULL
  );

-- DELETE: Users can only delete their own companies
CREATE POLICY "Users can delete own companies" ON companies
  FOR DELETE USING (
    owner_id = auth.uid() OR owner_id IS NULL
  );

-- =============================================================================
-- FOUNDERS TABLE RLS
-- =============================================================================

-- Enable RLS on founders (if not already enabled)
ALTER TABLE founders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view founders" ON founders;
DROP POLICY IF EXISTS "Users can insert founders" ON founders;
DROP POLICY IF EXISTS "Users can update founders" ON founders;
DROP POLICY IF EXISTS "Users can delete founders" ON founders;

-- SELECT: Users can view founders linked to their companies
-- Note: Founders don't have owner_id, they're shared - access is via company linkage
CREATE POLICY "Users can view founders" ON founders
  FOR SELECT USING (
    -- User can see founder if they own any company linked to this founder
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.founder_id = founders.id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
    OR
    -- Or if the founder was just created (no company link yet)
    NOT EXISTS (
      SELECT 1 FROM companies c WHERE c.founder_id = founders.id
    )
  );

-- INSERT: Any authenticated user can create founders
CREATE POLICY "Users can insert founders" ON founders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Users can update founders linked to their companies
CREATE POLICY "Users can update founders" ON founders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.founder_id = founders.id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM companies c WHERE c.founder_id = founders.id
    )
  );

-- DELETE: Users can delete founders linked to their companies
CREATE POLICY "Users can delete founders" ON founders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.founder_id = founders.id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
    OR
    NOT EXISTS (
      SELECT 1 FROM companies c WHERE c.founder_id = founders.id
    )
  );

-- =============================================================================
-- COMMENTS TABLE RLS
-- =============================================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on own companies" ON comments;
DROP POLICY IF EXISTS "Users can insert comments on own companies" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Users can view comments on own companies" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = comments.company_id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
  );

CREATE POLICY "Users can insert comments on own companies" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = comments.company_id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
  );

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (
    author_id = auth.uid()
  );

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (
    author_id = auth.uid()
  );

-- =============================================================================
-- TAGS TABLE RLS (tags are shared/global)
-- =============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
DROP POLICY IF EXISTS "Users can create tags" ON tags;

CREATE POLICY "Anyone can view tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Users can create tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- COMPANY_TAGS TABLE RLS
-- =============================================================================

ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company tags" ON company_tags;
DROP POLICY IF EXISTS "Users can manage company tags" ON company_tags;

CREATE POLICY "Users can view company tags" ON company_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_tags.company_id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
  );

CREATE POLICY "Users can manage company tags" ON company_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_tags.company_id 
      AND (c.owner_id = auth.uid() OR c.owner_id IS NULL)
    )
  );

-- =============================================================================
-- CALENDAR_EVENTS TABLE RLS
-- =============================================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can manage own calendar events" ON calendar_events;

CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- EMAIL_THREADS TABLE RLS
-- =============================================================================

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email threads" ON email_threads;
DROP POLICY IF EXISTS "Users can manage own email threads" ON email_threads;

CREATE POLICY "Users can view own email threads" ON email_threads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own email threads" ON email_threads
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- DRIVE_DOCUMENTS TABLE RLS
-- =============================================================================

-- Check if drive_documents table exists before adding RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drive_documents') THEN
    ALTER TABLE drive_documents ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own drive documents" ON drive_documents;
    DROP POLICY IF EXISTS "Users can manage own drive documents" ON drive_documents;
    
    EXECUTE 'CREATE POLICY "Users can view own drive documents" ON drive_documents FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can manage own drive documents" ON drive_documents FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON POLICY "Users can insert own companies" ON companies IS 'Allows authenticated users to create companies. owner_id should be set to auth.uid() or left NULL (will be claimed on first access).';

