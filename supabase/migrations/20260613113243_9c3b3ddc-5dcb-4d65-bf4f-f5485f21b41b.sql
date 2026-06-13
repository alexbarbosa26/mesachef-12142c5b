
-- Extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Track last sent to avoid duplicate daily sends
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

-- Internal secrets table (service_role only, never exposed to clients)
CREATE TABLE IF NOT EXISTS public.cron_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_secrets TO service_role;
-- Intentionally NO grants to anon/authenticated.

ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;

-- No policies defined: only service_role bypasses RLS, so only edge functions can read.

INSERT INTO public.cron_secrets (name, value)
VALUES ('whatsapp_cron', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;
