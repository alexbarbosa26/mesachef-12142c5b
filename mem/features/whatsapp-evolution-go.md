---
name: WhatsApp Evolution GO integration
description: Per-tenant WhatsApp alerts via Evolution GO; API key stored server-side only
type: feature
---
Tables: `whatsapp_config` (per-company settings, admin RLS) and `whatsapp_credentials` (api_key only, no client grants — service_role only).
Edge function `whatsapp-manager` handles actions: `save_credentials`, `get_status`, `test_send`, `send_report`. Validates JWT, resolves company_id from caller profile (never trust client).
Evolution endpoint: `POST {base_url}/message/sendText/{instance}` with header `apikey` and body `{ number, text }`.
Page: `/whatsapp` (admin only). Reads `whatsapp_config` directly via RLS; reads/writes api_key only through the edge function.
Scheduling: pg_cron job `whatsapp-daily-report` runs every 5 min and calls edge function `whatsapp-cron-runner`.
Auth: `x-cron-secret` header compared against `public.cron_secrets` (name='whatsapp_cron', service_role only).
Per-tenant frequency in `whatsapp_config.frequency`: `interval` (uses `interval_minutes`, min 5), `hourly` (uses minute portion of `schedule_time`), `daily` (uses `schedule_time`), `weekly` (uses `days_of_week` + `schedule_time`, 0=Sun..6=Sat), `monthly` (uses `day_of_month` + `schedule_time`).
Runner uses America/Sao_Paulo timezone with a 5-min firing window; updates `whatsapp_config.last_sent_at` after each send to prevent duplicates.