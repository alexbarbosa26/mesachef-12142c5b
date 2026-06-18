DROP POLICY IF EXISTS "tenant update production_calculations" ON public.production_calculations;
DROP POLICY IF EXISTS "tenant delete production_calculations" ON public.production_calculations;

CREATE POLICY "admins update production_calculations"
ON public.production_calculations
FOR UPDATE
TO authenticated
USING (company_id = public.current_company_id() AND (public.is_admin(auth.uid()) OR public.is_superadmin(auth.uid())))
WITH CHECK (company_id = public.current_company_id() AND (public.is_admin(auth.uid()) OR public.is_superadmin(auth.uid())));

CREATE POLICY "admins delete production_calculations"
ON public.production_calculations
FOR DELETE
TO authenticated
USING (company_id = public.current_company_id() AND (public.is_admin(auth.uid()) OR public.is_superadmin(auth.uid())));