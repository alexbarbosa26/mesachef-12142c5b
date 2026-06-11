
-- Permite que uma ficha técnica seja usada como ingrediente de outra ficha técnica.

ALTER TABLE public.technical_sheet_ingredients
  ALTER COLUMN stock_item_id DROP NOT NULL;

ALTER TABLE public.technical_sheet_ingredients
  ADD COLUMN IF NOT EXISTS linked_sheet_id uuid NULL REFERENCES public.technical_sheets(id) ON DELETE RESTRICT;

ALTER TABLE public.technical_sheet_ingredients
  ADD COLUMN IF NOT EXISTS component_type text NOT NULL DEFAULT 'stock';

-- Exatamente um vínculo: insumo OU ficha
ALTER TABLE public.technical_sheet_ingredients
  DROP CONSTRAINT IF EXISTS tsi_one_link_only;
ALTER TABLE public.technical_sheet_ingredients
  ADD CONSTRAINT tsi_one_link_only CHECK (
    ((stock_item_id IS NOT NULL)::int + (linked_sheet_id IS NOT NULL)::int) = 1
  );

ALTER TABLE public.technical_sheet_ingredients
  DROP CONSTRAINT IF EXISTS tsi_component_type_valid;
ALTER TABLE public.technical_sheet_ingredients
  ADD CONSTRAINT tsi_component_type_valid CHECK (component_type IN ('stock','sheet'));

CREATE INDEX IF NOT EXISTS idx_tsi_linked_sheet ON public.technical_sheet_ingredients(linked_sheet_id);

-- Trigger para evitar ciclos
CREATE OR REPLACE FUNCTION public.check_sheet_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found uuid;
BEGIN
  IF NEW.linked_sheet_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.linked_sheet_id = NEW.technical_sheet_id THEN
    RAISE EXCEPTION 'Uma ficha técnica não pode referenciar a si mesma';
  END IF;
  WITH RECURSIVE descendants AS (
    SELECT linked_sheet_id AS sheet_id
      FROM public.technical_sheet_ingredients
      WHERE technical_sheet_id = NEW.linked_sheet_id
        AND linked_sheet_id IS NOT NULL
    UNION
    SELECT i.linked_sheet_id
      FROM public.technical_sheet_ingredients i
      JOIN descendants d ON i.technical_sheet_id = d.sheet_id
      WHERE i.linked_sheet_id IS NOT NULL
  )
  SELECT sheet_id INTO found FROM descendants WHERE sheet_id = NEW.technical_sheet_id LIMIT 1;
  IF found IS NOT NULL THEN
    RAISE EXCEPTION 'Vínculo circular entre fichas técnicas detectado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_sheet_no_cycle ON public.technical_sheet_ingredients;
CREATE TRIGGER trg_check_sheet_no_cycle
BEFORE INSERT OR UPDATE ON public.technical_sheet_ingredients
FOR EACH ROW EXECUTE FUNCTION public.check_sheet_no_cycle();
