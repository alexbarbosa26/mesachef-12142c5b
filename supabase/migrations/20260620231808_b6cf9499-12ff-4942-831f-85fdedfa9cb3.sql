
CREATE TABLE public.pricing_resale_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  stock_item_id UUID NULL REFERENCES public.stock_items(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  acquisition_cost NUMERIC NOT NULL DEFAULT 0,
  packaging_cost NUMERIC NOT NULL DEFAULT 0,
  desired_profit_percentage NUMERIC NOT NULL DEFAULT 0,
  practiced_price NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_resale_products TO authenticated;
GRANT ALL ON public.pricing_resale_products TO service_role;

ALTER TABLE public.pricing_resale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resale products viewable by same company"
  ON public.pricing_resale_products FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "Admins can insert resale products in their company"
  ON public.pricing_resale_products FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND company_id = public.current_company_id()
  );

CREATE POLICY "Admins can update resale products in their company"
  ON public.pricing_resale_products FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND company_id = public.current_company_id()
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    AND company_id = public.current_company_id()
  );

CREATE POLICY "Admins can delete resale products in their company"
  ON public.pricing_resale_products FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND company_id = public.current_company_id()
  );

CREATE TRIGGER set_resale_products_company_id
  BEFORE INSERT ON public.pricing_resale_products
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_resale_products_updated_at
  BEFORE UPDATE ON public.pricing_resale_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_resale_products_company ON public.pricing_resale_products(company_id);
CREATE INDEX idx_resale_products_stock_item ON public.pricing_resale_products(stock_item_id);
