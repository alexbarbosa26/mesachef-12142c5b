import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface PasswordResetRequest {
  email: string;
  resetUrl: string;
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
    console.error('Error fetching SMTP settings');
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
    console.log('Password reset email sent successfully');

    return { success: true };
  } catch (error: any) {
    console.error('SMTP Error:', error.name || 'Unknown');

    let errorMessage = 'Falha ao enviar email';

    if (error.message?.includes('timed out') || error.name === 'TimedOut') {
      errorMessage = 'Timeout ao conectar ao servidor SMTP.';
    } else if (error.message?.includes('refused')) {
      errorMessage = 'Conexão recusada pelo servidor SMTP.';
    } else if (error.message?.includes('authentication')) {
      errorMessage = 'Falha de autenticação SMTP.';
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, resetUrl }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate password reset link via Supabase
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: resetUrl,
      },
    });

    if (linkError) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get SMTP settings
    const smtpSettings = await getSmtpSettings(supabase);

    if (!smtpSettings) {
      // Fallback: Use Supabase's built-in email if SMTP not configured
      return new Response(
        JSON.stringify({ success: true, usedSupabase: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Build the reset link
    const actionLink = linkData.properties?.action_link || resetUrl;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #f97316; margin: 0; font-size: 28px; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; }
          .button { display: inline-block; background: #f97316; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>🍳 MesaChef</h1>
            <p style="color: #6b7280;">Estoque & Gestão Inteligente</p>
          </div>
          <div class="content">
            <h2>Recuperação de Senha</h2>
            <p>Você solicitou a recuperação de senha para sua conta. Clique no botão abaixo para criar uma nova senha:</p>
            <p style="text-align: center;">
              <a href="${actionLink}" class="button">Redefinir Senha</a>
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              Se você não solicitou esta recuperação, ignore este email. O link expira em 1 hora.
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
              Ou copie e cole este link: ${actionLink}
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MesaChef. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmailViaSMTP(
      smtpSettings,
      email,
      'Recuperação de Senha - MesaChef',
      html
    );

    if (!result.success) {
      // Still return success to not reveal if email exists
      console.error('Failed to send password reset email');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send-password-reset function');
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);