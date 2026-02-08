-- Tabela para vincular ingredientes (itens de estoque) às fichas técnicas
CREATE TABLE public.technical_sheet_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technical_sheet_id UUID NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_type TEXT NOT NULL DEFAULT 'g' CHECK (unit_type IN ('g', 'kg', 'ml', 'l', 'unidade')),
  calculated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technical_sheet_id, stock_item_id)
);

-- Índices para performance
CREATE INDEX idx_tsi_technical_sheet ON public.technical_sheet_ingredients(technical_sheet_id);
CREATE INDEX idx_tsi_stock_item ON public.technical_sheet_ingredients(stock_item_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_technical_sheet_ingredients_updated_at
  BEFORE UPDATE ON public.technical_sheet_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Apenas Admins podem gerenciar ingredientes das fichas técnicas
ALTER TABLE public.technical_sheet_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view technical_sheet_ingredients" 
  ON public.technical_sheet_ingredients 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert technical_sheet_ingredients" 
  ON public.technical_sheet_ingredients 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update technical_sheet_ingredients" 
  ON public.technical_sheet_ingredients 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete technical_sheet_ingredients" 
  ON public.technical_sheet_ingredients 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));