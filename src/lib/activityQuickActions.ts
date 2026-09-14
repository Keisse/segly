import { supabase } from "@/integrations/supabase/client";

export async function rescheduleActivityForTomorrow(activityId: string, scheduledAt: string) {
  const original = new Date(scheduledAt);
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(original.getHours(), original.getMinutes(), 0, 0);

  const { error } = await supabase
    .from("activities" as never)
    .update({ scheduled_at: next.toISOString(), updated_at: new Date().toISOString() } as never)
    .eq("id", activityId);
  if (error) throw error;
}

export async function resumeStandbyLead(leadId: string, activityId?: string) {
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines" as never)
    .select("id")
    .eq("nome", "Pipeline Acelera")
    .eq("arquivado", false)
    .maybeSingle();
  if (pipelineError) throw pipelineError;
  const pipelineId = (pipeline as { id?: string } | null)?.id;
  if (!pipelineId) throw new Error("Pipeline Acelera não encontrado.");

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages" as never)
    .select("id")
    .eq("pipeline_id", pipelineId)
    .ilike("nome", "Em contato")
    .maybeSingle();
  if (stageError) throw stageError;
  const stageId = (stage as { id?: string } | null)?.id;
  if (!stageId) throw new Error("Etapa Em Contato não encontrada.");

  if (activityId) {
    const now = new Date().toISOString();
    const { error: activityError } = await supabase
      .from("activities" as never)
      .update({ status: "concluida", completed_at: now, updated_at: now } as never)
      .eq("id", activityId);
    if (activityError) throw activityError;
  }

  const { error: leadError } = await supabase
    .from("leads")
    .update({ pipeline_id: pipelineId, stage_id: stageId } as never)
    .eq("id", leadId);
  if (leadError) throw leadError;
}
