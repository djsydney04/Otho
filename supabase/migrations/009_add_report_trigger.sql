-- Migration: Add automatic report generation trigger
-- Automatically generates a deal closure report when a company moves to "Committed" stage

-- ============================================
-- FUNCTION: Auto-generate report on stage change
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_deal_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stage changed to "Committed" (closed/won)
  IF NEW.stage = 'Committed' AND (OLD.stage IS NULL OR OLD.stage != 'Committed') THEN
    -- Insert a pending report that will be picked up by a background job
    -- or processed by the API
    INSERT INTO reports (
      company_id,
      user_id,
      type,
      status,
      title
    ) VALUES (
      NEW.id,
      NEW.owner_id,
      'deal_closed',
      'pending',
      'Deal Report: ' || NEW.name
    );
    
    -- Note: The actual report generation will be triggered by the API
    -- when it detects pending reports, or you can call the generate API
    -- from a background job/cron
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: On company stage update
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_generate_deal_report ON companies;

CREATE TRIGGER trigger_auto_generate_deal_report
  AFTER INSERT OR UPDATE OF stage ON companies
  FOR EACH ROW
  WHEN (NEW.stage = 'Committed')
  EXECUTE FUNCTION auto_generate_deal_report();

-- ============================================
-- BACKGROUND JOB FUNCTION (Optional)
-- ============================================

-- Function to process pending reports
-- Can be called by pg_cron or an external scheduler
CREATE OR REPLACE FUNCTION process_pending_reports()
RETURNS TABLE(report_id UUID, company_id UUID, status TEXT) AS $$
DECLARE
  pending_report RECORD;
BEGIN
  -- Find all pending reports
  FOR pending_report IN 
    SELECT r.id, r.company_id, r.user_id, c.name as company_name
    FROM reports r
    JOIN companies c ON c.id = r.company_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
    LIMIT 10 -- Process 10 at a time
  LOOP
    -- Update status to generating
    UPDATE reports 
    SET status = 'generating', updated_at = NOW()
    WHERE id = pending_report.id;
    
    -- Return the report for external processing
    -- The actual API call should be made by your application
    RETURN QUERY SELECT 
      pending_report.id::UUID, 
      pending_report.company_id::UUID, 
      'queued'::TEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER: Check for pending reports
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_report_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM reports WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION auto_generate_deal_report() IS 'Automatically creates a pending deal report when company stage changes to Committed';
COMMENT ON FUNCTION process_pending_reports() IS 'Processes pending reports for background job processing';
COMMENT ON FUNCTION get_pending_report_count() IS 'Returns count of reports waiting to be generated';
COMMENT ON TRIGGER trigger_auto_generate_deal_report ON companies IS 'Triggers report generation when deal is closed (stage = Committed)';

