-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Staff can update stock quantities" ON public.stock_items;

-- Create more specific policy for stock updates
CREATE POLICY "Authenticated users can update stock quantities" 
ON public.stock_items FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);