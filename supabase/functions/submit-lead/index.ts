import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const isValidPhone = (phone: string): boolean => {
  // Brazilian phone format: allows digits, spaces, parentheses, dashes, plus sign
  const phoneRegex = /^[\d\s\(\)\-\+]{8,20}$/;
  return phoneRegex.test(phone);
};

const sanitizeString = (str: string, maxLength: number): string => {
  return str.trim().slice(0, maxLength);
};

const validateLeadData = (data: Record<string, unknown>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields
  const requiredFields = ["nome", "telefone", "email", "empresa", "porte_empresa", "departamento", "cargo"];
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`Campo obrigatório: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Email validation
  if (!isValidEmail(data.email as string)) {
    errors.push("E-mail inválido");
  }

  // Phone validation
  if (!isValidPhone(data.telefone as string)) {
    errors.push("Telefone inválido (use apenas números, 8-20 caracteres)");
  }

  // Length validations
  if ((data.nome as string).length > 100) {
    errors.push("Nome muito longo (máximo 100 caracteres)");
  }

  if ((data.empresa as string).length > 200) {
    errors.push("Nome da empresa muito longo (máximo 200 caracteres)");
  }

  // Validate resultado_diagnostico if present
  if (data.resultado_diagnostico !== undefined && data.resultado_diagnostico !== null) {
    if (typeof data.resultado_diagnostico !== "object") {
      errors.push("Formato inválido para resultado do diagnóstico");
    }
  }

  return { valid: errors.length === 0, errors };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Validate input
    const validation = validateLeadData(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: validation.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize data
    const leadData = {
      nome: sanitizeString(body.nome, 100),
      telefone: sanitizeString(body.telefone, 20),
      email: sanitizeString(body.email.toLowerCase(), 255),
      empresa: sanitizeString(body.empresa, 200),
      porte_empresa: sanitizeString(body.porte_empresa, 50),
      departamento: sanitizeString(body.departamento, 100),
      cargo: sanitizeString(body.cargo, 100),
      resultado_diagnostico: body.resultado_diagnostico || null,
      status: "novo",
    };

    // Create Supabase client with service role for insert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Insert lead
    const { data, error } = await supabase
      .from("leads")
      .insert(leadData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar lead" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
