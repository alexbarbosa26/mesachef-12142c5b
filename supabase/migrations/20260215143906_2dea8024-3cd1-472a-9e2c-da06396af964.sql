
ALTER TABLE public.technical_sheets
DROP COLUMN price_per_kg,
DROP COLUMN price_per_portion,
ADD COLUMN yield_kg numeric NOT NULL DEFAULT 0,
ADD COLUMN yield_portions numeric NOT NULL DEFAULT 0;
