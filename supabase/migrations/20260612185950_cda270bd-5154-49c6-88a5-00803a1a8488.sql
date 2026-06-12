ALTER TABLE public.pricing_config_global
  ADD COLUMN IF NOT EXISTS monthly_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_fixed_costs numeric NOT NULL DEFAULT 0;