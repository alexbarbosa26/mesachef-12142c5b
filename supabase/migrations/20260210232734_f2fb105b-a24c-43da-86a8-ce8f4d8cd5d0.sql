-- Remove ALL old update policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can update stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Staff can update assigned stock quantities" ON public.stock_items;
DROP POLICY IF EXISTS "Staff can update stock quantities" ON public.stock_items;

-- Admin: full update access
CREATE POLICY "Admins can update stock_items"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Staff: any authenticated user can update (trigger restricts fields)
CREATE POLICY "Staff can update stock quantities"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);