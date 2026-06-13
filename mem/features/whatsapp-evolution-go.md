---
name: WhatsApp Evolution GO integration
description: Per-tenant WhatsApp alerts via Evolution GO; API key stored server-side only
type: feature
---
Tables: `whatsapp_config` (per-company settings, admin RLS) and `whatsapp_credentials` (api_key only, no client grants — service_role only).
Edge function `whatsapp-manager` handles actions: `save_credentials`, `get_status`, `test_send`, `send_report`. Validates JWT, resolves company_id from caller profile (never trust client).
Evolution endpoint: `POST {base_url}/message/sendText/{instance}` with header `apikey` and body `{ number, text }`.
Page: `/whatsapp` (admin only). Reads `whatsapp_config` directly via RLS; reads/writes api_key only through the edge function.
Daily scheduling: pg_cron job `whatsapp-daily-report` runs every 15 min and calls edge function `whatsapp-cron-runner`.
Auth: `x-cron-secret` header compared against `public.cron_secrets` (name='whatsapp_cron', service_role only). No env var needed.
Runner uses America/Sao_Paulo timezone, sends if `schedule_time` falls in the last 15 min and `last_sent_at` is not today. Updates `whatsapp_config.last_sent_at` after send.