
-- Singleton global Evolution GO config (superadmin only)
CREATE TABLE IF NOT EXISTS public.whatsapp_global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  base_url text,
  instance text,
  api_key text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_global_config_singleton_chk CHECK (singleton = true)
);

-- No grants to anon/authenticated: credenciais só via edge function (service_role)
REVOKE ALL ON public.whatsapp_global_config FROM anon, authenticated;
GRANT ALL ON public.whatsapp_global_config TO service_role;

ALTER TABLE public.whatsapp_global_config ENABLE ROW LEVEL SECURITY;

-- Deny-all explícito para defesa em profundidade (qualquer acesso só pelo service_role)
DROP POLICY IF EXISTS "wa_global_deny_all" ON public.whatsapp_global_config;
CREATE POLICY "wa_global_deny_all"
ON public.whatsapp_global_config
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_whatsapp_global_config_updated_at ON public.whatsapp_global_config;
CREATE TRIGGER trg_whatsapp_global_config_updated_at
BEFORE UPDATE ON public.whatsapp_global_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inicializa singleton
INSERT INTO public.whatsapp_global_config (singleton, enabled)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;
