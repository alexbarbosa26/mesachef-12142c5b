
-- 1) custom_columns: add company isolation
ALTER TABLE public.custom_columns ADD COLUMN IF NOT EXISTS company_id uuid;

-- Backfill from the single existing company (if any)
UPDATE public.custom_columns SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Admins can insert custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Admins can update custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Admins can delete custom_columns" ON public.custom_columns;

CREATE POLICY "Users view own-company custom_columns" ON public.custom_columns
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "Admins insert custom_columns" ON public.custom_columns
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "Admins update custom_columns" ON public.custom_columns
  FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "Admins delete custom_columns" ON public.custom_columns
  FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- Auto-set company_id on insert if NULL
DROP TRIGGER IF EXISTS set_company_id_custom_columns ON public.custom_columns;
CREATE TRIGGER set_company_id_custom_columns
  BEFORE INSERT ON public.custom_columns
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();


-- 2) profiles: remove self-insert loophole. The handle_new_user trigger is SECURITY DEFINER
-- and bypasses RLS, so users no longer need a self-insert path.
DROP POLICY IF EXISTS "Admins can insert company profiles" ON public.profiles;

CREATE POLICY "Admins can insert company profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND (company_id IS NULL OR company_id = public.current_company_id())
  );


-- 3 & 4) user_roles: restrict admin SELECT/UPDATE/DELETE to same-company targets
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can view roles in company" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );

CREATE POLICY "Admins can insert roles in company" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );

CREATE POLICY "Admins can update roles in company" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );

CREATE POLICY "Admins can delete roles in company" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = public.current_company_id()
    )
  );
