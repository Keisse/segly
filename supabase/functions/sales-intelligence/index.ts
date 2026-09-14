import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadContext {
  nome: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
  score: number;
  pillarScores: Array<{
    pillarName: string;
    percentage: number;
  }>;
}

type AnalysisType = 
  | "industria" 
  | "porte" 
  | "departamento" 
  | "cargo"
  | "spin"
  | "bant"
  | "gpct"
  | "challenger"
  | "sandler";

function getSystemPrompt(type: AnalysisType, lead: LeadContext): string {
  const weakPillars = lead.pillarScores
    .filter(p => p.percentage < 60)
    .map(p => `${p.pillarName} (${Math.round(p.percentage)}%)`)
    .join(", ");
  
  const strongPillars = lead.pillarScores
    .filter(p => p.percentage >= 60)
    .map(p => `${p.pillarName} (${Math.round(p.percentage)}%)`)
    .join(", ");

  const baseContext = `
Você é um especialista em vendas B2B e inteligência comercial.
Contexto do Lead:
- Nome: ${lead.nome}
- Empresa: ${lead.empresa}
- Porte: ${lead.porte_empresa}
- Departamento: ${lead.departamento}
- Cargo: ${lead.cargo}
- Score de Maturidade: ${lead.score}%
- Pilares Fracos: ${weakPillars || "Nenhum"}
- Pilares Fortes: ${strongPillars || "Nenhum"}

Responda SEMPRE em português brasileiro. Seja específico, prático e acionável.
Use markdown para formatar a resposta com títulos, bullet points e destaques.
`;

  const prompts: Record<AnalysisType, string> = {
    industria: `${baseContext}
Faça uma análise da indústria/setor em que o lead atua baseado na empresa "${lead.empresa}" e departamento "${lead.departamento}".
Estruture sua análise em:

## 🎯 Desafios do Setor
Liste os 3-4 principais desafios que empresas deste setor enfrentam atualmente.

## 📈 Tendências
Identifique 3-4 tendências relevantes do mercado.

## 💡 Oportunidades
Aponte 3-4 oportunidades que podem ser exploradas.

## ⚠️ Ameaças
Liste 3-4 ameaças ou riscos do setor.

## 🔗 Conexão com o Diagnóstico
Relacione os gaps identificados no diagnóstico com os desafios do setor.`,

    porte: `${baseContext}
Faça uma análise específica para o porte "${lead.porte_empresa}" da empresa.
Estruture sua análise em:

## 💰 Desafios Financeiros Típicos
Liste 3-4 desafios financeiros comuns para empresas deste porte.

## 🔄 Ciclo de Compra
Descreva o ciclo típico de compra/decisão para este porte de empresa.

## 🎯 Abordagem Recomendada
Sugira a melhor abordagem comercial para este porte.

## 👥 Stakeholders Envolvidos
Identifique quem geralmente participa da decisão de compra.

## ⏰ Timeline Esperado
Estime o tempo típico do ciclo de vendas.`,

    departamento: `${baseContext}
Faça uma análise específica do departamento "${lead.departamento}".
Estruture sua análise em:

## 🎯 Expectativas do Departamento
Liste as principais expectativas e metas típicas deste departamento.

## 😰 Dores Comuns
Identifique 4-5 dores específicas que este departamento enfrenta.

## 🔥 Motivadores de Compra
Liste os fatores que motivam este departamento a buscar soluções.

## 👥 Influenciadores
Identifique outros departamentos ou pessoas que influenciam suas decisões.

## 📊 Métricas de Sucesso
Quais KPIs são importantes para este departamento.`,

    cargo: `${baseContext}
Faça uma análise específica do cargo "${lead.cargo}".
Estruture sua análise em:

## 😤 Desafios do Cargo
Liste 4-5 desafios específicos que este profissional enfrenta.

## 📈 Evolução de Carreira
Descreva a trajetória típica de carreira e aspirações.

## 💪 Forças (SWOT Pessoal)
Identifique forças típicas deste perfil profissional.

## 😰 Fraquezas (SWOT Pessoal)
Aponte fraquezas comuns a serem trabalhadas.

## 🎯 O que Este Profissional Busca
Descreva o que realmente importa para este cargo.

## 💬 Tom de Comunicação
Recomende o tom e linguagem ideais para se comunicar.`,

    spin: `${baseContext}
Crie um script de vendas usando a metodologia SPIN Selling.

## 🔍 Perguntas de SITUAÇÃO
Crie 4-5 perguntas para entender o contexto atual do lead.

## ❓ Perguntas de PROBLEMA
Crie 4-5 perguntas para descobrir problemas e dores, focando nos gaps: ${weakPillars}.

## 💥 Perguntas de IMPLICAÇÃO
Crie 4-5 perguntas para amplificar o impacto dos problemas.

## 💡 Perguntas de NECESSIDADE
Crie 4-5 perguntas para direcionar à solução e valor.

## 🎯 Fechamento Sugerido
Sugira uma frase de transição para proposta.`,

    bant: `${baseContext}
Crie um script de qualificação usando a metodologia BANT.

## 💰 BUDGET (Orçamento)
Crie 3-4 perguntas para descobrir o orçamento disponível, considerando o porte "${lead.porte_empresa}".

## 👤 AUTHORITY (Autoridade)
Crie 3-4 perguntas para identificar o decisor, considerando o cargo "${lead.cargo}".

## 📋 NEED (Necessidade)
Crie 3-4 perguntas para validar a necessidade, focando nos gaps identificados.

## ⏰ TIMELINE (Cronograma)
Crie 3-4 perguntas para entender a urgência.

## ✅ Checklist de Qualificação
Crie um checklist rápido para validar se o lead é qualificado.`,

    gpct: `${baseContext}
Crie um script de vendas usando a metodologia GPCT.

## 🎯 GOALS (Objetivos)
Crie 4-5 perguntas para descobrir os objetivos do lead/empresa.

## 📋 PLANS (Planos)
Crie 4-5 perguntas para entender os planos atuais para atingir esses objetivos.

## ⚡ CHALLENGES (Desafios)
Crie 4-5 perguntas para explorar os desafios, focando nos gaps: ${weakPillars}.

## ⏰ TIMELINE (Cronograma)
Crie 3-4 perguntas para entender prazos e urgência.

## 🔗 Conexão com a Solução
Sugira como conectar cada resposta com sua oferta.`,

    challenger: `${baseContext}
Crie um script de vendas usando a metodologia Challenger Sale.

## 🔄 REFRAME (Reenquadrar)
Crie insights provocativos para desafiar a perspectiva atual do lead sobre os gaps: ${weakPillars}.

## 🌊 RATIONAL DROWNING (Afogamento Racional)
Apresente dados e fatos que mostrem a gravidade dos problemas não resolvidos.

## 💔 EMOTIONAL IMPACT (Impacto Emocional)
Crie uma narrativa que conecte emocionalmente o lead com as consequências de não agir.

## 🎯 A New Way (Um Novo Caminho)
Apresente uma visão diferenciada da solução.

## 💬 Talk Track Sugerido
Crie um roteiro de conversa de 3-5 minutos usando esses elementos.`,

    sandler: `${baseContext}
Crie um script de vendas usando a metodologia Sandler Selling System.

## 📋 UP-FRONT CONTRACT (Contrato Inicial)
Crie um script de abertura que estabeleça expectativas claras para a reunião.

## 😰 DOR NÍVEL 1 - Superficial
Perguntas para identificar dores superficiais relacionadas aos gaps do diagnóstico.

## 💥 DOR NÍVEL 2 - Impacto nos Negócios
Perguntas para entender o impacto real nos negócios.

## 😢 DOR NÍVEL 3 - Impacto Pessoal
Perguntas para descobrir como os problemas afetam pessoalmente o lead no cargo de "${lead.cargo}".

## 💰 ORÇAMENTO E DECISÃO
Perguntas para qualificar capacidade de investimento.

## 🎯 NEXT STEPS
Sugira os próximos passos e como fechar o compromisso.`
  };

  return prompts[type];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, lead } = await req.json() as { type: AnalysisType; lead: LeadContext };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(type, lead);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            { role: "user", parts: [{ text: "Gere a análise solicitada com base no contexto fornecido." }] },
          ],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sales intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
