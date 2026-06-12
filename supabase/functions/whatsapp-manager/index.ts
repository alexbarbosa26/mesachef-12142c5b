import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

type Action = "save_credentials" | "get_status" | "test_send" | "send_report";

interface Body {
  action: Action;
  api_key?: string;
  test_number?: string;
  test_message?: string;
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
  base_url: string | null;
  instance: string | null;
  recipients: string[];
  only_low_stock: boolean;
  include_all_monitored: boolean;
  send_when_healthy: boolean;
}

function safeErr(_e: unknown): string {
  return "Erro ao processar solicitação. Tente novamente.";
}

function normalizeNumber(n: string): string {
  return n.replace(/\D/g, "");
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

async function sendViaEvolution(baseUrl: string, instance: string, apiKey: string, number: string, text: string) {
  const base = baseUrl.replace(/\/+$/, "");
  // Evolution GO uses /send/text (instance is identified by the API key, not the URL).
  // Evolution API (classic) uses /message/sendText/{instance}. Try GO first, fall back to classic.
  const candidates = [
    `${base}/send/text`,
    `${base}/message/sendText/${encodeURIComponent(instance)}`,
  ];
  const payload = JSON.stringify({ number: normalizeNumber(number), text });
  let lastStatus = 0;
  let lastBody = "";
  for (const url of candidates) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: payload,
    });
    const body = await res.text();
    if (res.ok) return body;
    lastStatus = res.status;
    lastBody = body;
    console.error("Evolution error status:", res.status, "url:", url);
    // Only fall through to next candidate on 404 (endpoint mismatch)
    if (res.status !== 404) break;
  }
  throw new Error(`Evolution API ${lastStatus}: ${lastBody.slice(0, 200)}`);
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
    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      return json({ error: "Apenas administradores" }, 403);
    }

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

    if (action === "save_credentials") {
      const apiKey = (body.api_key ?? "").trim();
      if (apiKey.length < 4 || apiKey.length > 1024) {
        return json({ error: "API Key inválida" }, 400);
      }
      const { error } = await adminClient
        .from("whatsapp_credentials")
        .upsert({ company_id: companyId, api_key: apiKey, updated_at: new Date().toISOString() });
      if (error) {
        console.error("save_credentials error");
        return json({ error: safeErr(error) }, 500);
      }
      return json({ success: true });
    }

    if (action === "get_status") {
      const { data: cred } = await adminClient
        .from("whatsapp_credentials")
        .select("company_id, updated_at")
        .eq("company_id", companyId)
        .maybeSingle();
      return json({ has_credentials: !!cred, updated_at: (cred as any)?.updated_at ?? null });
    }

    // For test_send and send_report we need config + credentials
    const { data: cfgData, error: cfgErr } = await adminClient
      .from("whatsapp_config")
      .select("enabled, base_url, instance, recipients, only_low_stock, include_all_monitored, send_when_healthy")
      .eq("company_id", companyId)
      .maybeSingle();
    if (cfgErr) return json({ error: safeErr(cfgErr) }, 500);
    const config = cfgData as WhatsappConfigRow | null;
    if (!config || !config.base_url || !config.instance) {
      return json({ error: "Configure URL base e instância antes de enviar." }, 400);
    }

    const { data: credRow } = await adminClient
      .from("whatsapp_credentials")
      .select("api_key")
      .eq("company_id", companyId)
      .maybeSingle();
    const apiKey = (credRow as { api_key: string } | null)?.api_key;
    if (!apiKey) return json({ error: "API Key não configurada." }, 400);

    if (action === "test_send") {
      const testNumber = (body.test_number ?? "").trim();
      if (!testNumber) return json({ error: "Informe um número para teste." }, 400);
      const text = (body.test_message ?? "").trim() ||
        "✅ Teste de integração WhatsApp - MesaChef. Tudo funcionando!";
      try {
        await sendViaEvolution(config.base_url, config.instance, apiKey, testNumber, text);
      } catch (e) {
        return json({ error: "Falha ao enviar pelo WhatsApp. Verifique URL, instância e API Key." }, 502);
      }
      return json({ success: true });
    }

    if (action === "send_report") {
      if (!config.recipients || config.recipients.length === 0) {
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
          await sendViaEvolution(config.base_url, config.instance, apiKey, number, finalText);
          sent++;
        } catch {
          failures.push(number);
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