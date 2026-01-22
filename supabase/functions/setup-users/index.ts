import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@gmail.com',
      password: 'admin',
      email_confirm: true,
      user_metadata: { full_name: 'Administrador' }
    })

    if (adminError && !adminError.message.includes('already been registered')) {
      console.error('Error creating admin:', adminError)
    }

    // Create staff user
    const { data: staffData, error: staffError } = await supabase.auth.admin.createUser({
      email: 'staff@gmail.com',
      password: 'staff',
      email_confirm: true,
      user_metadata: { full_name: 'Funcionário' }
    })

    if (staffError && !staffError.message.includes('already been registered')) {
      console.error('Error creating staff:', staffError)
    }

    // Add roles
    if (adminData?.user) {
      await supabase.from('user_roles').upsert({
        user_id: adminData.user.id,
        role: 'admin'
      }, { onConflict: 'user_id,role' })
    }

    if (staffData?.user) {
      await supabase.from('user_roles').upsert({
        user_id: staffData.user.id,
        role: 'staff'
      }, { onConflict: 'user_id,role' })
    }

    // If users already exist, fetch them and add roles
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    
    for (const user of existingUsers?.users || []) {
      if (user.email === 'admin@gmail.com') {
        await supabase.from('user_roles').upsert({
          user_id: user.id,
          role: 'admin'
        }, { onConflict: 'user_id,role' })
      }
      if (user.email === 'staff@gmail.com') {
        await supabase.from('user_roles').upsert({
          user_id: user.id,
          role: 'staff'
        }, { onConflict: 'user_id,role' })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Users created successfully',
        admin: adminData?.user?.email || 'admin@gmail.com (already exists)',
        staff: staffData?.user?.email || 'staff@gmail.com (already exists)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})