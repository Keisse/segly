import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, CheckCircle2, CircleUserRound, FilePenLine, History, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type AuditRow = {
  id: string;
  entity_type: "lead" | "activity";
  entity_id: string;
  action: "insert" | "update" | "delete";
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: string; display_name: string | null } | null;
};

type NamedRow = { id: string; nome?: string | null; display_name?: string | null };
type StageFieldRow = { field_key: string; label: string };
type LeadNote = { id?: string; data?: string; autor?: string; texto?: string };
type Props = { leadId: string };

const fieldLabels: Record<string, string> = {
  nome: "nome", telefone: "telefone", email: "e-mail", empresa: "empresa", status: "status",
  owner_id: "responsável", pipeline_id: "pipeline", stage_id: "etapa", custom_fields: "dados da etapa",
  notas: "notas", responsible_id: "responsável da atividade", scheduled_at: "data da atividade",
  completed_at: "conclusão", title: "título", type: "tipo", notes: "observações",
};

function valueText(value: unknown, field: string, stageMap: Map<string, string>, profileMap: Map<string, string>) {
  if (value == null || value === "") return "—";
  if (field === "stage_id") return stageMap.get(String(value)) || "Etapa anterior";
  if (field === "owner_id" || field === "responsible_id") return profileMap.get(String(value)) || "Usuário";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (field.includes("_at") || field.startsWith("data_")) {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString("pt-BR");
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function customFieldDiff(oldValue: unknown, newValue: unknown, labelMap: Map<string, string>) {
  const oldObj = asObject(oldValue);
  const newObj = asObject(newValue);
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter((key) => oldObj[key] !== newObj[key]);
  return keys.map((key) => ({ key, label: labelMap.get(key) || key.replace(/_/g, " "), before: oldObj[key], after: newObj[key] }));
}

function asNotes(value: unknown): LeadNote[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as LeadNote[]) : [];
}

function noteKey(note: LeadNote, index: number) {
  return note.id || `${note.data || ""}|${note.autor || ""}|${index}`;
}

function describeNoteChange(oldValue: unknown, newValue: unknown) {
  const oldNotes = asNotes(oldValue);
  const newNotes = asNotes(newValue);
  const oldMap = new Map(oldNotes.map((note, index) => [noteKey(note, index), note]));
  const newMap = new Map(newNotes.map((note, index) => [noteKey(note, index), note]));
  const added = [...newMap.entries()].filter(([key]) => !oldMap.has(key)).map(([, note]) => note);
  const removed = [...oldMap.entries()].filter(([key]) => !newMap.has(key)).map(([, note]) => note);
  const edited = [...newMap.entries()].filter(([key, note]) => oldMap.has(key) && JSON.stringify(oldMap.get(key)) !== JSON.stringify(note)).map(([key, note]) => ({ before: oldMap.get(key)!, after: note }));
  if (added.length === 1 && removed.length === 0 && edited.length === 0) return { title: "Nota adicionada", detail: added[0].texto?.trim() || "Nova nota registrada", meta: added[0].autor ? `Autor informado na nota: ${added[0].autor}` : null };
  if (removed.length === 1 && added.length === 0 && edited.length === 0) return { title: "Nota removida", detail: removed[0].texto?.trim() || "Uma nota foi removida", meta: removed[0].autor ? `Autor informado na nota: ${removed[0].autor}` : null };
  if (edited.length === 1 && added.length === 0 && removed.length === 0) return { title: "Nota editada", detail: `${edited[0].before.texto?.trim() || "—"} → ${edited[0].after.texto?.trim() || "—"}`, meta: edited[0].after.autor ? `Autor informado na nota: ${edited[0].after.autor}` : null };
  if (added.length > 0) return { title: added.length === 1 ? "Nota adicionada" : `${added.length} notas adicionadas`, detail: added.map((note) => note.texto?.trim()).filter(Boolean).join(" · ") || "Notas registradas", meta: null };
  return { title: "Notas atualizadas", detail: "Houve uma alteração no histórico de notas desta vida", meta: null };
}

export function LeadAuditTimeline({ leadId }: Props) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["lead-audit-timeline", leadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_events" as never).select("id,entity_type,entity_id,action,changed_fields,old_data,new_data,created_at,actor:profiles!audit_events_actor_id_fkey(id,display_name)").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(150);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
  const { data: stages = [] } = useQuery({ queryKey: ["audit-stage-names"], queryFn: async () => { const { data, error } = await supabase.from("pipeline_stages" as never).select("id,nome"); if (error) throw error; return (data ?? []) as unknown as NamedRow[]; } });
  const { data: profiles = [] } = useQuery({ queryKey: ["audit-profile-names"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,display_name"); if (error) throw error; return (data ?? []) as NamedRow[]; } });
  const { data: stageFields = [] } = useQuery({ queryKey: ["audit-stage-field-labels"], queryFn: async () => { const { data, error } = await supabase.from("pipeline_stage_fields" as never).select("field_key,label"); if (error) throw error; return (data ?? []) as unknown as StageFieldRow[]; } });

  const stageMap = useMemo(() => new Map(stages.map((row) => [row.id, row.nome || "Etapa"])), [stages]);
  const profileMap = useMemo(() => new Map(profiles.map((row) => [row.id, row.display_name || "Usuário"])), [profiles]);
  const customLabelMap = useMemo(() => new Map(stageFields.map((row) => [row.field_key, row.label])), [stageFields]);

  const describe = (event: AuditRow) => {
    const oldData = event.old_data ?? {};
    const newData = event.new_data ?? {};
    if (event.entity_type === "activity") {
      const title = String(newData.title || oldData.title || newData.type || oldData.type || "Atividade");
      if (event.action === "insert") return { icon: Activity, title: "Atividade criada", detail: title, meta: null as string | null };
      if (event.action === "delete") return { icon: Trash2, title: "Atividade removida", detail: title, meta: null as string | null };
      if (event.changed_fields.includes("status") && newData.status === "concluida") return { icon: CheckCircle2, title: "Atividade concluída", detail: title, meta: null as string | null };
      if (event.changed_fields.includes("scheduled_at")) return { icon: Activity, title: "Atividade reagendada", detail: `${valueText(oldData.scheduled_at, "scheduled_at", stageMap, profileMap)} → ${valueText(newData.scheduled_at, "scheduled_at", stageMap, profileMap)}`, meta: null as string | null };
      return { icon: Activity, title: "Atividade alterada", detail: title, meta: null as string | null };
    }
    if (event.action === "insert") return { icon: History, title: "Vida criada", detail: "Registro criado no Segly", meta: null as string | null };
    if (event.action === "delete") return { icon: Trash2, title: "Vida excluída", detail: "Registro removido", meta: null as string | null };
    if (event.changed_fields.includes("stage_id")) return { icon: ArrowRight, title: "Etapa alterada", detail: `${valueText(oldData.stage_id, "stage_id", stageMap, profileMap)} → ${valueText(newData.stage_id, "stage_id", stageMap, profileMap)}`, meta: null as string | null };
    if (event.changed_fields.includes("owner_id")) return { icon: CircleUserRound, title: "Responsável alterado", detail: `${valueText(oldData.owner_id, "owner_id", stageMap, profileMap)} → ${valueText(newData.owner_id, "owner_id", stageMap, profileMap)}`, meta: null as string | null };
    if (event.changed_fields.includes("notas")) return { icon: MessageSquarePlus, ...describeNoteChange(oldData.notas, newData.notas) };
    if (event.changed_fields.includes("custom_fields")) {
      const changes = customFieldDiff(oldData.custom_fields, newData.custom_fields, customLabelMap);
      return { icon: FilePenLine, title: changes.length === 1 ? "Campo da etapa alterado" : "Dados da etapa alterados", detail: changes.map((change) => `${change.label}: ${valueText(change.before, change.key, stageMap, profileMap)} → ${valueText(change.after, change.key, stageMap, profileMap)}`).join("\n"), meta: null as string | null };
    }
    if (event.changed_fields.includes("status")) return { icon: FilePenLine, title: "Status alterado", detail: `${valueText(oldData.status, "status", stageMap, profileMap)} → ${valueText(newData.status, "status", stageMap, profileMap)}`, meta: null as string | null };
    return { icon: FilePenLine, title: "Dados da vida atualizados", detail: event.changed_fields.map((field) => fieldLabels[field] || field).join(", "), meta: null as string | null };
  };

  return <div className="glass-card p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><History className="h-5 w-5 text-primary" />Histórico de alterações</h2><p className="text-sm text-muted-foreground">Timeline de mudanças desta vida, visível apenas para líderes e administradores.</p></div>{isLoading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : events.length === 0 ? <p className="text-sm text-muted-foreground py-4">Ainda não há eventos de auditoria para esta vida.</p> : <div className="relative pl-5"><div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" /><div className="space-y-5">{events.map((event) => { const item = describe(event); const Icon = item.icon; return <div key={event.id} className="relative pl-6"><div className="absolute left-[-2px] top-1 h-6 w-6 rounded-full border bg-background flex items-center justify-center"><Icon className="h-3.5 w-3.5 text-primary" /></div><div className="rounded-lg border border-border/70 p-3"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant="outline" className="text-[10px]">{event.entity_type === "lead" ? "Vida" : "Atividade"}</Badge></div><p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap">{item.detail}</p>{item.meta && <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>}</div><div className="text-xs text-muted-foreground sm:text-right shrink-0"><p>{event.actor?.display_name || "Sistema / origem externa"}</p><p>{new Date(event.created_at).toLocaleString("pt-BR")}</p></div></div>{event.action === "update" && event.changed_fields.length > 0 && !event.changed_fields.some((field) => ["stage_id","owner_id","notas","custom_fields"].includes(field)) && <div className="mt-3 flex flex-wrap gap-1.5">{event.changed_fields.slice(0, 8).map((field) => <Badge key={field} variant="secondary" className="font-normal">{fieldLabels[field] || field}</Badge>)}</div>}</div></div>; })}</div></div>}</div>;
}
