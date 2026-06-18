
CREATE TABLE public.production_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('correction','cooking')),
  food_name TEXT NOT NULL,
  gross_weight_g NUMERIC,
  net_weight_g NUMERIC,
  loss_g NUMERIC,
  loss_pct NUMERIC,
  yield_pct NUMERIC,
  correction_factor NUMERIC,
  cooking_factor NUMERIC,
  total_cost NUMERIC,
  cost_per_kg_gross NUMERIC,
  cost_per_kg_net NUMERIC,
  cost_per_g_net NUMERIC,
  action_taken TEXT NOT NULL DEFAULT 'saved_only' CHECK (action_taken IN ('updated_item','created_item','saved_only')),
  linked_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  source_calculation_id UUID REFERENCES public.production_calculations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_calculations TO authenticated;
GRANT ALL ON public.production_calculations TO service_role;

ALTER TABLE public.production_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant select production_calculations"
  ON public.production_calculations FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "tenant insert production_calculations"
  ON public.production_calculations FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "tenant update production_calculations"
  ON public.production_calculations FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "tenant delete production_calculations"
  ON public.production_calculations FOR DELETE TO authenticated
  USING (company_id = public.current_company_id());

CREATE TRIGGER set_company_id_production_calculations
  BEFORE INSERT ON public.production_calculations
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_production_calculations_updated_at
  BEFORE UPDATE ON public.production_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_production_calculations_company_created
  ON public.production_calculations (company_id, created_at DESC);
