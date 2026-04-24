import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { action, email, password, userId } = await req.json();

    if (action === "list") {
      const { data: roles } = await admin.from("user_roles").select("user_id, created_at").eq("role", "admin");
      const { data: { users } } = await admin.auth.admin.listUsers();
      const list = (roles || []).map((r) => {
        const u = users.find((x) => x.id === r.user_id);
        return u ? { id: u.id, email: u.email!, created_at: r.created_at } : null;
      }).filter(Boolean);
      return new Response(JSON.stringify({ admins: list }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      if (!email || !password) return new Response(JSON.stringify({ error: "email e password obrigatórios" }), { status: 400, headers: corsHeaders });
      if (password.length < 8) return new Response(JSON.stringify({ error: "Senha deve ter ao menos 8 caracteres" }), { status: 400, headers: corsHeaders });

      let targetUserId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });

      if (createErr) {
        if (createErr.message.includes("already")) {
          const { data: { users } } = await admin.auth.admin.listUsers();
          const existing = users.find((u) => u.email === email);
          if (existing) targetUserId = existing.id;
          else throw createErr;
        } else throw createErr;
      } else {
        targetUserId = created.user!.id;
      }

      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: targetUserId, role: "admin" });
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      if (!userId) return new Response(JSON.stringify({ error: "userId obrigatório" }), { status: 400, headers: corsHeaders });
      if (userId === user.id) return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo" }), { status: 400, headers: corsHeaders });
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("manage-admins error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
