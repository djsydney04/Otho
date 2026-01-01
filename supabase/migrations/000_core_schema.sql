-- ============================================
-- CORE SCHEMA MIGRATION
-- ============================================
-- This migration creates the foundational tables for the Otho application
-- Run this FIRST before any other migrations

-- ============================================
-- ENUMS
-- ============================================

-- Stage enum for company pipeline
CREATE TYPE stage AS ENUM ('Inbound', 'Qualified', 'Diligence', 'Committed', 'Passed');

-- Comment type enum
CREATE TYPE comment_type AS ENUM ('note', 'call', 'meeting', 'email', 'system');

-- ============================================
-- USERS TABLE
-- ============================================
-- Extended user profile linked to auth.users

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  initials TEXT,
  
  -- Onboarding fields
  onboarding_status TEXT DEFAULT 'incomplete',
  onboarding_step INTEGER DEFAULT 0,
  onboarding_completed_at TIMESTAMPTZ,
  
  -- Profile/preferences
  role TEXT,
  user_location TEXT,
  signup_source TEXT,
  primary_goals TEXT[],
  
  -- Investment preferences
  actively_investing TEXT,
  invested_before BOOLEAN,
  check_size TEXT,
  deals_per_year TEXT,
  stage_focus TEXT[],
  sector_focus TEXT[],
  geo_focus TEXT[],
  
  -- Decision making
  decision_factors TEXT[],
  decision_speed TEXT,
  sourcing_channels TEXT[],
  biggest_pain TEXT,
  
  -- AI preferences
  discover_topics TEXT[],
  ai_help_focus TEXT[],
  ai_tone TEXT,
  
  -- Google OAuth tokens
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  
  -- Billing (synced from billing_info)
  billing_tier TEXT DEFAULT 'hobby',
  billing_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FOUNDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  additional_emails TEXT[],
  role_title TEXT,
  location TEXT,
  linkedin TEXT,
  twitter TEXT,
  avatar_url TEXT,
  previous_companies TEXT,
  education TEXT,
  bio TEXT,
  domain_expertise TEXT[],
  source TEXT,
  warm_intro_path TEXT,
  notes TEXT,
  is_priority BOOLEAN DEFAULT false,
  needs_followup BOOLEAN DEFAULT false,
  followup_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMPANIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  description TEXT,
  stage stage NOT NULL DEFAULT 'Inbound',
  founder_name TEXT, -- Legacy, prefer founder_id
  founder_email TEXT, -- Legacy, prefer founder_id
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  owner UUID, -- Legacy, prefer owner_id
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_touch TIMESTAMPTZ,
  logo_url TEXT,
  is_priority BOOLEAN DEFAULT false,
  needs_followup BOOLEAN DEFAULT false,
  needs_diligence BOOLEAN DEFAULT false,
  followup_date TIMESTAMPTZ,
  ai_analysis TEXT,
  ai_analysis_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE
);

-- ============================================
-- COMPANY_TAGS (Junction Table)
-- ============================================

CREATE TABLE IF NOT EXISTS company_tags (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);

-- ============================================
-- COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  comment_type comment_type DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FOUNDER_COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS founder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  comment_type comment_type DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CALENDAR_EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  google_event_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees JSONB,
  html_link TEXT,
  meet_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL_THREADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  gmail_thread_id TEXT,
  gmail_message_id TEXT,
  subject TEXT,
  snippet TEXT,
  from_name TEXT,
  from_email TEXT,
  to_email TEXT,
  email_date TIMESTAMPTZ,
  labels JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DRIVE_DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS drive_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  google_file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  web_view_link TEXT,
  icon_link TEXT,
  thumbnail_link TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT TABLES (for Otho AI)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  proposed_action JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NEWS_ARTICLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_name TEXT,
  source_url TEXT,
  author TEXT,
  description TEXT,
  content TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  category TEXT,
  relevance_score NUMERIC,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_portfolio_relevant BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- NOTION_PAGES TABLE (Optional Integration)
-- ============================================

CREATE TABLE IF NOT EXISTS notion_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  founder_id UUID REFERENCES founders(id) ON DELETE SET NULL,
  notion_page_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  cover_url TEXT,
  parent_type TEXT,
  parent_id TEXT,
  last_edited_time TIMESTAMPTZ,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FOUNDER_CUSTOM_FIELDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS founder_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Founders
CREATE INDEX IF NOT EXISTS idx_founders_email ON founders(email);
CREATE INDEX IF NOT EXISTS idx_founders_name ON founders(name);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_founder_id ON companies(founder_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Tags
CREATE INDEX IF NOT EXISTS idx_company_tags_company_id ON company_tags(company_id);
CREATE INDEX IF NOT EXISTS idx_company_tags_tag_id ON company_tags(tag_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_company_id ON comments(company_id);
CREATE INDEX IF NOT EXISTS idx_founder_comments_founder_id ON founder_comments(founder_id);

-- Calendar
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_company_id ON calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- Email
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_company_id ON email_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_gmail_thread_id ON email_threads(gmail_thread_id);

-- Drive
CREATE INDEX IF NOT EXISTS idx_drive_documents_user_id ON drive_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_documents_company_id ON drive_documents(company_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_id ON chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);

-- News
CREATE INDEX IF NOT EXISTS idx_news_articles_company_id ON news_articles(company_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);

-- Custom fields
CREATE INDEX IF NOT EXISTS idx_founder_custom_fields_founder_id ON founder_custom_fields(founder_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_founders_updated_at BEFORE UPDATE ON founders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drive_documents_updated_at BEFORE UPDATE ON drive_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notion_pages_updated_at BEFORE UPDATE ON notion_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_founder_custom_fields_updated_at BEFORE UPDATE ON founder_custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SYNC FUNCTION: auth.users -> public.users
-- ============================================

CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_created();

