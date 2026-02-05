import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_password',
      'smtp_from_email',
      'smtp_from_name',
    ]);

  if (error || !data) {
    console.error('Error fetching SMTP settings:', error);
    return null;
  }

  const settingsMap: Record<string, string> = {};
  data.forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value;
  });

  if (!settingsMap.smtp_host || !settingsMap.smtp_user || !settingsMap.smtp_password) {
    return null;
  }

  return {
    smtp_host: settingsMap.smtp_host,
    smtp_port: settingsMap.smtp_port || '587',
    smtp_secure: settingsMap.smtp_secure || 'tls',
    smtp_user: settingsMap.smtp_user,
    smtp_password: settingsMap.smtp_password,
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

    console.log('SMTP Config:', {
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
      user: settings.smtp_user ? '***configured***' : 'missing',
    });

    const port = parseInt(settings.smtp_port, 10);
    const useTLS = settings.smtp_secure === 'tls' || settings.smtp_secure === 'ssl';

    console.log('Attempting SMTP connection...');

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

    console.log('SMTP connected, sending email to:', to);

    await client.send({
      from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
      to: to,
      subject: subject,
      html: html,
    });

    await client.close();
    console.log('Email sent successfully via SMTP');

    return { success: true };
  } catch (error: any) {
    console.error('SMTP Error:', error);

    let errorMessage = error.message || 'Falha ao enviar email';

    // Provide more helpful error messages
    if (error.message?.includes('timed out') || error.name === 'TimedOut') {
      errorMessage = `Timeout ao conectar ao servidor SMTP ${settings.smtp_host}:${settings.smtp_port}. Verifique se o servidor está acessível e a porta está correta.`;
    } else if (error.message?.includes('refused')) {
      errorMessage = `Conexão recusada pelo servidor SMTP. Verifique host, porta e credenciais.`;
    } else if (error.message?.includes('authentication')) {
      errorMessage = `Falha de autenticação SMTP. Verifique usuário e senha.`;
    }

    return { success: false, error: errorMessage };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, subject, html, isTest }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios: to, subject, html' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get SMTP settings from database
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

    // Send email
    const result = await sendEmailViaSMTP(smtpSettings, to, subject, html);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Email ${isTest ? '(test)' : ''} sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
