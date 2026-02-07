-- Enum para categoria de produto
CREATE TYPE public.product_category AS ENUM ('cafe', 'doce', 'bolo', 'combo', 'salgado', 'bebida', 'outro');

-- Enum para unidade de venda
CREATE TYPE public.sale_unit AS ENUM ('unidade', 'fatia', 'copo', 'porcao', 'kg', 'litro');

-- Enum para status de precificação
CREATE TYPE public.pricing_status AS ENUM ('saudavel', 'atencao', 'inviavel');

-- Tabela de produtos para precificação
CREATE TABLE public.pricing_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'outro',
  sale_unit sale_unit NOT NULL DEFAULT 'unidade',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pricing_products_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Tabela de fichas técnicas (custos variáveis unitários)
CREATE TABLE public.technical_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.pricing_products(id) ON DELETE CASCADE,
  cmv NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cmv >= 0),
  labor_cost_per_hour NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (labor_cost_per_hour >= 0),
  prep_time_minutes INTEGER NOT NULL DEFAULT 0 CHECK (prep_time_minutes >= 0),
  packaging_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (packaging_cost >= 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Tabela de configuração global de percentuais
CREATE TABLE public.pricing_config_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_expenses_pct NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (variable_expenses_pct >= 0 AND variable_expenses_pct < 100),
  fixed_expenses_pct NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (fixed_expenses_pct >= 0 AND fixed_expenses_pct < 100),
  profit_pct NUMERIC(5,2) NOT NULL DEFAULT 15 CHECK (profit_pct >= 0 AND profit_pct < 100),
  investment_pct NUMERIC(5,2) NOT NULL DEFAULT 5 CHECK (investment_pct >= 0 AND investment_pct < 100),
  healthy_margin_threshold NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (healthy_margin_threshold >= 0 AND healthy_margin_threshold <= 100),
  price_proximity_factor NUMERIC(5,2) NOT NULL DEFAULT 1.05 CHECK (price_proximity_factor >= 1),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pct_sum_check CHECK ((variable_expenses_pct + fixed_expenses_pct + profit_pct + investment_pct) < 100)
);

-- Tabela de override de percentuais por produto
CREATE TABLE public.pricing_config_product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.pricing_products(id) ON DELETE CASCADE,
  variable_expenses_pct NUMERIC(5,2) CHECK (variable_expenses_pct >= 0 AND variable_expenses_pct < 100),
  fixed_expenses_pct NUMERIC(5,2) CHECK (fixed_expenses_pct >= 0 AND fixed_expenses_pct < 100),
  profit_pct NUMERIC(5,2) CHECK (profit_pct >= 0 AND profit_pct < 100),
  investment_pct NUMERIC(5,2) CHECK (investment_pct >= 0 AND investment_pct < 100),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Inserir configuração global padrão
INSERT INTO public.pricing_config_global (
  variable_expenses_pct,
  fixed_expenses_pct,
  profit_pct,
  investment_pct,
  healthy_margin_threshold,
  price_proximity_factor
) VALUES (10, 30, 15, 5, 50, 1.05);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.pricing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config_product ENABLE ROW LEVEL SECURITY;

-- Políticas para pricing_products: todos autenticados podem ver, apenas admin pode modificar
CREATE POLICY "Authenticated can view pricing_products"
  ON public.pricing_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert pricing_products"
  ON public.pricing_products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pricing_products"
  ON public.pricing_products FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete pricing_products"
  ON public.pricing_products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Políticas para technical_sheets: APENAS admin pode ver e modificar
CREATE POLICY "Admins can view technical_sheets"
  ON public.technical_sheets FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert technical_sheets"
  ON public.technical_sheets FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update technical_sheets"
  ON public.technical_sheets FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete technical_sheets"
  ON public.technical_sheets FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Políticas para pricing_config_global: APENAS admin pode ver e modificar
CREATE POLICY "Admins can view pricing_config_global"
  ON public.pricing_config_global FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pricing_config_global"
  ON public.pricing_config_global FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Políticas para pricing_config_product: APENAS admin pode ver e modificar
CREATE POLICY "Admins can view pricing_config_product"
  ON public.pricing_config_product FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert pricing_config_product"
  ON public.pricing_config_product FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pricing_config_product"
  ON public.pricing_config_product FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete pricing_config_product"
  ON public.pricing_config_product FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_pricing_products_updated_at
  BEFORE UPDATE ON public.pricing_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_sheets_updated_at
  BEFORE UPDATE ON public.technical_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_config_global_updated_at
  BEFORE UPDATE ON public.pricing_config_global
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_config_product_updated_at
  BEFORE UPDATE ON public.pricing_config_product
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();