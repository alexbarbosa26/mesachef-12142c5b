-- Fix: Allow any authenticated staff to update stock items
-- The trigger check_stock_update_permissions already restricts WHAT fields staff can change
-- RLS should not also restrict WHICH items staff can update

DROP POLICY IF EXISTS "Staff can update assigned stock quantities" ON public.stock_items;

CREATE POLICY "Staff can update stock quantities"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);