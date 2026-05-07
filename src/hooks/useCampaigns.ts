import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CampaignQuestion, OptinFields, CampaignOption } from "@/types/campaign";
import { toast } from "sonner";

function transformCampaign(row: any): Campaign {
  return {
    ...row,
    optin_fields: row.optin_fields as OptinFields,
  };
}

function transformQuestion(row: any): CampaignQuestion {
  return {
    ...row,
    options: (row.options as CampaignOption[]) || [],
  };
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(transformCampaign);
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return transformCampaign(data);
    },
    enabled: !!id,
  });
}

export function useCampaignBySlug(slug: string) {
  return useQuery({
    queryKey: ["campaign-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .eq("status", "ativa")
        .maybeSingle();
      if (error) throw error;
      return data ? transformCampaign(data) : null;
    },
    enabled: !!slug,
  });
}

export function useCampaignQuestions(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-questions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_questions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(transformQuestion);
    },
    enabled: !!campaignId,
  });
}

export function useCampaignLeadsCount() {
  return useQuery({
    queryKey: ["campaigns-leads-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("campaign_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.campaign_id) counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Campaign>) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return transformCampaign(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar campanha"),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transformCampaign(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", data.id] });
      toast.success("Campanha atualizada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar campanha"),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha excluída.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir campanha"),
  });
}

export function useSaveCampaignQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      questions,
    }: {
      campaignId: string;
      questions: Partial<CampaignQuestion>[];
    }) => {
      // Replace strategy: delete all then insert
      const { error: delErr } = await supabase
        .from("campaign_questions")
        .delete()
        .eq("campaign_id", campaignId);
      if (delErr) throw delErr;
      if (questions.length === 0) return [];
      const rows = questions.map((q, i) => ({
        campaign_id: campaignId,
        question_text: q.question_text || "",
        question_type: q.question_type || "multiple_choice",
        options: (q.options || []) as any,
        scale_min: q.scale_min ?? null,
        scale_max: q.scale_max ?? null,
        is_required: q.is_required ?? true,
        category: q.category ?? null,
        sort_order: i,
      }));
      const { data, error } = await supabase
        .from("campaign_questions")
        .insert(rows)
        .select();
      if (error) throw error;
      return (data || []).map(transformQuestion);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign-questions", vars.campaignId] });
      toast.success("Perguntas salvas!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar perguntas"),
  });
}

export function useDuplicateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: e1 } = await supabase
        .from("campaigns").select("*").eq("id", id).single();
      if (e1) throw e1;
      const { data: questions, error: e2 } = await supabase
        .from("campaign_questions").select("*").eq("campaign_id", id).order("sort_order");
      if (e2) throw e2;

      const newSlug = `${original.slug}-copia-${Date.now().toString(36)}`;
      const { data: newCamp, error: e3 } = await supabase
        .from("campaigns")
        .insert({
          name: `${original.name} (cópia)`,
          slug: newSlug,
          description: original.description,
          type: original.type,
          status: "inativa",
          tag: original.tag,
          public_title: original.public_title,
          public_subtitle: original.public_subtitle,
          image_url: original.image_url,
          optin_fields: original.optin_fields,
          thank_you_message: original.thank_you_message,
        })
        .select()
        .single();
      if (e3) throw e3;

      if (questions && questions.length > 0) {
        const rows = questions.map((q: any, i: number) => ({
          campaign_id: newCamp.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          is_required: q.is_required,
          category: q.category,
          sort_order: i,
        }));
        await supabase.from("campaign_questions").insert(rows);
      }
      return newCamp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha duplicada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao duplicar"),
  });
}

export function useLeadCampaignResponses(leadId: string) {
  return useQuery({
    queryKey: ["lead-campaign-responses", leadId],
    queryFn: async () => {
      const { data: responses, error } = await supabase
        .from("campaign_responses")
        .select("*")
        .eq("lead_id", leadId);
      if (error) throw error;
      if (!responses || responses.length === 0) return [];

      const questionIds = [...new Set(responses.map((r: any) => r.question_id))];
      const { data: questions } = await supabase
        .from("campaign_questions")
        .select("*")
        .in("id", questionIds);

      const qMap = new Map((questions || []).map((q: any) => [q.id, q]));
      return responses.map((r: any) => ({
        ...r,
        question: qMap.get(r.question_id),
      }));
    },
    enabled: !!leadId,
  });
}
