---
name: WhatsApp Evolution GO integration
description: Global Evolution GO credentials (superadmin) shared by all tenants; per-tenant only preferences
type: feature
---
Tables:
- `whatsapp_global_config` (singleton, superadmin-only): `enabled`, `provider` (`evolution_go` | `evolution_api_v2`), `base_url`, `instance`, `instance_id`, `api_key`, `updated_by`. Service-role only — RESTRICTIVE deny-all RLS for anon/authenticated.
- `whatsapp_config` (per-company, admin RLS): preferences only — `enabled`, `recipients`, `schedule_time`, `frequency`, `interval_minutes`, `days_of_week`, `day_of_month`, `only_low_stock`, `include_all_monitored`, `send_when_healthy`, `last_sent_at`. `base_url`/`instance` columns exist but are NOT used (legacy).
- `whatsapp_credentials` (legacy per-tenant api_key) — no longer read; kept for backward compatibility.
- `whatsapp_send_logs` (superadmin RLS): monitoring only, no message content.
Edge function `whatsapp-manager` actions: `get_status` (returns global_enabled/global_configured), `test_send`, `send_report` (admin); `get_global_config`, `save_global_config`, `test_global` (superadmin only). Validates JWT, resolves company_id from caller profile.
Send dispatcher `sendWhatsAppMessage({provider,...})`:
- `evolution_go` → `POST {base_url}/send/text`, header `apikey`, body `{ id: instance_id || instance, number, text, delay: 1000 }`.
- `evolution_api_v2` → `POST {base_url}/message/sendText/{instance}`, header `apikey`, body `{ number, text }`.
Error codes recorded in `whatsapp_send_logs.error_code`: `AUTH_INVALID` (401), `AUTH_FORBIDDEN` (403), `ENDPOINT_NOT_FOUND` (404), `TIMEOUT` (408/504), `PROVIDER_UNAVAILABLE` (502/503), `GLOBAL_DISABLED`, `NO_RECIPIENTS`.
Pages: `/whatsapp` (admin only — preferences); `/whatsapp-global` (superadmin only — global Evolution GO credentials); `/whatsapp-monitor` (superadmin only — send logs).
Scheduling: pg_cron job `whatsapp-daily-report` runs every 5 min and calls edge function `whatsapp-cron-runner`.
Auth: `x-cron-secret` header compared against `public.cron_secrets` (name='whatsapp_cron', service_role only).
Per-tenant frequency in `whatsapp_config.frequency`: `interval` (uses `interval_minutes`, min 5), `hourly` (uses minute portion of `schedule_time`), `daily` (uses `schedule_time`), `weekly` (uses `days_of_week` + `schedule_time`, 0=Sun..6=Sat), `monthly` (uses `day_of_month` + `schedule_time`).
Runner uses America/Sao_Paulo timezone with a 5-min firing window; updates `whatsapp_config.last_sent_at` after each send to prevent duplicates.
Send pipeline (manager + cron): always reads URL/instance/API key from `whatsapp_global_config`. If global integration is disabled or incomplete, records a `whatsapp_send_logs` row with `error_code='GLOBAL_DISABLED'` for the affected tenant and aborts. Manual `send_report` with no recipients logs `error_code='NO_RECIPIENTS'`. No message content is ever stored.