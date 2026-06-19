
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view suppliers from their company"
ON public.suppliers FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "Admins manage suppliers"
ON public.suppliers FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND public.is_admin(auth.uid()))
WITH CHECK (company_id = public.current_company_id() AND public.is_admin(auth.uid()));

CREATE TRIGGER set_suppliers_company_id BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.stock_purchases ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
CREATE INDEX idx_stock_purchases_supplier_id ON public.stock_purchases(supplier_id);
