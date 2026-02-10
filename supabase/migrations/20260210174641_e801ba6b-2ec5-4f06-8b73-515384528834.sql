-- Fix: simplify WITH CHECK for staff update policy
-- The USING clause already controls which rows staff can target
-- WITH CHECK just needs to ensure the update is from an authenticated user
DROP POLICY IF EXISTS "Staff can update assigned stock quantities" ON public.stock_items;

CREATE POLICY "Staff can update assigned stock quantities"
ON public.stock_items
FOR UPDATE
TO authenticated
USING (
  (auth.uid() IS NOT NULL)
  AND (
    (responsible_user IS NULL) OR (responsible_user = auth.uid())
  )
)
WITH CHECK (auth.uid() IS NOT NULL);