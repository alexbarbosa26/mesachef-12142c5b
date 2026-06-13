import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StockItemRow {
  name: string;
  unit: string;
  current_quantity: number;
  minimum_stock: number;
  is_active: boolean;
}

interface ConfigRow {
  company_id: string;
  enabled: boolean;
  recipients: string[];
  schedule_time: string | null;
  frequency: string | null;
  include_all_monitored: boolean;
  send_when_healthy: boolean;
  last_sent_at: string | null;
  interval_minutes: number | null;
  days_of_week: number[] | null;
  day_of_month: number | null;
}

function normalizeNumber(n: string): string {
  return n.replace(/\D/g, "");
}

function maskNumber(n: string): string {
  const d = normalizeNumber(n);
  if (d.length <= 4) return "****";
  return d.slice(0, 2) + "****" + d.slice(-2);
}

function buildReport(items: StockItemRow[], companyName: string, includeAll: boolean) {
  const active = items.filter((i) => i.is_active);
  const zeroed = active.filter((i) => Number(i.current_quantity) <= 0);
  const low = active.filter(
    (i) =>
      Number(i.current_quantity) > 0 &&
      Number(i.minimum_stock) > 0 &&
      Number(i.current_quantity) < Number(i.minimum_stock),
  );
  const date = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const lines: string[] = [];
  lines.push(`*Relatório de Estoque - ${companyName}*`);
  lines.push(`Data: ${date}`);
  lines.push("");
  if (zeroed.length > 0) {
    lines.push("*Itens zerados:*");
    zeroed.forEach((i) => lines.push(`• ${i.name}: 0 ${i.unit}`));
    lines.push("");
  }
  if (low.length > 0) {
    lines.push("*Itens abaixo do mínimo:*");
    low.forEach((i) =>
      lines.push(`• ${i.name}: atual ${i.current_quantity} ${i.unit} | mínimo ${i.minimum_stock} ${i.unit}`),
    );
    lines.push("");
  }
  if (includeAll) {
    const others = active.filter((i) => !zeroed.includes(i) && !low.includes(i));
    if (others.length > 0) {
      lines.push("*Outros itens monitorados:*");
      others.forEach((i) => lines.push(`• ${i.name}: ${i.current_quantity} ${i.unit}`));
      lines.push("");
    }
  }
  lines.push("*Resumo:*");
  lines.push(`- ${zeroed.length} itens zerados`);
  lines.push(`- ${low.length} itens abaixo do mínimo`);
  lines.push(`- ${zeroed.length + low.length} itens precisam de atenção`);
  return { text: lines.join("\n"), zeroCount: zeroed.length, lowCount: low.length };
}

type Provider = "evolution_go" | "evolution_api_v2";

function diagnoseError(status: number): string {
  if (status === 401) return "AUTH_INVALID";
  if (status === 403) return "AUTH_FORBIDDEN";
  if (status === 404) return "ENDPOINT_NOT_FOUND";
  if (status === 408 || status === 504) return "TIMEOUT";
  if (status === 502 || status === 503) return "PROVIDER_UNAVAILABLE";
  return String(status);
}

async function sendWhatsAppMessage(args: {
  provider: Provider;
  baseUrl: string;
  instance: string;
  instanceId: string | null;
  apiKey: string;
  number: string;
  text: string;
}) {
  const base = args.baseUrl.replace(/\/+$/, "");
  const started = Date.now();
  let url: string;
  let payload: string;
  if (args.provider === "evolution_api_v2") {
    url = `${base}/message/sendText/${encodeURIComponent(args.instance)}`;
    payload = JSON.stringify({ number: normalizeNumber(args.number), text: args.text });
  } else {
    url = `${base}/send/text`;
    payload = JSON.stringify({
      id: args.instanceId || args.instance,
      number: normalizeNumber(args.number),
      text: args.text,
      delay: 1000,
    });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: args.apiKey },
    body: payload,
  });
  const body = await res.text();
  if (res.ok) return { body, attempts: 1, response_time_ms: Date.now() - started, status: res.status };
  const err: Error & {
    status?: number; attempts?: number; response_time_ms?: number; error_code?: string;
  } = new Error(`Evolution ${args.provider} ${res.status}: ${body.slice(0, 200)}`);
  err.status = res.status;
  err.attempts = 1;
  err.response_time_ms = Date.now() - started;
  err.error_code = diagnoseError(res.status);
  throw err;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate cron caller via shared secret stored in DB (service-role only)
    const provided = req.headers.get("x-cron-secret");
    const { data: secretRow } = await admin
      .from("cron_secrets")
      .select("value")
      .eq("name", "whatsapp_cron")
      .maybeSingle();
    const expected = (secretRow as { value: string } | null)?.value;
    if (!expected || !provided || provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Current time in America/Sao_Paulo
    const brParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
      year: "numeric", weekday: "short", hour12: false,
    }).formatToParts(new Date());
    const pm: Record<string, string> = {};
    brParts.forEach((p) => (pm[p.type] = p.value));
    const brHour = parseInt(pm.hour ?? "0");
    const brMin = parseInt(pm.minute ?? "0");
    const brDay = parseInt(pm.day ?? "0");
    const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const brWeekday = wdMap[pm.weekday ?? "Sun"] ?? 0;
    const nowMinutes = brHour * 60 + brMin;
    const todayBR = `${pm.year}-${pm.month}-${pm.day}`;
    const WINDOW = 5; // cron tick window in minutes

    function inTimeWindow(scheduleTime: string | null): boolean {
      if (!scheduleTime) return false;
      const [sh, sm] = scheduleTime.split(":");
      const sched = parseInt(sh) * 60 + parseInt(sm);
      const diff = nowMinutes - sched;
      return diff >= 0 && diff < WINDOW;
    }
    function alreadySentToday(lastSent: string | null): boolean {
      if (!lastSent) return false;
      const lastBR = new Date(lastSent).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      return lastBR === todayBR;
    }
    function shouldFire(c: ConfigRow): boolean {
      const freq = (c.frequency ?? "daily").toLowerCase();
      if (freq === "interval") {
        const mins = c.interval_minutes ?? 0;
        if (mins < 5) return false;
        if (!c.last_sent_at) return true;
        return Date.now() - new Date(c.last_sent_at).getTime() >= mins * 60 * 1000;
      }
      if (freq === "hourly") {
        const targetMin = c.schedule_time ? parseInt(c.schedule_time.split(":")[1]) : 0;
        const diff = brMin - targetMin;
        if (diff < 0 || diff >= WINDOW) return false;
        if (c.last_sent_at) {
          const lastHourKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
          }).format(new Date(c.last_sent_at));
          const nowHourKey = `${todayBR}, ${String(brHour).padStart(2, "0")}`;
          if (lastHourKey === nowHourKey) return false;
        }
        return true;
      }
      if (freq === "daily") {
        return inTimeWindow(c.schedule_time) && !alreadySentToday(c.last_sent_at);
      }
      if (freq === "weekly") {
        const days = c.days_of_week ?? [];
        return days.includes(brWeekday) && inTimeWindow(c.schedule_time) && !alreadySentToday(c.last_sent_at);
      }
      if (freq === "monthly") {
        return c.day_of_month === brDay && inTimeWindow(c.schedule_time) && !alreadySentToday(c.last_sent_at);
      }
      return false;
    }

    const { data: cfgs, error: cfgErr } = await admin
      .from("whatsapp_config")
      .select(
        "company_id, enabled, recipients, schedule_time, frequency, include_all_monitored, send_when_healthy, last_sent_at, interval_minutes, days_of_week, day_of_month",
      )
      .eq("enabled", true);
    if (cfgErr) {
      console.error("cfg query error");
      return new Response(JSON.stringify({ error: "config_query_failed" }), { status: 500 });
    }

    // Load global Evolution GO config once
    const { data: globalRow } = await admin
      .from("whatsapp_global_config")
      .select("enabled, base_url, instance, instance_id, api_key, provider")
      .eq("singleton", true)
      .maybeSingle();
    const global = globalRow as
      | { enabled: boolean; base_url: string | null; instance: string | null; instance_id: string | null; api_key: string | null; provider: string | null }
      | null;
    const globalReady = !!(global?.enabled && global.base_url && global.instance && global.api_key);
    const provider: Provider = global?.provider === "evolution_api_v2" ? "evolution_api_v2" : "evolution_go";

    const results: Array<Record<string, unknown>> = [];
    for (const c of (cfgs ?? []) as ConfigRow[]) {
      if (!c.recipients || c.recipients.length === 0) continue;
      if (!shouldFire(c)) continue;

      if (!globalReady) {
        await admin.from("whatsapp_send_logs").insert({
          company_id: c.company_id,
          send_type: "stock_alert",
          origin: "schedule",
          status: "failure",
          instance_name: global?.instance ?? null,
          error_code: "GLOBAL_DISABLED",
          error_message: "Integração global Evolution GO desativada ou incompleta.",
          attempts: 0,
        });
        await admin
          .from("whatsapp_config")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("company_id", c.company_id);
        results.push({ company_id: c.company_id, skipped: "global_disabled" });
        continue;
      }
      const apiKey = global!.api_key!;
      const baseUrl = global!.base_url!;
      const instance = global!.instance!;
      const instanceId = global!.instance_id;

      const { data: items } = await admin
        .from("stock_items")
        .select("name, unit, current_quantity, minimum_stock, is_active")
        .eq("company_id", c.company_id);
      const { data: company } = await admin
        .from("companies")
        .select("name")
        .eq("id", c.company_id)
        .maybeSingle();
      const companyName = (company as { name: string } | null)?.name ?? "Empresa";

      const { text, zeroCount, lowCount } = buildReport(
        (items ?? []) as StockItemRow[],
        companyName,
        c.include_all_monitored,
      );
      const hasAlerts = zeroCount + lowCount > 0;
      if (!hasAlerts && !c.send_when_healthy) {
        await admin
          .from("whatsapp_config")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("company_id", c.company_id);
        results.push({ company_id: c.company_id, skipped: "healthy" });
        continue;
      }
      const finalText = hasAlerts
        ? text
        : `*Estoque saudável - ${companyName}*\nData: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n\nNenhum item zerado ou abaixo do mínimo. 🎉`;

      let sent = 0;
      let failed = 0;
      for (const number of c.recipients) {
        try {
          const r = await sendWhatsAppMessage({
            provider, baseUrl, instance, instanceId, apiKey, number, text: finalText,
          });
          sent++;
          await admin.from("whatsapp_send_logs").insert({
            company_id: c.company_id,
            send_type: hasAlerts ? "stock_alert" : "healthy_report",
            origin: "schedule",
            status: "success",
            destination_masked: maskNumber(number),
            instance_name: instance,
            attempts: r.attempts,
            response_time_ms: r.response_time_ms,
          });
        } catch (e: any) {
          console.error("send failed for company", c.company_id);
          failed++;
          await admin.from("whatsapp_send_logs").insert({
            company_id: c.company_id,
            send_type: hasAlerts ? "stock_alert" : "healthy_report",
            origin: "schedule",
            status: "failure",
            destination_masked: maskNumber(number),
            instance_name: instance,
            error_code: e?.error_code ?? (e?.status ? String(e.status) : null),
            error_message: String(e?.message ?? "").slice(0, 300),
            attempts: e?.attempts ?? 1,
            response_time_ms: e?.response_time_ms ?? null,
          });
        }
      }
      await admin
        .from("whatsapp_config")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("company_id", c.company_id);
      results.push({ company_id: c.company_id, sent, failed });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron runner error");
    return new Response(JSON.stringify({ error: "internal" }), { status: 500 });
  }
});