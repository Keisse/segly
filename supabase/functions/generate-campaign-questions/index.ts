import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um especialista em criar perguntas de pesquisa, formulários e diagnósticos corporativos.

Gere perguntas claras, objetivas e em português, adaptadas ao contexto/prompt fornecido pelo usuário.

Tipos de pergunta disponíveis (use o que melhor se encaixa em cada pergunta):
- "multiple_choice" — múltipla escolha, UMA resposta. Requer "options" (array de { text, value? }).
- "checkbox" — múltiplas seleções. Requer "options".
- "dropdown" — lista suspensa. Requer "options".
- "yes_no" — Sim/Não. Não use "options".
- "scale" — escala numérica. Inclua "scale_min" e "scale_max" (ex: 1 a 5).
- "nps" — NPS de 0 a 10. Não use "options".
- "short_text" — texto curto livre. Não use "options".
- "long_text" — texto longo livre. Não use "options".

Para perguntas de diagnóstico com pontuação (multiple_choice/checkbox), inclua "value" numérico em cada opção (ex: 1 a 5) refletindo o nível de maturidade da resposta.

Você pode opcionalmente agrupar perguntas em categorias/pilares usando o campo "category".

Responda APENAS com JSON válido no formato:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "category": "Opcional - nome da categoria/pilar",
      "is_required": true,
      "options": [
        { "text": "Opção 1", "value": 1 },
        { "text": "Opção 2", "value": 2 }
      ],
      "scale_min": null,
      "scale_max": null
    }
  ]
}`;

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

    const { prompt, count = 5, campaign_type } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt obrigatório" }), { status: 400, headers: corsHeaders });
    }

    const userPrompt = `${campaign_type ? `Tipo de campanha: ${campaign_type}\n` : ""}Quantidade de perguntas: ${count}\n\nPrompt do usuário:\n${prompt}\n\nGere ${count} pergunta(s) seguindo o JSON especificado.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), { status: 429, headers: corsHeaders });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), { status: 402, headers: corsHeaders });
      throw new Error("Falha na IA");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    return new Response(JSON.stringify({ success: true, questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-campaign-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
