ALTER TABLE public.whatsapp_global_config
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution_go',
  ADD COLUMN IF NOT EXISTS instance_id text;

ALTER TABLE public.whatsapp_global_config
  DROP CONSTRAINT IF EXISTS whatsapp_global_config_provider_check;
ALTER TABLE public.whatsapp_global_config
  ADD CONSTRAINT whatsapp_global_config_provider_check
  CHECK (provider IN ('evolution_go','evolution_api_v2'));