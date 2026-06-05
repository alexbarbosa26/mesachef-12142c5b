
-- 1. Fix create_audit_log: ignore p_user_id, always use auth.uid()
CREATE OR REPLACE FUNCTION public.create_audit_log(p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  -- Always derive user_id from the authenticated session (ignore p_user_id to prevent forgery)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Allow service_role (no auth.uid) to pass-through p_user_id for system events
    v_user_id := p_user_id;
  END IF;

  IF v_user_id IS NULL OR p_action IS NULL OR p_entity_type IS NULL THEN
    RAISE EXCEPTION 'user_id, action, and entity_type are required';
  END IF;
  IF length(p_action) > 100 THEN
    RAISE EXCEPTION 'action must be 100 characters or less';
  END IF;
  IF length(p_entity_type) > 100 THEN
    RAISE EXCEPTION 'entity_type must be 100 characters or less';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (v_user_id, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$function$;

-- 2. Server-side is_active enforcement: helper and updated current_company_id
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE user_id = _user_id LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.profiles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1
$function$;

-- 3. Audit logs: add company_id and scope admin reads to same company
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id uuid;
UPDATE public.audit_logs al SET company_id = p.company_id
FROM public.profiles p WHERE al.user_id = p.user_id AND al.company_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_audit_company_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_logs_set_company_id ON public.audit_logs;
CREATE TRIGGER audit_logs_set_company_id BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_audit_company_id();

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view company audit logs" ON public.audit_logs
FOR SELECT USING (
  (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
  OR public.is_superadmin(auth.uid())
);

-- 4. Profiles: scope admin policies to same company
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "Admins can view company profiles" ON public.profiles
FOR SELECT USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins can update company profiles" ON public.profiles
FOR UPDATE USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins can delete company profiles" ON public.profiles
FOR DELETE USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins can insert company profiles" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (
  (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
  OR auth.uid() = user_id
);

-- 5. Stock items: attach the existing permission trigger to enforce field-level limits
DROP TRIGGER IF EXISTS check_stock_update_permissions_trg ON public.stock_items;
CREATE TRIGGER check_stock_update_permissions_trg
BEFORE UPDATE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.check_stock_update_permissions();

-- 6. Attach stock change logging trigger if missing
DROP TRIGGER IF EXISTS log_stock_change_trg ON public.stock_items;
CREATE TRIGGER log_stock_change_trg
AFTER UPDATE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.log_stock_change();

-- 7. user_roles: explicitly prevent self-assignment of privileged roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  AND user_id <> auth.uid()  -- cannot grant role to self
  AND role <> 'superadmin'   -- only superadmins (via own policy) can grant superadmin
);

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid() AND role <> 'superadmin');

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());

-- 8. Revoke EXECUTE on sensitive admin functions from anon
REVOKE EXECUTE ON FUNCTION public.create_audit_log(uuid, text, text, uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.create_audit_log(uuid, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated, service_role;
