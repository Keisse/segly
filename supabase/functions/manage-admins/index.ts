import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Role = "admin" | "lider" | "user";

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

    const body = await req.json();
    const { action, email, password, userId } = body;
    const role: Role = (body.role as Role) || "admin";
    const liderId: string | null = body.liderId || null;

    if (action === "list") {
      const { data: roles } = await admin.from("user_roles").select("user_id, role, created_at");
      const { data: { users } } = await admin.auth.admin.listUsers();
      const { data: profiles } = await admin.from("profiles").select("id, lider_id, display_name");

      // Group roles by user
      const byUser = new Map<string, { roles: Role[]; created_at: string }>();
      (roles || []).forEach((r: any) => {
        const cur = byUser.get(r.user_id) || { roles: [], created_at: r.created_at };
        cur.roles.push(r.role);
        byUser.set(r.user_id, cur);
      });

      const list = Array.from(byUser.entries()).map(([uid, v]) => {
        const u = users.find((x) => x.id === uid);
        if (!u) return null;
        const profile = (profiles || []).find((p: any) => p.id === uid);
        const primary: Role = v.roles.includes("admin") ? "admin" : v.roles.includes("lider") ? "lider" : "user";
        return {
          id: uid,
          email: u.email!,
          created_at: v.created_at,
          role: primary,
          lider_id: profile?.lider_id || null,
          display_name: profile?.display_name || null,
        };
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

      // Clear roles and set the chosen one (single primary role)
      await admin.from("user_roles").delete().eq("user_id", targetUserId);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: targetUserId, role });
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      // Ensure profile row and set lider_id
      await admin.from("profiles").upsert({
        id: targetUserId,
        lider_id: role === "user" ? liderId : null,
      });

      return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      if (!userId) return new Response(JSON.stringify({ error: "userId obrigatório" }), { status: 400, headers: corsHeaders });
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role });
      if (roleErr) throw roleErr;
      await admin.from("profiles").upsert({
        id: userId,
        lider_id: role === "user" ? liderId : null,
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove") {
      if (!userId) return new Response(JSON.stringify({ error: "userId obrigatório" }), { status: 400, headers: corsHeaders });
      if (userId === user.id) return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo" }), { status: 400, headers: corsHeaders });
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId);
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
