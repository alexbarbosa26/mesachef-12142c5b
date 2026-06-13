import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

type Action =
  | "get_status"
  | "test_send"
  | "send_report"
  | "get_global_config"
  | "save_global_config"
  | "test_global";

interface Body {
  action: Action;
  test_number?: string;
  test_message?: string;
  global?: {
    enabled?: boolean;
    base_url?: string | null;
    instance?: string | null;
    api_key?: string | null; // optional: only updates when provided
    provider?: "evolution_go" | "evolution_api_v2" | null;
    instance_id?: string | null;
  };
}

interface StockItemRow {
  name: string;
  unit: string;
  current_quantity: number;
  minimum_stock: number;
  is_active: boolean;
}

interface WhatsappConfigRow {
  enabled: boolean;
  recipients: string[];
  only_low_stock: boolean;
  include_all_monitored: boolean;
  send_when_healthy: boolean;
}

interface GlobalConfigRow {
  enabled: boolean;
  base_url: string | null;
  instance: string | null;
  api_key: string | null;
  provider: string | null;
  instance_id: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

function safeErr(_e: unknown): string {
  return "Erro ao processar solicitação. Tente novamente.";
}

function normalizeNumber(n: string): string {
  return n.replace(/\D/g, "");
}

function maskNumber(n: string): string {
  const digits = normalizeNumber(n);
  if (digits.length <= 4) return "****";
  return digits.slice(0, 2) + "****" + digits.slice(-2);
}

type SendLog = {
  company_id: string;
  send_type: string;
  origin: string;
  status: "success" | "failure";
  destination_masked?: string | null;
  instance_name?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  attempts?: number;
  response_time_ms?: number | null;
};

async function recordLog(admin: ReturnType<typeof createClient>, entry: SendLog) {
  try {
    await admin.from("whatsapp_send_logs").insert(entry);
  } catch (_e) {
    // Never let logging break the send pipeline
  }
}

function buildReport(items: StockItemRow[], companyName: string, includeAll: boolean): {
  text: string;
  zeroCount: number;
  lowCount: number;
} {
  const active = items.filter((i) => i.is_active);
  const zeroed = active.filter((i) => Number(i.current_quantity) <= 0);
  const low = active.filter(
    (i) =>
      Number(i.current_quantity) > 0 &&
      Number(i.minimum_stock) > 0 &&
      Number(i.current_quantity) < Number(i.minimum_stock),
  );

  const date = new Date().toLocaleDateString("pt-BR");
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

interface SendArgs {
  provider: Provider;
  baseUrl: string;
  instance: string;
  instanceId: string | null;
  apiKey: string;
  number: string;
  text: string;
}

function diagnoseError(status: number): string | null {
  if (status === 401) return "AUTH_INVALID";
  if (status === 403) return "AUTH_FORBIDDEN";
  if (status === 404) return "ENDPOINT_NOT_FOUND";
  if (status === 408 || status === 504) return "TIMEOUT";
  if (status === 502 || status === 503) return "PROVIDER_UNAVAILABLE";
  return null;
}

async function sendWhatsAppMessage(args: SendArgs) {
  const base = args.baseUrl.replace(/\/+$/, "");
  const started = Date.now();
  let url: string;
  let payload: string;
  if (args.provider === "evolution_api_v2") {
    url = `${base}/message/sendText/${encodeURIComponent(args.instance)}`;
    payload = JSON.stringify({ number: normalizeNumber(args.number), text: args.text });
  } else {
    // evolution_go
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
  if (res.ok) {
    return { body, attempts: 1, response_time_ms: Date.now() - started, status: res.status };
  }
  console.error(
    `[wa] provider=${args.provider} status=${res.status} endpoint=${url.replace(base, "")}`,
  );
  const diag = diagnoseError(res.status);
  const err: Error & {
    status?: number;
    attempts?: number;
    response_time_ms?: number;
    error_code?: string;
    endpoint?: string;
    provider?: string;
  } = new Error(`Evolution ${args.provider} ${res.status}: ${body.slice(0, 200)}`);
  err.status = res.status;
  err.attempts = 1;
  err.response_time_ms = Date.now() - started;
  err.error_code = diag ?? String(res.status);
  err.endpoint = url;
  err.provider = args.provider;
  throw err;
}

function getProvider(g: GlobalConfigRow | null): Provider {
  return (g?.provider === "evolution_api_v2" ? "evolution_api_v2" : "evolution_go");
}

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Sessão inválida" }, 401);

    // Check admin
    const { data: rolesData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (rolesData ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("superadmin");
    const isSuperadmin = roles.includes("superadmin");
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve company_id from caller's profile (NEVER trust client)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const companyId = (profile as { company_id: string | null } | null)?.company_id;
    if (!companyId) return json({ error: "Empresa não encontrada" }, 400);

    const body = (await req.json()) as Body;
    const action = body.action;

    // -------- Global config (superadmin only) ----------
    async function loadGlobal(): Promise<GlobalConfigRow | null> {
      const { data } = await adminClient
        .from("whatsapp_global_config")
        .select("enabled, base_url, instance, api_key, updated_at, updated_by")
        .eq("singleton", true)
        .maybeSingle();
      return (data as GlobalConfigRow | null) ?? null;
    }

    if (action === "get_global_config") {
      if (!isSuperadmin) return json({ error: "Apenas superadmin" }, 403);
      const g = await loadGlobal();
      return json({
        enabled: g?.enabled ?? false,
        base_url: g?.base_url ?? "",
        instance: g?.instance ?? "",
        has_api_key: !!g?.api_key,
        updated_at: g?.updated_at ?? null,
      });
    }

    if (action === "save_global_config") {
      if (!isSuperadmin) return json({ error: "Apenas superadmin" }, 403);
      const g = body.global ?? {};
      const baseUrl = (g.base_url ?? "").trim() || null;
      const instance = (g.instance ?? "").trim() || null;
      const enabled = !!g.enabled;
      const update: Record<string, unknown> = {
        enabled,
        base_url: baseUrl,
        instance,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (typeof g.api_key === "string" && g.api_key.trim().length > 0) {
        if (g.api_key.length > 2048) return json({ error: "API Key inválida" }, 400);
        update.api_key = g.api_key.trim();
      }
      const { error } = await adminClient
        .from("whatsapp_global_config")
        .update(update)
        .eq("singleton", true)
        .select();
      if (error) {
        console.error("save_global_config error");
        return json({ error: safeErr(error) }, 500);
      }
      return json({ success: true });
    }

    if (action === "test_global") {
      if (!isSuperadmin) return json({ error: "Apenas superadmin" }, 403);
      const g = await loadGlobal();
      if (!g?.base_url || !g.instance || !g.api_key) {
        return json({ error: "Configure URL, instância e API Key globais antes de testar." }, 400);
      }
      const testNumber = (body.test_number ?? "").trim();
      if (!testNumber) return json({ error: "Informe um número para teste." }, 400);
      const text = (body.test_message ?? "").trim() ||
        "✅ Teste global Evolution GO - MesaChef. Integração funcionando!";
      try {
        const r = await sendViaEvolution(g.base_url, g.instance, g.api_key, testNumber, text);
        await recordLog(adminClient, {
          company_id: companyId,
          send_type: "test_global",
          origin: "system",
          status: "success",
          destination_masked: maskNumber(testNumber),
          instance_name: g.instance,
          attempts: r.attempts,
          response_time_ms: r.response_time_ms,
        });
        return json({ success: true });
      } catch (e: any) {
        await recordLog(adminClient, {
          company_id: companyId,
          send_type: "test_global",
          origin: "system",
          status: "failure",
          destination_masked: maskNumber(testNumber),
          instance_name: g.instance,
          error_code: e?.status ? String(e.status) : null,
          error_message: String(e?.message ?? "").slice(0, 300),
          attempts: e?.attempts ?? 1,
          response_time_ms: e?.response_time_ms ?? null,
        });
        return json({
          error: "Falha no envio de teste. Verifique URL, instância e API Key.",
          details: String(e?.message ?? "").slice(0, 300),
          status: e?.status ?? null,
        }, 502);
      }
    }

    if (action === "get_status") {
      const g = await loadGlobal();
      return json({
        global_enabled: !!g?.enabled,
        global_configured: !!(g?.base_url && g?.instance && g?.api_key),
        updated_at: g?.updated_at ?? null,
      });
    }

    // For test_send and send_report we need config + credentials
    const { data: cfgData, error: cfgErr } = await adminClient
      .from("whatsapp_config")
      .select("enabled, recipients, only_low_stock, include_all_monitored, send_when_healthy")
      .eq("company_id", companyId)
      .maybeSingle();
    if (cfgErr) return json({ error: safeErr(cfgErr) }, 500);
    const config = cfgData as WhatsappConfigRow | null;
    if (!config) {
      return json({ error: "Configuração não encontrada para a empresa." }, 400);
    }

    // Global integration must be enabled and complete
    const globalCfg = await loadGlobal();
    if (!globalCfg?.enabled || !globalCfg.base_url || !globalCfg.instance || !globalCfg.api_key) {
      await recordLog(adminClient, {
        company_id: companyId,
        send_type: action === "test_send" ? "test" : "send_report",
        origin: action === "test_send" ? "manual" : "manual",
        status: "failure",
        instance_name: globalCfg?.instance ?? null,
        error_code: "GLOBAL_DISABLED",
        error_message: "Integração global Evolution GO desativada ou incompleta.",
        attempts: 0,
      });
      return json({ error: "Integração global Evolution GO indisponível. Contate o superadmin." }, 503);
    }
    const apiKey = globalCfg.api_key;
    const baseUrl = globalCfg.base_url;
    const instance = globalCfg.instance;

    if (action === "test_send") {
      const testNumber = (body.test_number ?? "").trim();
      if (!testNumber) return json({ error: "Informe um número para teste." }, 400);
      const text = (body.test_message ?? "").trim() ||
        "✅ Teste de integração WhatsApp - MesaChef. Tudo funcionando!";
      try {
        const r = await sendViaEvolution(baseUrl, instance, apiKey, testNumber, text);
        await recordLog(adminClient, {
          company_id: companyId,
          send_type: "test",
          origin: "manual",
          status: "success",
          destination_masked: maskNumber(testNumber),
          instance_name: instance,
          attempts: r.attempts,
          response_time_ms: r.response_time_ms,
        });
      } catch (e: any) {
        await recordLog(adminClient, {
          company_id: companyId,
          send_type: "test",
          origin: "manual",
          status: "failure",
          destination_masked: maskNumber(testNumber),
          instance_name: instance,
          error_code: e?.status ? String(e.status) : null,
          error_message: String(e?.message ?? "").slice(0, 300),
          attempts: e?.attempts ?? 1,
          response_time_ms: e?.response_time_ms ?? null,
        });
        return json({ error: "Falha ao enviar pelo WhatsApp." }, 502);
      }
      return json({ success: true });
    }

    if (action === "send_report") {
      if (!config.recipients || config.recipients.length === 0) {
        await recordLog(adminClient, {
          company_id: companyId,
          send_type: "send_report",
          origin: "manual",
          status: "failure",
          instance_name: instance,
          error_code: "NO_RECIPIENTS",
          error_message: "Nenhum destinatário configurado para a empresa.",
          attempts: 0,
        });
        return json({ error: "Nenhum destinatário configurado." }, 400);
      }
      const { data: items, error: itemsErr } = await adminClient
        .from("stock_items")
        .select("name, unit, current_quantity, minimum_stock, is_active")
        .eq("company_id", companyId);
      if (itemsErr) return json({ error: safeErr(itemsErr) }, 500);

      const { data: company } = await adminClient
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle();
      const companyName = (company as { name: string } | null)?.name ?? "Empresa";

      const { text, zeroCount, lowCount } = buildReport(
        (items ?? []) as StockItemRow[],
        companyName,
        config.include_all_monitored,
      );

      const hasAlerts = zeroCount + lowCount > 0;
      if (!hasAlerts && !config.send_when_healthy) {
        return json({ success: true, skipped: true, reason: "Estoque saudável. Envio desativado." });
      }

      const finalText = hasAlerts
        ? text
        : `*Estoque saudável - ${companyName}*\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nNenhum item zerado ou abaixo do mínimo. 🎉`;

      let sent = 0;
      const failures: string[] = [];
      for (const number of config.recipients) {
        try {
          const r = await sendViaEvolution(baseUrl, instance, apiKey, number, finalText);
          sent++;
          await recordLog(adminClient, {
            company_id: companyId,
            send_type: hasAlerts ? "stock_alert" : "healthy_report",
            origin: "manual",
            status: "success",
            destination_masked: maskNumber(number),
            instance_name: instance,
            attempts: r.attempts,
            response_time_ms: r.response_time_ms,
          });
        } catch (e: any) {
          failures.push(number);
          await recordLog(adminClient, {
            company_id: companyId,
            send_type: hasAlerts ? "stock_alert" : "healthy_report",
            origin: "manual",
            status: "failure",
            destination_masked: maskNumber(number),
            instance_name: instance,
            error_code: e?.status ? String(e.status) : null,
            error_message: String(e?.message ?? "").slice(0, 300),
            attempts: e?.attempts ?? 1,
            response_time_ms: e?.response_time_ms ?? null,
          });
        }
      }
      return json({
        success: failures.length === 0,
        sent,
        failures: failures.length,
        zero_count: zeroCount,
        low_count: lowCount,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("whatsapp-manager error");
    return json({ error: "Erro interno." }, 500);
  }
});