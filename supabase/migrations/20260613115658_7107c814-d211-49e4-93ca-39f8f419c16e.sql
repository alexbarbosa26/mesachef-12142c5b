-- Explicit deny-all policy on cron_secrets for defense-in-depth.
-- service_role bypasses RLS, so backend cron runner is unaffected.
DROP POLICY IF EXISTS "Deny all client access to cron_secrets" ON public.cron_secrets;
CREATE POLICY "Deny all client access to cron_secrets"
ON public.cron_secrets
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Ensure no client roles have table privileges (service_role bypasses RLS regardless).
REVOKE ALL ON public.cron_secrets FROM anon, authenticated;
GRANT ALL ON public.cron_secrets TO service_role;