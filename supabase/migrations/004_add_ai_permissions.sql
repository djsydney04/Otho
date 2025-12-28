-- AI Permissions & Grants System
-- Allows users to grant AI explicit permissions to perform actions

-- AI Grants table - stores user permissions for AI actions
CREATE TABLE IF NOT EXISTS ai_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Grant metadata
  name TEXT, -- Optional name for the grant (e.g., "Full access", "Comment-only")
  description TEXT,
  
  -- Permission scopes
  can_add_comments BOOLEAN DEFAULT false,
  can_update_fields TEXT[], -- Array of allowed field names (e.g., ['stage', 'is_priority', 'description'])
  can_create_companies BOOLEAN DEFAULT false,
  can_create_founders BOOLEAN DEFAULT false,
  can_add_tags BOOLEAN DEFAULT false,
  
  -- Restrictions
  restricted_company_ids UUID[], -- If specified, only these companies can be modified
  restricted_founder_ids UUID[], -- If specified, only these founders can be modified
  denied_fields TEXT[] DEFAULT ARRAY['last_touch', 'updated_at', 'created_at', 'owner_id'], -- Fields AI can NEVER modify
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- AI Actions Audit Log - tracks all AI actions
CREATE TABLE IF NOT EXISTS ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID REFERENCES ai_grants(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL, -- 'add_comment', 'update_company', 'update_founder', 'create_company', etc.
  entity_type TEXT NOT NULL, -- 'company', 'founder', etc.
  entity_id UUID NOT NULL,
  
  -- What changed
  changes JSONB NOT NULL, -- { field: 'stage', old_value: 'interested', new_value: 'qualified' }
  description TEXT, -- Human-readable description
  
  -- Before/after snapshots for audit
  before_state JSONB,
  after_state JSONB,
  
  -- Metadata
  source TEXT DEFAULT 'chat', -- 'chat', 'auto', 'scheduled', etc.
  requires_approval BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_grants_user_id ON ai_grants(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_grants_expires_at ON ai_grants(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_action_log_user_id ON ai_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_entity ON ai_action_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_created_at ON ai_action_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_grant_id ON ai_action_log(grant_id);

-- RLS Policies
ALTER TABLE ai_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own grants
CREATE POLICY "Users can view own grants"
  ON ai_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own grants
CREATE POLICY "Users can create own grants"
  ON ai_grants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own grants
CREATE POLICY "Users can update own grants"
  ON ai_grants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own action logs
CREATE POLICY "Users can view own action logs"
  ON ai_action_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to check if a grant is valid
CREATE OR REPLACE FUNCTION is_grant_valid(grant_uuid UUID, action_type TEXT, field_name TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  grant_record ai_grants%ROWTYPE;
BEGIN
  SELECT * INTO grant_record
  FROM ai_grants
  WHERE id = grant_uuid
    AND user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND revoked_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if field is denied
  IF field_name IS NOT NULL AND field_name = ANY(grant_record.denied_fields) THEN
    RETURN false;
  END IF;
  
  -- Check action-specific permissions
  CASE action_type
    WHEN 'add_comment' THEN
      RETURN grant_record.can_add_comments;
    WHEN 'update_company', 'update_founder' THEN
      IF field_name IS NULL THEN
        RETURN array_length(grant_record.can_update_fields, 1) > 0;
      END IF;
      RETURN field_name = ANY(grant_record.can_update_fields);
    WHEN 'create_company' THEN
      RETURN grant_record.can_create_companies;
    WHEN 'create_founder' THEN
      RETURN grant_record.can_create_founders;
    WHEN 'add_tag' THEN
      RETURN grant_record.can_add_tags;
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log AI action
CREATE OR REPLACE FUNCTION log_ai_action(
  p_grant_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_changes JSONB,
  p_description TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'chat'
)
RETURNS UUID AS $$
DECLARE
  action_id UUID;
BEGIN
  INSERT INTO ai_action_log (
    grant_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    changes,
    description,
    before_state,
    after_state,
    source
  ) VALUES (
    p_grant_id,
    auth.uid(),
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_description,
    p_before_state,
    p_after_state,
    p_source
  ) RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

