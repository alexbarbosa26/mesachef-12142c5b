---
name: WhatsApp Evolution GO integration
description: Per-tenant WhatsApp alerts via Evolution GO; API key stored server-side only
type: feature
---
Tables: `whatsapp_config` (per-company settings, admin RLS) and `whatsapp_credentials` (api_key only, no client grants — service_role only).
Edge function `whatsapp-manager` handles actions: `save_credentials`, `get_status`, `test_send`, `send_report`. Validates JWT, resolves company_id from caller profile (never trust client).
Evolution endpoint: `POST {base_url}/message/sendText/{instance}` with header `apikey` and body `{ number, text }`.
Page: `/whatsapp` (admin only). Reads `whatsapp_config` directly via RLS; reads/writes api_key only through the edge function.
Daily scheduling (pg_cron) NOT yet implemented — only manual + test send.