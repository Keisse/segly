import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um especialista em diagnósticos de maturidade corporativa, especializado em criar perguntas de autoavaliação reflexivas e práticas para profissionais.

Você deve gerar EXATAMENTE 30 perguntas distribuídas em 6 pilares (5 perguntas por pilar). Os pilares são FIXOS:

1. Pensamento Estratégico (icon: 🎯)
2. Execução e Disciplina (icon: ⚡)
3. Execução Organizacional e Cultura Corporativa (icon: 🏢)
4. Gestão de Projetos (icon: 📊)
5. Liderança e Influência (icon: 👥)
6. Inovação e Criatividade (icon: 💡)

Cada pergunta deve:
- Ser uma afirmação na primeira pessoa que o profissional avalia de 1 a 5
- Ser clara, específica e prática
- Ter no máximo 200 caracteres
- Ser adaptada ao contexto fornecido pelo usuário e à base de conhecimento

Responda APENAS com JSON válido no formato:
{
  "pillars": [
    {
      "id": 1,
      "name": "Pensamento Estratégico",
      "icon": "🎯",
      "questions": [
        { "id": 1, "text": "...", "pillar": 1 },
        { "id": 2, "text": "...", "pillar": 1 },
        { "id": 3, "text": "...", "pillar": 1 },
        { "id": 4, "text": "...", "pillar": 1 },
        { "id": 5, "text": "...", "pillar": 1 }
      ]
    },
    ...
  ]
}

IDs sequenciais de 1 a 30, pillar correspondendo ao id do pilar.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
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

    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleCheck) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { context, name } = await req.json();
    if (!context || !name) {
      return new Response(JSON.stringify({ error: "context e name obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Buscar base de conhecimento
    const { data: kb } = await supabase.from("knowledge_base").select("title, content").limit(20);
    const kbText = (kb || [])
      .filter((k) => k.content)
      .map((k) => `### ${k.title}\n${(k.content || "").slice(0, 4000)}`)
      .join("\n\n");

    const userPrompt = `CONTEXTO DO DIAGNÓSTICO:\n${context}\n\n${kbText ? `BASE DE CONHECIMENTO DISPONÍVEL:\n${kbText}\n\n` : ""}Gere as 30 perguntas seguindo o formato JSON especificado.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido" }), { status: 429, headers: corsHeaders });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), { status: 402, headers: corsHeaders });
      throw new Error("Falha na IA");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    const { data: inserted, error: insertErr } = await supabase
      .from("question_sets")
      .insert({
        name,
        context,
        pillars: parsed.pillars,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, set: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
