import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limite prático de payload inline da Gemini API (~20MB de request)
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function transcribeAudio(blob: Blob, filename: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength > INLINE_LIMIT_BYTES) {
    throw new Error("Arquivo muito grande para transcrição automática (limite ~18MB).");
  }
  const base64 = toBase64(new Uint8Array(buffer));
  const mimeType = blob.type || (filename.endsWith(".mp3") ? "audio/mpeg" : "audio/wav");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcreva integralmente o áudio a seguir em português. Retorne apenas o texto transcrito, sem comentários." },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Transcrição falhou: ${t}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
}

async function extractTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao baixar URL");
  const html = await res.text();
  // Strip simples
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 50000);
}

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

    const { type, path, url } = await req.json();

    if (type === "link") {
      if (!url) return new Response(JSON.stringify({ error: "url obrigatória" }), { status: 400, headers: corsHeaders });
      const content = await extractTextFromUrl(url);
      return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "audio" || type === "video") {
      if (!path) return new Response(JSON.stringify({ error: "path obrigatório" }), { status: 400, headers: corsHeaders });
      const { data: blob, error } = await admin.storage.from("knowledge-base").download(path);
      if (error) throw error;
      const content = await transcribeAudio(blob, path);
      return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "pdf" || type === "docx") {
      // Para PDF/DOCX armazenamos placeholder. Extração robusta exige libs Deno específicas.
      // Indicamos que o conteúdo deve ser usado pela IA via gateway multimodal no futuro.
      return new Response(JSON.stringify({
        content: `[Arquivo ${type.toUpperCase()} armazenado em ${path}. Conteúdo binário não extraído automaticamente — adicione um resumo manual via "Texto" para uso pela IA.]`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Tipo inválido" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("knowledge-process error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
