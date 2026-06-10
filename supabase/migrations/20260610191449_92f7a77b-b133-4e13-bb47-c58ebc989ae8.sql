
-- Self-service daily records
CREATE TABLE public.self_service_daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  date DATE NOT NULL,
  weekday TEXT,
  markup NUMERIC NOT NULL DEFAULT 0,
  suggested_kg_price NUMERIC NOT NULL DEFAULT 0,
  practiced_kg_price NUMERIC NOT NULL DEFAULT 0,
  observations TEXT,
  planned_meals INTEGER NOT NULL DEFAULT 0,
  actual_meals INTEGER NOT NULL DEFAULT 0,
  planned_average_consumption NUMERIC NOT NULL DEFAULT 0,
  actual_average_consumption NUMERIC NOT NULL DEFAULT 0,
  total_recipes INTEGER NOT NULL DEFAULT 0,
  total_produced_kg NUMERIC NOT NULL DEFAULT 0,
  total_consumed_kg NUMERIC NOT NULL DEFAULT 0,
  total_leftover_kg NUMERIC NOT NULL DEFAULT 0,
  total_production_cost NUMERIC NOT NULL DEFAULT 0,
  total_leftover_value NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  estimated_cmv NUMERIC NOT NULL DEFAULT 0,
  estimated_result NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_service_daily_records TO authenticated;
GRANT ALL ON public.self_service_daily_records TO service_role;

ALTER TABLE public.self_service_daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssdr_select" ON public.self_service_daily_records
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdr_insert" ON public.self_service_daily_records
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdr_update" ON public.self_service_daily_records
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()))
  WITH CHECK (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdr_delete" ON public.self_service_daily_records
  FOR DELETE TO authenticated
  USING ((company_id = public.current_company_id() AND public.is_admin(auth.uid())) OR public.is_superadmin(auth.uid()));

CREATE TRIGGER set_company_id_ssdr
  BEFORE INSERT ON public.self_service_daily_records
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_ssdr_updated_at
  BEFORE UPDATE ON public.self_service_daily_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items
CREATE TABLE public.self_service_daily_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_record_id UUID NOT NULL REFERENCES public.self_service_daily_records(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  recipe_name TEXT NOT NULL,
  category TEXT,
  cost_per_kg NUMERIC NOT NULL DEFAULT 0,
  produced_kg NUMERIC NOT NULL DEFAULT 0,
  production_total_cost NUMERIC NOT NULL DEFAULT 0,
  leftover_kg NUMERIC NOT NULL DEFAULT 0,
  leftover_total_value NUMERIC NOT NULL DEFAULT 0,
  consumed_kg NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  leftover_percentage NUMERIC NOT NULL DEFAULT 0,
  cost_participation_percentage NUMERIC NOT NULL DEFAULT 0,
  sales_participation_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_service_daily_items TO authenticated;
GRANT ALL ON public.self_service_daily_items TO service_role;

ALTER TABLE public.self_service_daily_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssdi_select" ON public.self_service_daily_items
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdi_insert" ON public.self_service_daily_items
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdi_update" ON public.self_service_daily_items
  FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()))
  WITH CHECK (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "ssdi_delete" ON public.self_service_daily_items
  FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE TRIGGER set_company_id_ssdi
  BEFORE INSERT ON public.self_service_daily_items
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_ssdi_updated_at
  BEFORE UPDATE ON public.self_service_daily_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ssdr_company_date ON public.self_service_daily_records(company_id, date DESC);
CREATE INDEX idx_ssdi_record ON public.self_service_daily_items(daily_record_id);
