
-- 1) Add monthly revenue to pricing_config_global
ALTER TABLE public.pricing_config_global
  ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC(14,2) NOT NULL DEFAULT 0;

-- 2) Fixed costs table
CREATE TABLE IF NOT EXISTS public.pricing_fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_fixed_costs TO authenticated;
GRANT ALL ON public.pricing_fixed_costs TO service_role;

ALTER TABLE public.pricing_fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pfc_select ON public.pricing_fixed_costs FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pfc_insert ON public.pricing_fixed_costs FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pfc_update ON public.pricing_fixed_costs FOR UPDATE TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pfc_delete ON public.pricing_fixed_costs FOR DELETE TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));

CREATE TRIGGER pricing_fixed_costs_set_company
  BEFORE INSERT ON public.pricing_fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER pricing_fixed_costs_updated_at
  BEFORE UPDATE ON public.pricing_fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pfc_company ON public.pricing_fixed_costs(company_id);

-- 3) Variable costs table
CREATE TABLE IF NOT EXISTS public.pricing_variable_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC(7,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_variable_costs TO authenticated;
GRANT ALL ON public.pricing_variable_costs TO service_role;

ALTER TABLE public.pricing_variable_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pvc_select ON public.pricing_variable_costs FOR SELECT TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pvc_insert ON public.pricing_variable_costs FOR INSERT TO authenticated
  WITH CHECK ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pvc_update ON public.pricing_variable_costs FOR UPDATE TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()))
  WITH CHECK ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));
CREATE POLICY pvc_delete ON public.pricing_variable_costs FOR DELETE TO authenticated
  USING ((public.is_admin(auth.uid()) AND company_id = public.current_company_id()) OR public.is_superadmin(auth.uid()));

CREATE TRIGGER pricing_variable_costs_set_company
  BEFORE INSERT ON public.pricing_variable_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER pricing_variable_costs_updated_at
  BEFORE UPDATE ON public.pricing_variable_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pvc_company ON public.pricing_variable_costs(company_id);
