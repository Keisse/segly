import { supabase } from "@/integrations/supabase/client";

export type CompletableActivity = {
  id: string;
  lead_id: string | null;
  responsible_id: string;
  type: string;
  scheduled_at: string;
};

const CONTACT_TYPES = new Set([
  "contato",
  "whatsapp",
  "telefone",
  "email",
  "visita",
  "reuniao_online",
]);

export function isContactActivity(type: string) {
  return CONTACT_TYPES.has(type.toLocaleLowerCase("pt-BR"));
}

export async function completeActivity(activity: CompletableActivity) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const executorId = authData.user?.id;
  if (!executorId) throw new Error("Usuário não encontrado.");

  const completedAt = new Date();
  const completedAtIso = completedAt.toISOString();

  const { error: updateError } = await supabase
    .from("activities" as never)
    .update({
      status: "concluida",
      completed_at: completedAtIso,
      updated_at: completedAtIso,
    } as never)
    .eq("id", activity.id);
  if (updateError) throw updateError;

  if (!activity.lead_id || !isContactActivity(activity.type)) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", executorId)
    .maybeSingle();
  if (profileError) throw profileError;

  const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id;
  if (!organizationId) throw new Error("Organização não encontrada.");

  const scheduledAt = new Date(activity.scheduled_at);
  const onTime = !Number.isNaN(scheduledAt.getTime()) && completedAt.getTime() <= scheduledAt.getTime();

  const { error: logError } = await supabase
    .from("contact_execution_log" as never)
    .upsert({
      organization_id: organizationId,
      activity_id: activity.id,
      lead_id: activity.lead_id,
      user_id: activity.responsible_id,
      executed_by: executorId,
      contact_type: activity.type,
      scheduled_at: activity.scheduled_at,
      completed_at: completedAtIso,
      on_time: onTime,
    } as never, { onConflict: "activity_id" });
  if (logError) throw logError;
}
