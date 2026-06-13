
-- 1. Trigger to prevent profile field escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Superadmins bypass all checks
  IF public.is_superadmin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- No one except superadmin may change company_id or user_id
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido alterar company_id do perfil';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar user_id do perfil';
  END IF;

  -- Admins can change email/is_active/password_expiry_days on company profiles
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Regular users (self-update) cannot change these
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Não é permitido alterar email do perfil';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Não é permitido alterar status do perfil';
  END IF;
  IF NEW.password_expiry_days IS DISTINCT FROM OLD.password_expiry_days THEN
    RAISE EXCEPTION 'Não é permitido alterar password_expiry_days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_self_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_escalation();

-- 2. Scope policies from {public} to {authenticated}

-- audit_logs
DROP POLICY IF EXISTS "Admins can view company audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view company audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "No delete from audit_logs" ON public.audit_logs;
CREATE POLICY "No delete from audit_logs" ON public.audit_logs
  FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct insert to audit_logs" ON public.audit_logs;
CREATE POLICY "No direct insert to audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No update to audit_logs" ON public.audit_logs;
CREATE POLICY "No update to audit_logs" ON public.audit_logs
  FOR UPDATE TO authenticated USING (false);

-- pricing_config_product
DROP POLICY IF EXISTS "Admins can delete pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can delete pricing_config_product" ON public.pricing_config_product
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can insert pricing_config_product" ON public.pricing_config_product
  FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND ((company_id IS NULL) OR (company_id = current_company_id()))) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can update pricing_config_product" ON public.pricing_config_product
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can view pricing_config_product" ON public.pricing_config_product
  FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

-- pricing_products
DROP POLICY IF EXISTS "Admins can delete pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can delete pricing_products" ON public.pricing_products
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can insert pricing_products" ON public.pricing_products
  FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND ((company_id IS NULL) OR (company_id = current_company_id()))) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can update pricing_products" ON public.pricing_products
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view pricing_products" ON public.pricing_products;
CREATE POLICY "Authenticated can view pricing_products" ON public.pricing_products
  FOR SELECT TO authenticated
  USING ((auth.uid() IS NOT NULL) AND ((company_id = current_company_id()) OR is_superadmin(auth.uid())));

-- profiles
DROP POLICY IF EXISTS "Admins can delete company profiles" ON public.profiles;
CREATE POLICY "Admins can delete company profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) AND (company_id = current_company_id()));

DROP POLICY IF EXISTS "Admins can update company profiles" ON public.profiles;
CREATE POLICY "Admins can update company profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) AND (company_id = current_company_id()));

DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
CREATE POLICY "Admins can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND (company_id = current_company_id()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- stock_history
DROP POLICY IF EXISTS "Admins can view stock_history" ON public.stock_history;
CREATE POLICY "Admins can view stock_history" ON public.stock_history
  FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "System only insert stock_history" ON public.stock_history;
CREATE POLICY "System only insert stock_history" ON public.stock_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- technical_sheet_ingredients
DROP POLICY IF EXISTS "Admins can delete technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can delete technical_sheet_ingredients" ON public.technical_sheet_ingredients
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can insert technical_sheet_ingredients" ON public.technical_sheet_ingredients
  FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND ((company_id IS NULL) OR (company_id = current_company_id()))) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can update technical_sheet_ingredients" ON public.technical_sheet_ingredients
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can view technical_sheet_ingredients" ON public.technical_sheet_ingredients
  FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

-- technical_sheets
DROP POLICY IF EXISTS "Admins can delete technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can delete technical_sheets" ON public.technical_sheets
  FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can insert technical_sheets" ON public.technical_sheets
  FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND ((company_id IS NULL) OR (company_id = current_company_id()))) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can update technical_sheets" ON public.technical_sheets
  FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can view technical_sheets" ON public.technical_sheets
  FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND (company_id = current_company_id())) OR is_superadmin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles in company" ON public.user_roles;
CREATE POLICY "Admins can delete roles in company" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    is_admin(auth.uid())
    AND role = 'staff'::app_role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = current_company_id()
    )
  );

DROP POLICY IF EXISTS "Admins can view roles in company" ON public.user_roles;
CREATE POLICY "Admins can view roles in company" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.company_id = current_company_id()
    )
  );
