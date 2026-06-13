
CREATE TABLE IF NOT EXISTS public.whatsapp_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  send_type TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL CHECK (status IN ('success','failure')),
  destination_masked TEXT,
  instance_name TEXT,
  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  response_time_ms INTEGER,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_company_attempted
  ON public.whatsapp_send_logs (company_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status_attempted
  ON public.whatsapp_send_logs (status, attempted_at DESC);

GRANT SELECT ON public.whatsapp_send_logs TO authenticated;
GRANT ALL ON public.whatsapp_send_logs TO service_role;

ALTER TABLE public.whatsapp_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all whatsapp logs"
  ON public.whatsapp_send_logs
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Block direct writes from clients; only service_role (edge functions) can insert
CREATE POLICY "No client writes to whatsapp logs"
  ON public.whatsapp_send_logs
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
