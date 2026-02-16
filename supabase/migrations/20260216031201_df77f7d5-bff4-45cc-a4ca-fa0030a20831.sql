-- Add sale_price column to technical_sheets for the user's actual selling price
ALTER TABLE public.technical_sheets
ADD COLUMN sale_price numeric NOT NULL DEFAULT 0;