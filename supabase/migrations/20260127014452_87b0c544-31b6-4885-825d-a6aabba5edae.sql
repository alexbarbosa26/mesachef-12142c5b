-- Add low_stock_percentage setting with default 20%
INSERT INTO public.settings (key, value)
VALUES ('low_stock_percentage', '20')
ON CONFLICT (key) DO NOTHING;