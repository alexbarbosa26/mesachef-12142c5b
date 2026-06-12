
-- whatsapp_config: non-sensitive settings, admin-managed per company
CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  base_url TEXT,
  instance TEXT,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  schedule_time TIME NOT NULL DEFAULT '08:00',
  frequency TEXT NOT NULL DEFAULT 'daily',
  only_low_stock BOOLEAN NOT NULL DEFAULT true,
  include_all_monitored BOOLEAN NOT NULL DEFAULT false,
  send_when_healthy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view their company whatsapp config"
ON public.whatsapp_config FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins insert their company whatsapp config"
ON public.whatsapp_config FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins update their company whatsapp config"
ON public.whatsapp_config FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id())
WITH CHECK (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE POLICY "Admins delete their company whatsapp config"
ON public.whatsapp_config FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) AND company_id = public.current_company_id());

CREATE TRIGGER set_whatsapp_config_company
BEFORE INSERT ON public.whatsapp_config
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_on_insert();

CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- whatsapp_credentials: API key only, NOT readable/writable from client
CREATE TABLE public.whatsapp_credentials (
  company_id UUID PRIMARY KEY,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.whatsapp_credentials TO service_role;
-- No grants to authenticated/anon: only edge functions with service role can read/write.

ALTER TABLE public.whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- Restrictive: deny all to authenticated even if grants change.
CREATE POLICY "No client access to credentials"
ON public.whatsapp_credentials FOR ALL TO authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER update_whatsapp_credentials_updated_at
BEFORE UPDATE ON public.whatsapp_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: admins can check whether credentials exist for their company (boolean only)
CREATE OR REPLACE FUNCTION public.whatsapp_has_credentials()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_credentials
    WHERE company_id = public.current_company_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.whatsapp_has_credentials() TO authenticated;
