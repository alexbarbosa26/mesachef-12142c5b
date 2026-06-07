ALTER TABLE public.technical_sheets
ADD COLUMN IF NOT EXISTS pricing_basis text NOT NULL DEFAULT 'unit'
CHECK (pricing_basis IN ('unit', 'kg', 'portion'));