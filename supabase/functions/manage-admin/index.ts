import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, action } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (action === "create") {
      // Try to create user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        // If user already exists, update password instead
        if (error.message.includes("already been registered")) {
          const { data: users } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users.users.find((u) => u.email === email);
          
          if (existingUser) {
            const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              existingUser.id,
              { password }
            );
            
            if (updateError) throw updateError;
            
            return new Response(
              JSON.stringify({ success: true, message: "Password updated", user: updatedUser }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "User created", user: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
