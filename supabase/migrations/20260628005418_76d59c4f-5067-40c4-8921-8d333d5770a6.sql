
-- Seed pricing_config_global automatically for every new company
CREATE OR REPLACE FUNCTION public.seed_default_pricing_config_global()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.pricing_config_global (company_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_pricing_config_global ON public.companies;
CREATE TRIGGER trg_seed_pricing_config_global
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.seed_default_pricing_config_global();

-- Backfill any existing companies that don't have a pricing config yet
INSERT INTO public.pricing_config_global (company_id)
SELECT c.id
FROM public.companies c
LEFT JOIN public.pricing_config_global pcg ON pcg.company_id = c.id
WHERE pcg.id IS NULL;
