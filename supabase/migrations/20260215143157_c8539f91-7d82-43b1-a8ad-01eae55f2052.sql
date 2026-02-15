
ALTER TABLE public.technical_sheets
ADD COLUMN price_per_kg numeric NOT NULL DEFAULT 0,
ADD COLUMN price_per_portion numeric NOT NULL DEFAULT 0;
