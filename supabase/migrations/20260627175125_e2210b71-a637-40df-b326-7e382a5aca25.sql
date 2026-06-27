
-- Add count/base unit fields to stock_items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS count_unit text,
  ADD COLUMN IF NOT EXISTS package_size numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_unit text;

UPDATE public.stock_items SET count_unit = COALESCE(count_unit, unit), base_unit = COALESCE(base_unit, unit);

-- Purchase orders header
CREATE TABLE IF NOT EXISTS public.stock_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_purchase_orders TO authenticated;
GRANT ALL ON public.stock_purchase_orders TO service_role;

ALTER TABLE public.stock_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spo_select_company" ON public.stock_purchase_orders FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "spo_insert_company" ON public.stock_purchase_orders FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "spo_update_company" ON public.stock_purchase_orders FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "spo_delete_admin" ON public.stock_purchase_orders FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_admin(auth.uid()));

CREATE TRIGGER spo_set_company BEFORE INSERT ON public.stock_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();
CREATE TRIGGER spo_set_updated BEFORE UPDATE ON public.stock_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase order items
CREATE TABLE IF NOT EXISTS public.stock_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.stock_purchase_orders(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  purchased_quantity numeric NOT NULL DEFAULT 0,
  purchase_unit text NOT NULL DEFAULT 'unidade',
  package_size numeric NOT NULL DEFAULT 1,
  base_unit text NOT NULL DEFAULT 'un',
  package_unit_cost numeric NOT NULL DEFAULT 0,
  total_base_quantity numeric GENERATED ALWAYS AS (purchased_quantity * package_size) STORED,
  total_cost numeric GENERATED ALWAYS AS (purchased_quantity * package_unit_cost) STORED,
  base_unit_cost numeric GENERATED ALWAYS AS (
    CASE WHEN purchased_quantity * package_size > 0
         THEN (purchased_quantity * package_unit_cost) / (purchased_quantity * package_size)
         ELSE 0 END
  ) STORED,
  notes text,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_purchase_order_items TO authenticated;
GRANT ALL ON public.stock_purchase_order_items TO service_role;

ALTER TABLE public.stock_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spoi_select_company" ON public.stock_purchase_order_items FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "spoi_insert_company" ON public.stock_purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "spoi_update_company" ON public.stock_purchase_order_items FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "spoi_delete_company" ON public.stock_purchase_order_items FOR DELETE TO authenticated
  USING (company_id = public.current_company_id());

CREATE TRIGGER spoi_set_company BEFORE INSERT ON public.stock_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE INDEX IF NOT EXISTS idx_spoi_order ON public.stock_purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_spoi_item ON public.stock_purchase_order_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_spo_company_date ON public.stock_purchase_orders(company_id, purchase_date DESC);
