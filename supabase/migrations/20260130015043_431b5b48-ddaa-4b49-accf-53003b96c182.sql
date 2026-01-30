-- Fix audit_logs security: Remove public INSERT and use server-side trigger instead
-- This ensures only the system can create audit logs, not malicious users

-- 1. Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- 2. Create a SECURITY DEFINER function for safe audit logging
-- This function will be called from triggers and trusted sources only
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_action IS NULL OR p_entity_type IS NULL THEN
    RAISE EXCEPTION 'user_id, action, and entity_type are required';
  END IF;
  
  -- Validate action length
  IF length(p_action) > 100 THEN
    RAISE EXCEPTION 'action must be 100 characters or less';
  END IF;
  
  -- Validate entity_type length
  IF length(p_entity_type) > 100 THEN
    RAISE EXCEPTION 'entity_type must be 100 characters or less';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 3. Create a restrictive policy that denies all direct INSERT operations
-- Only the SECURITY DEFINER function can insert audit logs now
CREATE POLICY "No direct insert to audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);