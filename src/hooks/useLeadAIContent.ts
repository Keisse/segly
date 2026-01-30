import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisType } from "./useSalesIntelligence";

interface LeadAIContent {
  id: string;
  lead_id: string;
  analysis_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useLeadAIContent(leadId: string) {
  return useQuery({
    queryKey: ["lead-ai-content", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_ai_content")
        .select("*")
        .eq("lead_id", leadId);

      if (error) throw error;
      return data as LeadAIContent[];
    },
    enabled: !!leadId,
  });
}

export function useGetAIContentByType(leadId: string, type: AnalysisType) {
  const { data: allContent } = useLeadAIContent(leadId);
  return allContent?.find((c) => c.analysis_type === type)?.content ?? null;
}

export function useSaveAIContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      analysisType,
      content,
    }: {
      leadId: string;
      analysisType: AnalysisType;
      content: string;
    }) => {
      // Upsert: insert or update if exists
      const { data, error } = await supabase
        .from("lead_ai_content")
        .upsert(
          {
            lead_id: leadId,
            analysis_type: analysisType,
            content: content,
          },
          {
            onConflict: "lead_id,analysis_type",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-ai-content", variables.leadId],
      });
    },
  });
}

export function useDeleteAIContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      analysisType,
    }: {
      leadId: string;
      analysisType: AnalysisType;
    }) => {
      const { error } = await supabase
        .from("lead_ai_content")
        .delete()
        .eq("lead_id", leadId)
        .eq("analysis_type", analysisType);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-ai-content", variables.leadId],
      });
    },
  });
}
