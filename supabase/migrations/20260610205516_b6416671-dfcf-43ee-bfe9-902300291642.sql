
DROP POLICY IF EXISTS "Admins can update roles in company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in company" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view roles in company" ON public.user_roles;

CREATE POLICY "Admins can view roles in company"
ON public.user_roles
FOR SELECT
USING (
  is_admin(auth.uid())
  AND role <> 'superadmin'::app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = current_company_id()
  )
);

CREATE POLICY "Admins can update roles in company"
ON public.user_roles
FOR UPDATE
USING (
  is_admin(auth.uid())
  AND user_id <> auth.uid()
  AND role <> 'superadmin'::app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = current_company_id()
  )
)
WITH CHECK (
  is_admin(auth.uid())
  AND user_id <> auth.uid()
  AND role <> 'superadmin'::app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = current_company_id()
  )
);

CREATE POLICY "Admins can delete roles in company"
ON public.user_roles
FOR DELETE
USING (
  is_admin(auth.uid())
  AND user_id <> auth.uid()
  AND role <> 'superadmin'::app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.company_id = current_company_id()
  )
);
