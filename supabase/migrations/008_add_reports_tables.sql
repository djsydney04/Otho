-- Migration: Add reports and report sources tables
-- This enables AI-generated deal reports and investment memos

-- ============================================
-- REPORTS TABLE
-- ============================================

-- Create enum for report types
CREATE TYPE report_type AS ENUM ('deal_closed', 'investment_memo', 'custom');

-- Create enum for report status
CREATE TYPE report_status AS ENUM ('pending', 'generating', 'completed', 'failed');

-- Main reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type report_type NOT NULL DEFAULT 'deal_closed',
  status report_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  
  -- Report content sections (stored as JSONB for flexibility)
  content JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  generated_at TIMESTAMPTZ,
  error_message TEXT,
  generation_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ============================================
-- REPORT SOURCES TABLE
-- ============================================

-- Table to track sources used in report generation
CREATE TABLE IF NOT EXISTS report_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Source metadata
  source_type TEXT NOT NULL, -- 'internal', 'web', 'company_profile', 'founder_profile', 'comment', 'ai_analysis'
  source_id TEXT, -- ID of internal source (company_id, founder_id, comment_id, etc.)
  source_url TEXT, -- URL for web sources
  title TEXT,
  snippet TEXT,
  
  -- Citation tracking
  citation_key TEXT, -- S1, S2, S3, etc.
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_sources_report_id ON report_sources(report_id);
CREATE INDEX IF NOT EXISTS idx_report_sources_type ON report_sources(source_type);

-- ============================================
-- REPORT SECTIONS TABLE (Optional, for composability)
-- ============================================

-- Table to store individual report sections for reordering/customization
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  
  -- Section metadata
  section_type TEXT NOT NULL, -- 'deal_summary', 'company_profile', 'how_closed', 'risks', 'lp_memo', 'custom'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Styling/formatting hints
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_sections_report_id ON report_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_order ON report_sections(report_id, order_index);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for report_sources
CREATE POLICY "Users can view sources for own reports" ON report_sources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sources.report_id AND reports.user_id = auth.uid())
  );

CREATE POLICY "Users can insert sources for own reports" ON report_sources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sources.report_id AND reports.user_id = auth.uid())
  );

CREATE POLICY "Users can delete sources for own reports" ON report_sources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sources.report_id AND reports.user_id = auth.uid())
  );

-- RLS Policies for report_sections
CREATE POLICY "Users can view sections for own reports" ON report_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sections.report_id AND reports.user_id = auth.uid())
  );

CREATE POLICY "Users can insert sections for own reports" ON report_sections
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sections.report_id AND reports.user_id = auth.uid())
  );

CREATE POLICY "Users can update sections for own reports" ON report_sections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sections.report_id AND reports.user_id = auth.uid())
  );

CREATE POLICY "Users can delete sections for own reports" ON report_sections
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = report_sections.report_id AND reports.user_id = auth.uid())
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp on reports
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Update updated_at timestamp on report_sections
CREATE TRIGGER trigger_update_report_sections_updated_at
  BEFORE UPDATE ON report_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Add comments for documentation
COMMENT ON TABLE reports IS 'AI-generated deal reports and investment memos';
COMMENT ON TABLE report_sources IS 'Sources (internal + web) used in report generation with citation tracking';
COMMENT ON TABLE report_sections IS 'Individual report sections for composability and reordering';
COMMENT ON COLUMN reports.content IS 'JSONB structure containing report sections and metadata';
COMMENT ON COLUMN report_sources.citation_key IS 'Citation reference (S1, S2, etc.) used in report content';

