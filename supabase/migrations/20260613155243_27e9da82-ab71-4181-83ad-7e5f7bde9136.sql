DROP POLICY IF EXISTS "No client writes to whatsapp logs" ON public.whatsapp_send_logs;
CREATE POLICY "No client writes to whatsapp logs"
  ON public.whatsapp_send_logs
  AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);
CREATE POLICY "No client updates to whatsapp logs"
  ON public.whatsapp_send_logs
  AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes to whatsapp logs"
  ON public.whatsapp_send_logs
  AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);
GRANT SELECT ON public.whatsapp_send_logs TO authenticated;
GRANT ALL ON public.whatsapp_send_logs TO service_role;