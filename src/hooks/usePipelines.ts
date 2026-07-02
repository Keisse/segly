import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export type Pipeline = {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  arquivado: boolean;
  ordem: number;
  is_default: boolean;
};

export type CelebrateAudience = "owner" | "team" | "admins";

export type PipelineStage = {
  id: string;
  pipeline_id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  wip_limit: number | null;
  is_won: boolean;
  is_lost: boolean;
  celebrate_enabled: boolean;
  celebrate_type: string;
  celebrate_audience: CelebrateAudience;
};

async function maybeCelebrate(leadId: string, stageId: string) {
  try {
    const { data: stage } = await supabase
      .from("pipeline_stages" as never)
      .select("celebrate_enabled, celebrate_audience, celebrate_type, nome")
      .eq("id", stageId)
      .maybeSingle();
    const s = stage as { celebrate_enabled?: boolean; celebrate_audience?: CelebrateAudience; nome?: string } | null;
    if (!s?.celebrate_enabled) return;

    // Audience check
    const uRes = await supabase.auth.getUser();
    const uid = uRes.data.user?.id;
    if (!uid) return;
    const { data: lead } = await supabase.from("leads").select("owner_id").eq("id", leadId).maybeSingle();
    const ownerId = (lead as { owner_id: string | null } | null)?.owner_id ?? null;
    if (s.celebrate_audience === "owner" && ownerId && ownerId !== uid) return;
    if (s.celebrate_audience === "admins") {
      const { data: rr } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isAdmin = (rr || []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) return;
    }

    // Dedupe insert
    const { error, count } = await supabase
      .from("lead_stage_celebrations" as never)
      .insert({ lead_id: leadId, stage_id: stageId, celebrated_by: uid } as never, { count: "exact" });
    if (error) return; // conflict = already celebrated
    if (count === 0) return;

    // Fire confetti
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.7 } }), 200);
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.7 } }), 400);
    toast.success(`🎉 Etapa "${s.nome}" concluída!`);
  } catch {
    // silent
  }
}

const DEFAULT_STAGES = [
  { nome: "Novo", cor: "#64748b", is_won: false, is_lost: false },
  { nome: "Em contato", cor: "#3b82f6", is_won: false, is_lost: false },
  { nome: "Qualificação", cor: "#8b5cf6", is_won: false, is_lost: false },
  { nome: "Proposta", cor: "#eab308", is_won: false, is_lost: false },
  { nome: "Negociação", cor: "#f97316", is_won: false, is_lost: false },
  { nome: "Ganho", cor: "#10b981", is_won: true, is_lost: false },
  { nome: "Perdido", cor: "#ef4444", is_won: false, is_lost: true },
];

export function usePipelines(opts?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["pipelines", opts?.includeArchived ?? false],
    queryFn: async () => {
      let q = supabase.from("pipelines" as never).select("*").order("ordem");
      if (!opts?.includeArchived) q = q.eq("arquivado", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Pipeline[]) ?? [];
    },
  });
}

export function usePipelineStages(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ["pipeline-stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages" as never)
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("ordem");
      if (error) throw error;
      return (data as unknown as PipelineStage[]) ?? [];
    },
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string; cor?: string; withDefaultStages?: boolean }) => {
      const u = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", u.data.user!.id).maybeSingle();
      const orgId = (prof as { organization_id: string | null } | null)?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada");
      const { data: existing } = await supabase.from("pipelines" as never).select("id, ordem").eq("organization_id", orgId).order("ordem", { ascending: false }).limit(1);
      const nextOrder = ((existing as { ordem: number }[] | null)?.[0]?.ordem ?? -1) + 1;
      const { data: p, error } = await supabase
        .from("pipelines" as never)
        .insert({
          organization_id: orgId,
          nome: input.nome,
          descricao: input.descricao ?? null,
          cor: input.cor ?? "#1D9E75",
          ordem: nextOrder,
        } as never)
        .select()
        .single();
      if (error) throw error;
      const created = p as unknown as Pipeline;
      if (input.withDefaultStages) {
        const stages = DEFAULT_STAGES.map((s, i) => ({ ...s, pipeline_id: created.id, ordem: i }));
        const { error: se } = await supabase.from("pipeline_stages" as never).insert(stages as never);
        if (se) throw se;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline criado!");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar pipeline"),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pipeline> }) => {
      const { error } = await supabase.from("pipelines" as never).update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moveLeadsTo }: { id: string; moveLeadsTo?: string | null }) => {
      if (moveLeadsTo) {
        const { data: firstStage } = await supabase.from("pipeline_stages" as never).select("id").eq("pipeline_id", moveLeadsTo).order("ordem").limit(1).maybeSingle();
        const stageId = (firstStage as { id: string } | null)?.id ?? null;
        const { error: mvErr } = await supabase.from("leads").update({ pipeline_id: moveLeadsTo, stage_id: stageId } as never).eq("pipeline_id", id);
        if (mvErr) throw mvErr;
      }
      const { error } = await supabase.from("pipelines" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Pipeline excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpsertStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: Partial<PipelineStage> & { pipeline_id: string }) => {
      if (stage.id) {
        const { error } = await supabase.from("pipeline_stages" as never).update(stage as never).eq("id", stage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pipeline_stages" as never).insert(stage as never);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["pipeline-stages", v.pipeline_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; pipelineId: string }) => {
      const { error } = await supabase.from("pipeline_stages" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["pipeline-stages", v.pipelineId] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipelineId, stages }: { pipelineId: string; stages: PipelineStage[] }) => {
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (s.ordem !== i) {
          await supabase.from("pipeline_stages" as never).update({ ordem: i } as never).eq("id", s.id);
        }
      }
      return pipelineId;
    },
    onSuccess: (pipelineId) => qc.invalidateQueries({ queryKey: ["pipeline-stages", pipelineId] }),
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, stageId, pipelineId }: { leadId: string; stageId: string; pipelineId: string }) => {
      const { error } = await supabase.from("leads").update({ stage_id: stageId, pipeline_id: pipelineId } as never).eq("id", leadId);
      if (error) throw error;
      await maybeCelebrate(leadId, stageId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-by-pipeline"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLeadsByPipeline(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ["leads-by-pipeline", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, empresa, cargo, stage_id, status, resultado_diagnostico, created_at, pipeline_id")
        .eq("pipeline_id", pipelineId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pipelineId,
  });
}
