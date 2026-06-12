
ALTER TABLE public.pricing_config_global ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.pricing_config_global pcg
SET company_id = COALESCE(
  (SELECT company_id FROM public.profiles WHERE user_id = pcg.updated_by LIMIT 1),
  (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
)
WHERE company_id IS NULL;

INSERT INTO public.pricing_config_global (company_id, variable_expenses_pct, fixed_expenses_pct, profit_pct, investment_pct, healthy_margin_threshold, price_proximity_factor)
SELECT c.id, 10, 15, 20, 5, 30, 1
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_config_global p WHERE p.company_id = c.id);

ALTER TABLE public.pricing_config_global ALTER COLUMN company_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pricing_config_global_company_id_key ON public.pricing_config_global(company_id);

DROP TRIGGER IF EXISTS set_pricing_config_global_company ON public.pricing_config_global;
CREATE TRIGGER set_pricing_config_global_company
  BEFORE INSERT ON public.pricing_config_global
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

DROP POLICY IF EXISTS "Admins can view pricing_config_global" ON public.pricing_config_global;
DROP POLICY IF EXISTS "Admins can update pricing_config_global" ON public.pricing_config_global;

CREATE POLICY "Admins can view pricing_config_global"
  ON public.pricing_config_global FOR SELECT TO authenticated
  USING ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can update pricing_config_global"
  ON public.pricing_config_global FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()))
  WITH CHECK ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()));

CREATE POLICY "Admins can insert pricing_config_global"
  ON public.pricing_config_global FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND (company_id IS NULL OR company_id = current_company_id())) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS ssdr_insert ON public.self_service_daily_records;
DROP POLICY IF EXISTS ssdr_update ON public.self_service_daily_records;

CREATE POLICY ssdr_insert ON public.self_service_daily_records FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()));

CREATE POLICY ssdr_update ON public.self_service_daily_records FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()))
  WITH CHECK ((is_admin(auth.uid()) AND company_id = current_company_id()) OR is_superadmin(auth.uid()));

DROP TRIGGER IF EXISTS enforce_stock_update_permissions ON public.stock_items;
CREATE TRIGGER enforce_stock_update_permissions
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.check_stock_update_permissions();
