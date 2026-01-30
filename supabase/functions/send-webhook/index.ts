import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBHOOK_URL = "https://hook.us2.make.com/kr9qe3g85ajoq9frbrpj5a4vqo2cgoto";

interface LeadData {
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
}

interface DiagnosticResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  stage: {
    id: number;
    name: string;
    minPercentage: number;
    maxPercentage: number;
    description: string;
    recommendation: string;
  };
  pillarScores: Array<{
    pillarId: number;
    pillarName: string;
    icon: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  answers: Record<string, number>;
}

interface WebhookPayload {
  type: "lead_capture" | "diagnostic_complete";
  timestamp: string;
  lead: LeadData;
  diagnostic?: DiagnosticResult;
}

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
    
    // Validate required fields
    if (!body.type || !body.lead) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and lead" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate type
    if (!["lead_capture", "diagnostic_complete"].includes(body.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be 'lead_capture' or 'diagnostic_complete'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If diagnostic_complete, answers are required
    if (body.type === "diagnostic_complete" && !body.diagnostic) {
      return new Response(
        JSON.stringify({ error: "diagnostic is required for diagnostic_complete type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload: WebhookPayload = {
      type: body.type,
      timestamp: new Date().toISOString(),
      lead: {
        nome: body.lead.nome,
        telefone: body.lead.telefone,
        email: body.lead.email,
        empresa: body.lead.empresa,
        porte_empresa: body.lead.porte_empresa || body.lead.porte,
        departamento: body.lead.departamento,
        cargo: body.lead.cargo,
      },
    };

    // Add diagnostic data if present
    if (body.diagnostic) {
      webhookPayload.diagnostic = body.diagnostic;
    }

    console.log(`Sending ${body.type} webhook...`);

    // Send to Make.com webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook failed:", webhookResponse.status, await webhookResponse.text());
      return new Response(
        JSON.stringify({ error: "Webhook delivery failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Webhook ${body.type} sent successfully`);

    return new Response(
      JSON.stringify({ success: true, type: body.type }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
