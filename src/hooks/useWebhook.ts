import { useMutation } from "@tanstack/react-query";
import type { LeadData } from "@/components/LeadCaptureForm";

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
  answers: Record<number, number>;
}

interface WebhookLeadCapturePayload {
  type: "lead_capture";
  lead: LeadData & { porte_empresa: string };
}

interface WebhookDiagnosticCompletePayload {
  type: "diagnostic_complete";
  lead: LeadData & { porte_empresa: string };
  diagnostic: DiagnosticResult;
}

type WebhookPayload = WebhookLeadCapturePayload | WebhookDiagnosticCompletePayload;

export function useSendWebhook() {
  return useMutation({
    mutationFn: async (payload: WebhookPayload) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Normalize porte to porte_empresa for the webhook
      const normalizedLead = {
        ...payload.lead,
        porte_empresa: payload.lead.porte_empresa || (payload.lead as any).porte,
      };

      const webhookPayload = {
        ...payload,
        lead: normalizedLead,
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/send-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to send webhook");
      }

      return response.json();
    },
    onError: (error: Error) => {
      // Log silently - don't show toast to user as webhook is for internal use
      console.error("Webhook error:", error.message);
    },
  });
}
