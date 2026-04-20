
-- Enum for adjustment types
CREATE TYPE public.adjustment_type AS ENUM ('perda', 'quebra', 'erro_operacional');

-- Enum for snapshot status
CREATE TYPE public.cmv_status AS ENUM ('normal', 'alerta', 'critico');

-- Table: stock_purchases (registro de compras)
CREATE TABLE public.stock_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  supplier_name TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock_purchases" ON public.stock_purchases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert stock_purchases" ON public.stock_purchases
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update stock_purchases" ON public.stock_purchases
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete stock_purchases" ON public.stock_purchases
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_stock_purchases_updated_at
  BEFORE UPDATE ON public.stock_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: cmv_snapshots (snapshots semanais/mensais)
CREATE TABLE public.cmv_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  initial_stock_value NUMERIC NOT NULL DEFAULT 0,
  purchases_value NUMERIC NOT NULL DEFAULT 0,
  final_stock_value NUMERIC NOT NULL DEFAULT 0,
  theoretical_cmv NUMERIC NOT NULL DEFAULT 0,
  real_cmv NUMERIC NOT NULL DEFAULT 0,
  difference_value NUMERIC NOT NULL DEFAULT 0,
  difference_pct NUMERIC NOT NULL DEFAULT 0,
  status public.cmv_status NOT NULL DEFAULT 'normal',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cmv_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cmv_snapshots" ON public.cmv_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert cmv_snapshots" ON public.cmv_snapshots
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update cmv_snapshots" ON public.cmv_snapshots
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete cmv_snapshots" ON public.cmv_snapshots
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_cmv_snapshots_updated_at
  BEFORE UPDATE ON public.cmv_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: stock_adjustments (ajustes de divergência)
CREATE TABLE public.stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.cmv_snapshots(id) ON DELETE SET NULL,
  theoretical_quantity NUMERIC NOT NULL DEFAULT 0,
  physical_quantity NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  adjustment_type public.adjustment_type NOT NULL DEFAULT 'perda',
  value_impact NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock_adjustments" ON public.stock_adjustments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert stock_adjustments" ON public.stock_adjustments
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update stock_adjustments" ON public.stock_adjustments
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete stock_adjustments" ON public.stock_adjustments
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_stock_adjustments_updated_at
  BEFORE UPDATE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_stock_purchases_item_id ON public.stock_purchases(stock_item_id);
CREATE INDEX idx_stock_purchases_date ON public.stock_purchases(purchase_date);
CREATE INDEX idx_cmv_snapshots_period ON public.cmv_snapshots(period_start, period_end);
CREATE INDEX idx_stock_adjustments_item_id ON public.stock_adjustments(stock_item_id);
CREATE INDEX idx_stock_adjustments_snapshot_id ON public.stock_adjustments(snapshot_id);
