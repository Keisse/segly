import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\(\)\-\+]{8,20}$/;
  return phoneRegex.test(phone);
};

const sanitizeString = (str: string, maxLength: number): string => {
  return str.trim().slice(0, maxLength);
};

const validateLeadData = (data: Record<string, unknown>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const isOutbound = data.fonte === "outbound";

  // Required fields for all
  if (!data.nome || typeof data.nome !== "string" || (data.nome as string).trim() === "") {
    errors.push("Campo obrigatório: nome");
  }
  if (!data.email || typeof data.email !== "string" || (data.email as string).trim() === "") {
    errors.push("Campo obrigatório: email");
  }

  // Additional required fields for organic leads
  if (!isOutbound) {
    const requiredFields = ["telefone", "empresa", "porte_empresa", "departamento", "cargo"];
    for (const field of requiredFields) {
      if (!data[field] || typeof data[field] !== "string" || (data[field] as string).trim() === "") {
        errors.push(`Campo obrigatório: ${field}`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  if (!isValidEmail(data.email as string)) {
    errors.push("E-mail inválido");
  }

  if (!isOutbound && data.telefone && !isValidPhone(data.telefone as string)) {
    errors.push("Telefone inválido (use apenas números, 8-20 caracteres)");
  }

  if ((data.nome as string).length > 100) {
    errors.push("Nome muito longo (máximo 100 caracteres)");
  }

  if (data.empresa && (data.empresa as string).length > 200) {
    errors.push("Nome da empresa muito longo (máximo 200 caracteres)");
  }

  if (data.resultado_diagnostico !== undefined && data.resultado_diagnostico !== null) {
    if (typeof data.resultado_diagnostico !== "object") {
      errors.push("Formato inválido para resultado do diagnóstico");
    }
  }

  return { valid: errors.length === 0, errors };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const validation = validateLeadData(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isOutbound = body.fonte === "outbound";

    const leadData: Record<string, unknown> = {
      nome: sanitizeString(body.nome, 100),
      email: sanitizeString(body.email.toLowerCase(), 255),
      telefone: isOutbound ? sanitizeString(body.telefone || "", 20) : sanitizeString(body.telefone, 20),
      empresa: isOutbound ? sanitizeString(body.empresa || "", 200) : sanitizeString(body.empresa, 200),
      porte_empresa: isOutbound ? sanitizeString(body.porte_empresa || "", 50) : sanitizeString(body.porte_empresa, 50),
      departamento: isOutbound ? sanitizeString(body.departamento || "", 100) : sanitizeString(body.departamento, 100),
      cargo: isOutbound ? sanitizeString(body.cargo || "", 100) : sanitizeString(body.cargo, 100),
      resultado_diagnostico: body.resultado_diagnostico || null,
      status: "novo",
      fonte: isOutbound ? "outbound" : "organico",
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("leads")
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, lead: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
