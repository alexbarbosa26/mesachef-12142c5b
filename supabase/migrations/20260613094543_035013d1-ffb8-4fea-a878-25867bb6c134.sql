
-- 1. self_service_daily_items: restrict insert/update/delete to admins
DROP POLICY IF EXISTS ssdi_insert ON public.self_service_daily_items;
DROP POLICY IF EXISTS ssdi_update ON public.self_service_daily_items;
DROP POLICY IF EXISTS ssdi_delete ON public.self_service_daily_items;

CREATE POLICY ssdi_insert ON public.self_service_daily_items
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY ssdi_update ON public.self_service_daily_items
  FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY ssdi_delete ON public.self_service_daily_items
  FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- 2. settings: global table, restrict writes to superadmin
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.settings;

CREATE POLICY "Superadmins can insert settings" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update settings" ON public.settings
  FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete settings" ON public.settings
  FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- 3. user_roles: prevent admins from creating/modifying admin or superadmin roles
DROP POLICY IF EXISTS "Admins can insert roles in company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in company" ON public.user_roles;

CREATE POLICY "Admins can insert staff roles in company" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND role = 'staff'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );

CREATE POLICY "Admins can update staff roles in company" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND role = 'staff'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND role = 'staff'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );
