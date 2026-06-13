
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS interval_minutes integer,
  ADD COLUMN IF NOT EXISTS days_of_week integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS day_of_month integer;

-- Sanity checks via trigger (CHECK with NULL semantics works fine but keep simple constraints)
ALTER TABLE public.whatsapp_config
  DROP CONSTRAINT IF EXISTS whatsapp_config_interval_minutes_chk;
ALTER TABLE public.whatsapp_config
  ADD CONSTRAINT whatsapp_config_interval_minutes_chk
  CHECK (interval_minutes IS NULL OR (interval_minutes >= 5 AND interval_minutes <= 10080));

ALTER TABLE public.whatsapp_config
  DROP CONSTRAINT IF EXISTS whatsapp_config_day_of_month_chk;
ALTER TABLE public.whatsapp_config
  ADD CONSTRAINT whatsapp_config_day_of_month_chk
  CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31));
