import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 72;
};

interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's session to verify they're an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem redefinir senhas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { user_id, new_password } = body as ResetPasswordRequest;

    // Input validation
    if (!user_id || !isValidUUID(user_id)) {
      return new Response(
        JSON.stringify({ error: "ID de usuário inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!new_password || !isValidPassword(new_password)) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter entre 6 e 72 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Reset the user's password using Admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      console.error("Error resetting password:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao redefinir senha" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password expiry in profile if enabled
    const { data: profile } = await adminClient
      .from("profiles")
      .select("password_expiry_days")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profile?.password_expiry_days) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + profile.password_expiry_days);
      
      await adminClient
        .from("profiles")
        .update({
          password_expires_at: expiryDate.toISOString(),
          last_password_change: new Date().toISOString(),
        })
        .eq("user_id", user_id);
    }

    // Log the action in audit
    await adminClient.rpc('create_audit_log', {
      p_user_id: requestingUser.id,
      p_action: 'ADMIN_PASSWORD_RESET',
      p_entity_type: 'user',
      p_entity_id: user_id,
      p_details: { reset_by_admin: requestingUser.email },
    });

    console.log(`Password reset for user ${user_id} by admin ${requestingUser.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error resetting password:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
