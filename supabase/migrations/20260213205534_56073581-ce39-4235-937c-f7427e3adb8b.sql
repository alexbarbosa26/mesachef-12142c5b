
-- Fix stock_items UPDATE policies: ensure they are PERMISSIVE for OR logic
-- The trigger check_stock_update_permissions handles field-level security for staff

DROP POLICY IF EXISTS "Admins can update stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Staff can update stock quantities" ON public.stock_items;

-- Admin: full update access (PERMISSIVE)
CREATE POLICY "Admins can update stock_items"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Staff: any authenticated user can attempt update; trigger restricts fields (PERMISSIVE)
CREATE POLICY "Staff can update stock quantities"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
