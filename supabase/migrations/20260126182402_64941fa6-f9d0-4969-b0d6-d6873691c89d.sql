-- Fix INPUT_VALIDATION: Add database CHECK constraints for data integrity

-- Profiles table constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT check_full_name_length 
CHECK (length(full_name) <= 100 AND length(full_name) > 0);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_email_format
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Stock items constraints  
ALTER TABLE public.stock_items 
ADD CONSTRAINT check_quantity_non_negative 
CHECK (current_quantity >= 0);

ALTER TABLE public.stock_items 
ADD CONSTRAINT check_minimum_stock_non_negative 
CHECK (minimum_stock >= 0);

ALTER TABLE public.stock_items 
ADD CONSTRAINT check_name_length
CHECK (length(name) <= 200 AND length(name) > 0);

ALTER TABLE public.stock_items 
ADD CONSTRAINT check_unit_length
CHECK (length(unit) <= 50 AND length(unit) > 0);

-- Categories constraints
ALTER TABLE public.categories 
ADD CONSTRAINT check_category_name_length
CHECK (length(name) <= 100 AND length(name) > 0);

-- Settings constraints
ALTER TABLE public.settings 
ADD CONSTRAINT check_key_length
CHECK (length(key) <= 100 AND length(key) > 0);

ALTER TABLE public.settings 
ADD CONSTRAINT check_value_length
CHECK (length(value) <= 1000);

-- Fix missing_stock_history_trigger: Add automatic audit logging for stock changes

-- Function to log stock changes
CREATE OR REPLACE FUNCTION public.log_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if quantity actually changed
  IF OLD.current_quantity IS DISTINCT FROM NEW.current_quantity THEN
    INSERT INTO public.stock_history (
      item_id,
      previous_quantity,
      new_quantity,
      changed_by,
      change_type
    ) VALUES (
      NEW.id,
      OLD.current_quantity,
      NEW.current_quantity,
      auth.uid(),
      CASE
        WHEN NEW.current_quantity > OLD.current_quantity THEN 'increase'
        WHEN NEW.current_quantity < OLD.current_quantity THEN 'decrease'
        ELSE 'update'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic stock history logging
CREATE TRIGGER track_stock_changes
  AFTER UPDATE ON public.stock_items
  FOR EACH ROW
  WHEN (OLD.current_quantity IS DISTINCT FROM NEW.current_quantity)
  EXECUTE FUNCTION public.log_stock_change();

-- Add indexes for better query performance on stock_history
CREATE INDEX IF NOT EXISTS idx_stock_history_item_id ON public.stock_history(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON public.stock_history(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_history_changed_by ON public.stock_history(changed_by);