import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

// Input validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 128;
};

const isValidName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 100;
};

const isValidRole = (role: string): role is "admin" | "staff" | "superadmin" => {
  return role === "admin" || role === "staff" || role === "superadmin";
};

// Safe error messages - never expose internal details
const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") && msg.includes("registered")) {
      return "Este email já está cadastrado";
    }
    if (msg.includes("invalid email")) {
      return "Email inválido";
    }
    if (msg.includes("password")) {
      return "Senha não atende aos requisitos";
    }
  }
  return "Erro ao processar solicitação. Tente novamente.";
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "staff" | "superadmin";
  company_id?: string | null;
}

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

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

    // Check if requesting user is admin or superadmin
    const { data: rolesData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const roles = (rolesData ?? []).map((r: { role: string }) => r.role);
    const isAdmin = roles.includes("admin");
    const isSuperadmin = roles.includes("superadmin");

    if (roleError || (!isAdmin && !isSuperadmin)) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only superadmin can create superadmins
    const { role: requestedRole } = (await req.clone().json()) as CreateUserRequest;
    if (requestedRole === "superadmin" && !isSuperadmin) {
      return new Response(
        JSON.stringify({ error: "Apenas superadmin pode criar superadmin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { email, password, full_name, role, company_id } = body as CreateUserRequest;

    // Comprehensive input validation
    const validationErrors: string[] = [];

    if (!email || !isValidEmail(email)) {
      validationErrors.push("Email inválido ou muito longo (máx. 255 caracteres)");
    }

    if (!password || !isValidPassword(password)) {
      validationErrors.push("Senha deve ter entre 6 e 128 caracteres");
    }

    if (!full_name || !isValidName(full_name)) {
      validationErrors.push("Nome deve ter entre 1 e 100 caracteres");
    }

    if (!role || !isValidRole(role)) {
      validationErrors.push("Tipo de usuário inválido");
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

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: getSafeErrorMessage(createError) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleInsertError) {
      console.error("Error adding role");
    }

    // Assign company_id on profile.
    // - superadmin pode escolher empresa (ou null para superadmin global)
    // - admin comum: vincula o novo usuário à sua própria empresa
    let targetCompanyId: string | null = null;
    if (isSuperadmin) {
      targetCompanyId = company_id ?? null;
    } else {
      const { data: meProfile } = await adminClient
        .from("profiles")
        .select("company_id")
        .eq("user_id", requestingUser.id)
        .maybeSingle();
      targetCompanyId = (meProfile as { company_id: string | null } | null)?.company_id ?? null;
    }

    if (targetCompanyId) {
      await adminClient
        .from("profiles")
        .update({ company_id: targetCompanyId })
        .eq("user_id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating user");
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});