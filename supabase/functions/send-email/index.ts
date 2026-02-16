import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  isTest?: boolean;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

async function getSmtpSettings(supabase: any): Promise<SmtpSettings | null> {
  // Read SMTP password from secure environment variable (not from database)
  const smtpPassword = Deno.env.get('SMTP_PASSWORD');
  if (!smtpPassword) {
    console.error('SMTP_PASSWORD secret not configured');
    return null;
  }

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_from_email',
      'smtp_from_name',
    ]);

  if (error || !data) {
    console.error('Error fetching SMTP settings');
    return null;
  }

  const settingsMap: Record<string, string> = {};
  data.forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value;
  });

  if (!settingsMap.smtp_host || !settingsMap.smtp_user) {
    return null;
  }

  return {
    smtp_host: settingsMap.smtp_host,
    smtp_port: settingsMap.smtp_port || '587',
    smtp_secure: settingsMap.smtp_secure || 'tls',
    smtp_user: settingsMap.smtp_user,
    smtp_password: smtpPassword,
    smtp_from_email: settingsMap.smtp_from_email || settingsMap.smtp_user,
    smtp_from_name: settingsMap.smtp_from_name || 'MesaChef',
  };
}

async function sendEmailViaSMTP(
  settings: SmtpSettings,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const port = parseInt(settings.smtp_port, 10);
    const useTLS = settings.smtp_secure === 'tls' || settings.smtp_secure === 'ssl';

    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: port,
        tls: useTLS,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    await client.send({
      from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
      to: to,
      subject: subject,
      html: html,
    });

    await client.close();
    console.log('Email sent successfully');

    return { success: true };
  } catch (error: any) {
    console.error('SMTP Error:', error.name || 'Unknown');

    let errorMessage = 'Falha ao enviar email';

    if (error.message?.includes('timed out') || error.name === 'TimedOut') {
      errorMessage = 'Timeout ao conectar ao servidor SMTP. Verifique as configurações.';
    } else if (error.message?.includes('refused')) {
      errorMessage = 'Conexão recusada pelo servidor SMTP. Verifique host, porta e credenciais.';
    } else if (error.message?.includes('authentication')) {
      errorMessage = 'Falha de autenticação SMTP. Verifique usuário e senha.';
    }

    return { success: false, error: errorMessage };
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Authentication: require a valid user session ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- Authorization: only admins can send emails ---
    const { data: roleData } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas administradores podem enviar emails' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- Input validation ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, isTest }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to) || to.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email de destino inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const smtpSettings = await getSmtpSettings(supabase);

    if (!smtpSettings) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configurações de SMTP não encontradas. Configure o email em Configurações.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const result = await sendEmailViaSMTP(smtpSettings, to, subject, html);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send-email function');
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao enviar email' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
