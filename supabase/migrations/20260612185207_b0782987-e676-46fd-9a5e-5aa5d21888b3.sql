
-- 1. Tabela de categorias por empresa
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX product_categories_unique_name_per_company
  ON public.product_categories (company_id, lower(name));
CREATE INDEX idx_product_categories_company ON public.product_categories(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View categories of own company"
  ON public.product_categories FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

CREATE POLICY "Admins insert categories"
  ON public.product_categories FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "Admins update categories"
  ON public.product_categories FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

CREATE POLICY "Admins delete categories"
  ON public.product_categories FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

CREATE TRIGGER set_company_id_product_categories
  BEFORE INSERT ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed default categories for each existing company
INSERT INTO public.product_categories (company_id, name, is_system)
SELECT c.id, v.name, true
FROM public.companies c
CROSS JOIN (VALUES ('Café'), ('Doce'), ('Bolo'), ('Combo'), ('Salgado'), ('Bebida'), ('Outro')) AS v(name)
ON CONFLICT DO NOTHING;

-- 3. Add category_id to pricing_products
ALTER TABLE public.pricing_products
  ADD COLUMN category_id uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT;

CREATE INDEX idx_pricing_products_category_id ON public.pricing_products(category_id);

-- 4. Backfill category_id from enum
UPDATE public.pricing_products p
SET category_id = pc.id
FROM public.product_categories pc
WHERE pc.company_id = p.company_id
  AND lower(pc.name) = CASE p.category::text
    WHEN 'cafe' THEN 'café'
    WHEN 'doce' THEN 'doce'
    WHEN 'bolo' THEN 'bolo'
    WHEN 'combo' THEN 'combo'
    WHEN 'salgado' THEN 'salgado'
    WHEN 'bebida' THEN 'bebida'
    ELSE 'outro'
  END
  AND p.category_id IS NULL;

-- 5. Auto-create default categories when a new company is created
CREATE OR REPLACE FUNCTION public.seed_default_product_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_categories (company_id, name, is_system)
  VALUES
    (NEW.id, 'Café', true),
    (NEW.id, 'Doce', true),
    (NEW.id, 'Bolo', true),
    (NEW.id, 'Combo', true),
    (NEW.id, 'Salgado', true),
    (NEW.id, 'Bebida', true),
    (NEW.id, 'Outro', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_default_product_categories_on_company
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_product_categories();
