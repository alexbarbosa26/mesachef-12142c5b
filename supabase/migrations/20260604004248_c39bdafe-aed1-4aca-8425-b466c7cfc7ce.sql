
-- ============================================================
-- FASE 1 MULTIEMPRESA — MIGRAÇÃO SEGURA E ADITIVA
-- ============================================================

-- 1. Adiciona 'superadmin' ao enum app_role (não usar no mesmo tx)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Tabela de empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Empresa padrão (ID fixo para backfill)
INSERT INTO public.companies (id, name, document, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Principal', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper: superadmin (comparação por texto para evitar uso do enum no mesmo tx)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'superadmin'
  )
$$;

-- 4. Adiciona company_id em profiles + backfill
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.profiles
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- 5. Helper: empresa do usuário atual
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 6. Função genérica para auto-setar company_id em INSERT
CREATE OR REPLACE FUNCTION public.set_company_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.current_company_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Adicionar company_id às tabelas operacionais + backfill + trigger
-- ============================================================

-- Helper macro para repetir o padrão
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'categories',
    'stock_items',
    'stock_history',
    'stock_purchases',
    'stock_adjustments',
    'cmv_snapshots',
    'pricing_products',
    'pricing_config_product',
    'technical_sheets',
    'technical_sheet_ingredients'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id)',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET company_id = ''00000000-0000-0000-0000-000000000001'' WHERE company_id IS NULL',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)',
      'idx_' || t || '_company_id', t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS set_company_id_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER set_company_id_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- 8. RLS Policies para companies
-- ============================================================
DROP POLICY IF EXISTS "Superadmins manage companies" ON public.companies;
CREATE POLICY "Superadmins manage companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (id = public.current_company_id() OR public.is_superadmin(auth.uid()));

-- ============================================================
-- 9. Atualiza policies das tabelas operacionais para filtrar por empresa
-- ============================================================

-- profiles: superadmin pode ver/editar tudo
DROP POLICY IF EXISTS "Superadmins manage profiles" ON public.profiles;
CREATE POLICY "Superadmins manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- user_roles: superadmin pode ver/editar tudo
DROP POLICY IF EXISTS "Superadmins manage roles" ON public.user_roles;
CREATE POLICY "Superadmins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Helper local: condição padrão de acesso por empresa
-- (recriamos as policies SELECT/INSERT/UPDATE/DELETE adicionando filtro)

-- ===== categories =====
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== stock_items =====
DROP POLICY IF EXISTS "Authenticated users can view stock_items" ON public.stock_items;
CREATE POLICY "Authenticated users can view stock_items"
  ON public.stock_items FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert stock_items" ON public.stock_items;
CREATE POLICY "Admins can insert stock_items"
  ON public.stock_items FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update stock_items" ON public.stock_items;
CREATE POLICY "Admins can update stock_items"
  ON public.stock_items FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete stock_items" ON public.stock_items;
CREATE POLICY "Admins can delete stock_items"
  ON public.stock_items FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Staff can update stock quantities" ON public.stock_items;
CREATE POLICY "Staff can update stock quantities"
  ON public.stock_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND company_id = public.current_company_id())
  WITH CHECK (auth.uid() IS NOT NULL AND company_id = public.current_company_id());

-- ===== stock_history =====
DROP POLICY IF EXISTS "Admins can view stock_history" ON public.stock_history;
CREATE POLICY "Admins can view stock_history"
  ON public.stock_history FOR SELECT
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- atualiza trigger de log para popular company_id a partir do item
CREATE OR REPLACE FUNCTION public.log_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.current_quantity IS DISTINCT FROM NEW.current_quantity THEN
    INSERT INTO public.stock_history (
      item_id,
      previous_quantity,
      new_quantity,
      changed_by,
      change_type,
      company_id
    ) VALUES (
      NEW.id,
      OLD.current_quantity,
      NEW.current_quantity,
      auth.uid(),
      CASE
        WHEN NEW.current_quantity > OLD.current_quantity THEN 'increase'
        WHEN NEW.current_quantity < OLD.current_quantity THEN 'decrease'
        ELSE 'update'
      END,
      NEW.company_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ===== stock_purchases =====
DROP POLICY IF EXISTS "Authenticated can view stock_purchases" ON public.stock_purchases;
CREATE POLICY "Authenticated can view stock_purchases"
  ON public.stock_purchases FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert stock_purchases" ON public.stock_purchases;
CREATE POLICY "Admins can insert stock_purchases"
  ON public.stock_purchases FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update stock_purchases" ON public.stock_purchases;
CREATE POLICY "Admins can update stock_purchases"
  ON public.stock_purchases FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete stock_purchases" ON public.stock_purchases;
CREATE POLICY "Admins can delete stock_purchases"
  ON public.stock_purchases FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== stock_adjustments =====
DROP POLICY IF EXISTS "Authenticated can view stock_adjustments" ON public.stock_adjustments;
CREATE POLICY "Authenticated can view stock_adjustments"
  ON public.stock_adjustments FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert stock_adjustments" ON public.stock_adjustments;
CREATE POLICY "Admins can insert stock_adjustments"
  ON public.stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update stock_adjustments" ON public.stock_adjustments;
CREATE POLICY "Admins can update stock_adjustments"
  ON public.stock_adjustments FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete stock_adjustments" ON public.stock_adjustments;
CREATE POLICY "Admins can delete stock_adjustments"
  ON public.stock_adjustments FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== cmv_snapshots =====
DROP POLICY IF EXISTS "Authenticated can view cmv_snapshots" ON public.cmv_snapshots;
CREATE POLICY "Authenticated can view cmv_snapshots"
  ON public.cmv_snapshots FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert cmv_snapshots" ON public.cmv_snapshots;
CREATE POLICY "Admins can insert cmv_snapshots"
  ON public.cmv_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update cmv_snapshots" ON public.cmv_snapshots;
CREATE POLICY "Admins can update cmv_snapshots"
  ON public.cmv_snapshots FOR UPDATE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete cmv_snapshots" ON public.cmv_snapshots;
CREATE POLICY "Admins can delete cmv_snapshots"
  ON public.cmv_snapshots FOR DELETE TO authenticated
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== pricing_products =====
DROP POLICY IF EXISTS "Authenticated can view pricing_products" ON public.pricing_products;
CREATE POLICY "Authenticated can view pricing_products"
  ON public.pricing_products FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      company_id = public.current_company_id() OR public.is_superadmin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can insert pricing_products"
  ON public.pricing_products FOR INSERT
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can update pricing_products"
  ON public.pricing_products FOR UPDATE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete pricing_products" ON public.pricing_products;
CREATE POLICY "Admins can delete pricing_products"
  ON public.pricing_products FOR DELETE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== pricing_config_product =====
DROP POLICY IF EXISTS "Admins can view pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can view pricing_config_product"
  ON public.pricing_config_product FOR SELECT
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can insert pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can insert pricing_config_product"
  ON public.pricing_config_product FOR INSERT
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can update pricing_config_product"
  ON public.pricing_config_product FOR UPDATE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete pricing_config_product" ON public.pricing_config_product;
CREATE POLICY "Admins can delete pricing_config_product"
  ON public.pricing_config_product FOR DELETE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== technical_sheets =====
DROP POLICY IF EXISTS "Admins can view technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can view technical_sheets"
  ON public.technical_sheets FOR SELECT
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can insert technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can insert technical_sheets"
  ON public.technical_sheets FOR INSERT
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can update technical_sheets"
  ON public.technical_sheets FOR UPDATE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete technical_sheets" ON public.technical_sheets;
CREATE POLICY "Admins can delete technical_sheets"
  ON public.technical_sheets FOR DELETE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

-- ===== technical_sheet_ingredients =====
DROP POLICY IF EXISTS "Admins can view technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can view technical_sheet_ingredients"
  ON public.technical_sheet_ingredients FOR SELECT
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can insert technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can insert technical_sheet_ingredients"
  ON public.technical_sheet_ingredients FOR INSERT
  WITH CHECK (
    (public.is_admin(auth.uid()) AND (company_id IS NULL OR company_id = public.current_company_id()))
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can update technical_sheet_ingredients"
  ON public.technical_sheet_ingredients FOR UPDATE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete technical_sheet_ingredients" ON public.technical_sheet_ingredients;
CREATE POLICY "Admins can delete technical_sheet_ingredients"
  ON public.technical_sheet_ingredients FOR DELETE
  USING (
    (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
    OR public.is_superadmin(auth.uid())
  );
