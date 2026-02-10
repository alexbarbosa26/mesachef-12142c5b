-- Fix: Both UPDATE policies must be PERMISSIVE for OR logic to work
-- Currently both are RESTRICTIVE which requires ALL to pass (impossible for staff)

DROP POLICY IF EXISTS "Admins can update stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Staff can update assigned stock quantities" ON public.stock_items;

CREATE POLICY "Admins can update stock_items"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff can update assigned stock quantities"
ON public.stock_items
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  (auth.uid() IS NOT NULL)
  AND ((responsible_user IS NULL) OR (responsible_user = auth.uid()))
)
WITH CHECK (auth.uid() IS NOT NULL);