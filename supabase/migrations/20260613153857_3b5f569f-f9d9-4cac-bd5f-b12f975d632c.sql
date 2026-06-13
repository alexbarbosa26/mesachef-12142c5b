
-- Fix 1: whatsapp_credentials — replace permissive USING(false) with RESTRICTIVE deny-all
DROP POLICY IF EXISTS "No client access to credentials" ON public.whatsapp_credentials;
CREATE POLICY "Deny all client access to credentials"
  ON public.whatsapp_credentials
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Fix 2: Ensure trigger enforcing staff-only-quantity rule is attached to stock_items
DROP TRIGGER IF EXISTS enforce_stock_update_permissions ON public.stock_items;
CREATE TRIGGER enforce_stock_update_permissions
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_update_permissions();
