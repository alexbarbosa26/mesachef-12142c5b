-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can update stock quantities only" ON public.stock_items;

-- Create a more restrictive policy: Staff can only update quantity and expiry_date
-- They can only update items where they are the responsible_user, or if responsible_user is NULL
CREATE POLICY "Staff can update assigned stock quantities" 
ON public.stock_items 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (responsible_user IS NULL OR responsible_user = auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (responsible_user IS NULL OR responsible_user = auth.uid())
);

-- Create a trigger function to enforce field-level restrictions for non-admin users
CREATE OR REPLACE FUNCTION public.check_stock_update_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is admin, allow all changes
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- For non-admin users, only allow changes to specific fields
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    RAISE EXCEPTION 'Staff cannot modify item name';
  END IF;
  
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    RAISE EXCEPTION 'Staff cannot modify item category';
  END IF;
  
  IF OLD.unit IS DISTINCT FROM NEW.unit THEN
    RAISE EXCEPTION 'Staff cannot modify item unit';
  END IF;
  
  IF OLD.minimum_stock IS DISTINCT FROM NEW.minimum_stock THEN
    RAISE EXCEPTION 'Staff cannot modify minimum stock';
  END IF;
  
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    RAISE EXCEPTION 'Staff cannot modify item value';
  END IF;
  
  IF OLD.responsible_user IS DISTINCT FROM NEW.responsible_user THEN
    RAISE EXCEPTION 'Staff cannot modify responsible user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_stock_update_permissions ON public.stock_items;
CREATE TRIGGER enforce_stock_update_permissions
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_update_permissions();