import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation functions
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const isValidName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 100;
};

const isValidRole = (role: string): role is "admin" | "staff" => {
  return role === "admin" || role === "staff";
};

const isValidExpiryDays = (days: number | null): boolean => {
  if (days === null) return true;
  return Number.isInteger(days) && days >= 1 && days <= 365;
};

// Safe error messages
const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not found")) {
      return "Usuário não encontrado";
    }
    if (msg.includes("permission") || msg.includes("denied")) {
      return "Sem permissão para esta operação";
    }
  }
  return "Erro ao processar solicitação. Tente novamente.";
};

interface UpdateUserRequest {
  user_id: string;
  full_name?: string;
  role?: "admin" | "staff";
  is_active?: boolean;
  password_expiry_days?: number | null;
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
        JSON.stringify({ error: "Apenas administradores podem atualizar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { user_id, full_name, role, is_active, password_expiry_days } = body as UpdateUserRequest;

    // Comprehensive input validation
    const validationErrors: string[] = [];

    if (!user_id || !isValidUUID(user_id)) {
      validationErrors.push("ID de usuário inválido");
    }

    if (full_name !== undefined && !isValidName(full_name)) {
      validationErrors.push("Nome deve ter entre 1 e 100 caracteres");
    }

    if (role !== undefined && !isValidRole(role)) {
      validationErrors.push("Tipo de usuário inválido");
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      validationErrors.push("Status de ativo inválido");
    }

    if (password_expiry_days !== undefined && !isValidExpiryDays(password_expiry_days)) {
      validationErrors.push("Dias para expiração deve ser entre 1 e 365");
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: validationErrors.join(". ") }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update profile
    const profileUpdates: Record<string, unknown> = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name.trim();
    if (is_active !== undefined) profileUpdates.is_active = is_active;
    if (password_expiry_days !== undefined) {
      profileUpdates.password_expiry_days = password_expiry_days;
      if (password_expiry_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + password_expiry_days);
        profileUpdates.password_expires_at = expiryDate.toISOString();
      } else {
        profileUpdates.password_expires_at = null;
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError.message);
        return new Response(
          JSON.stringify({ error: getSafeErrorMessage(profileError) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update role if provided (use upsert in case user doesn't have a role yet)
    if (role !== undefined) {
      // First check if user has a role
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error: roleUpdateError } = await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);

        if (roleUpdateError) {
          console.error("Error updating role:", roleUpdateError.message);
          return new Response(
            JSON.stringify({ error: getSafeErrorMessage(roleUpdateError) }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Insert new role
        const { error: roleInsertError } = await adminClient
          .from("user_roles")
          .insert({ user_id, role });

        if (roleInsertError) {
          console.error("Error inserting role:", roleInsertError.message);
          return new Response(
            JSON.stringify({ error: getSafeErrorMessage(roleInsertError) }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // If deactivating user, also revoke their sessions
    if (is_active === false) {
      try {
        await adminClient.auth.admin.signOut(user_id, "global");
      } catch (signOutError) {
        console.error("Error signing out user:", signOutError);
        // Continue - user is updated, sign out is best effort
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
