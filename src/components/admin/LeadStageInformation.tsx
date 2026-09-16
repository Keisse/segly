import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPhone } from "@/lib/phone";

type StageRow = { id: string; nome: string; ordem: number };
type StageField = {
  id: string;
  stage_id: string;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  ordem: number;
  placeholder: string | null;
  options: string[];
  maps_to: string | null;
  active: boolean;
};
type LeadSnapshot = { id: string; organization_id: string; pipeline_id: string | null; stage_id: string | null; custom_fields: Record<string, unknown> | null; [key: string]: unknown };
type StageDataRow = { id: string; stage_id: string; data: Record<string, unknown> | null; updated_at?: string | null };

const BLANK_VALUE = "__segly_blank__";

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

function normalizeOptions(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : []; }

export function LeadStageInformation({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lead-stage-information-stack", leadId],
    queryFn: async () => {
      const { data: leadData, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (leadError) throw leadError;
      const lead = leadData as unknown as LeadSnapshot;
      if (!lead.pipeline_id) return { lead, stages: [] as StageRow[], fields: [] as StageField[], savedRows: [] as StageDataRow[] };

      const [{ data: stagesData, error: stagesError }, { data: fieldsData, error: fieldsError }, { data: savedData, error: savedError }] = await Promise.all([
        supabase.from("pipeline_stages" as never).select("id,nome,ordem").eq("pipeline_id", lead.pipeline_id).order("ordem"),
        supabase.from("pipeline_stage_fields" as never).select("*").eq("active", true).order("ordem"),
        supabase.from("lead_stage_data" as never).select("id,stage_id,data,updated_at").eq("lead_id", leadId).order("created_at"),
      ]);
      if (stagesError) throw stagesError;
      if (fieldsError) throw fieldsError;
      if (savedError) throw savedError;

      const stages = (stagesData ?? []) as unknown as StageRow[];
      const stageIds = new Set(stages.map((stage) => stage.id));
      const fields = ((fieldsData ?? []) as unknown as StageField[])
        .filter((field) => stageIds.has(field.stage_id))
        .map((field) => ({ ...field, options: normalizeOptions(field.options) }));
      const savedRows = (savedData ?? []) as unknown as StageDataRow[];
      return { lead, stages, fields, savedRows };
    },
    enabled: !!leadId,
  });

  const lead = data?.lead;
  const stages = data?.stages ?? [];
  const fields = data?.fields ?? [];
  const savedRows = data?.savedRows ?? [];
  const currentStage = stages.find((stage) => stage.id === lead?.stage_id) ?? null;

  const visibleStages = stages.filter((stage) => {
    const hasFields = fields.some((field) => field.stage_id === stage.id);
    if (!hasFields || stage.ordem === 0) return false;
    const hasSavedRow = savedRows.some((row) => row.stage_id === stage.id);
    const isCurrent = stage.id === lead?.stage_id;
    const alreadyReached = currentStage ? stage.ordem <= currentStage.ordem : hasSavedRow;
    return hasSavedRow || isCurrent || alreadyReached;
  });

  const stageValues = (stageId: string) => savedRows.find((row) => row.stage_id === stageId)?.data ?? {};
  const valueFor = (stageId: string, field: StageField) => {
    const raw = stageValues(stageId)?.[field.field_key];
    if (Array.isArray(raw)) return raw.join(", ");
    return raw == null ? "" : String(raw);
  };

  const startEdit = (stageId: string, field: StageField) => {
    setEditingId(`${stageId}:${field.id}`);
    setEditingValue(valueFor(stageId, field));
  };

  const saveField = async (stage: StageRow, field: StageField) => {
    if (!lead) return;
    const editKey = `${stage.id}:${field.id}`;
    setSavingId(editKey);
    try {
      let value = editingValue.trim();
      if (field.field_type === "phone") value = formatPhone(value);
      if (field.field_key === "cnpj") value = formatCpfCnpj(value);

      const nextStageData = { ...(stageValues(stage.id) ?? {}), [field.field_key]: value || null };
      const { error: stageDataError } = await supabase.from("lead_stage_data" as never).upsert({ organization_id: lead.organization_id, lead_id: leadId, stage_id: stage.id, data: nextStageData } as never, { onConflict: "lead_id,stage_id" });
      if (stageDataError) throw stageDataError;

      if (field.maps_to) {
        const { error } = await supabase.from("leads").update({ [field.maps_to]: value || null } as never).eq("id", leadId);
        if (error) throw error;
      } else {
        const { data: freshLead, error: freshError } = await supabase.from("leads").select("custom_fields").eq("id", leadId).single();
        if (freshError) throw freshError;
        const freshCustom = freshLead?.custom_fields && typeof freshLead.custom_fields === "object" ? freshLead.custom_fields as Record<string, unknown> : {};
        const custom = { ...freshCustom, [field.field_key]: value || null };
        const { error } = await supabase.from("leads").update({ custom_fields: custom } as never).eq("id", leadId);
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead-stage-information-stack", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["lead", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["leads-by-pipeline"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-audit-timeline", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events"] }),
      ]);
      setEditingId(null);
      setEditingValue("");
      toast.success(`${field.label} atualizado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a informação.");
    } finally {
      setSavingId(null);
    }
  };

  const renderEditor = (field: StageField) => {
    if (field.field_type === "long_text") return <Textarea value={editingValue} onChange={(event) => setEditingValue(event.target.value)} rows={3} autoFocus />;
    if (field.field_type === "select" && field.options.length > 0) return <Select value={editingValue || BLANK_VALUE} onValueChange={(value) => setEditingValue(value === BLANK_VALUE ? "" : value)}><SelectTrigger><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger><SelectContent><SelectItem value={BLANK_VALUE}>Deixar em branco</SelectItem>{field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
    const type = field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "phone" ? "tel" : "text";
    return <Input type={type} value={editingValue} onChange={(event) => setEditingValue(event.target.value)} placeholder={field.placeholder ?? undefined} autoFocus />;
  };

  if (isLoading) return <div className="glass-card p-6 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!lead || visibleStages.length === 0) return null;

  return (
    <div className="space-y-4">
      {visibleStages.map((stage) => {
        const stageFields = fields.filter((field) => field.stage_id === stage.id).sort((a, b) => a.ordem - b.ordem);
        const answered = stageFields.filter((field) => !!valueFor(stage.id, field).trim()).length;
        const isCurrent = stage.id === lead.stage_id;
        return (
          <div key={stage.id} className={`glass-card p-4 sm:p-6 space-y-5 ${isCurrent ? "border-primary/30" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{isCurrent ? "Dados desta etapa" : "Dados da etapa"}</h2>
                <p className="text-sm text-muted-foreground">{stage.nome}{isCurrent ? " · etapa atual" : ""}</p>
              </div>
              <Badge variant={answered === stageFields.length && stageFields.length > 0 ? "default" : "secondary"}>{answered}/{stageFields.length} preenchidas</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stageFields.map((field) => {
                const value = valueFor(stage.id, field);
                const editKey = `${stage.id}:${field.id}`;
                const editing = editingId === editKey;
                const saving = savingId === editKey;
                return (
                  <div key={field.id} className={`bg-secondary/30 rounded-lg p-4 ${field.field_type === "long_text" ? "md:col-span-2" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex flex-wrap items-center gap-2 min-w-0"><p className="text-xs text-muted-foreground">{field.label}</p>{field.required && <Badge variant="secondary" className="text-[9px] font-normal">Importante</Badge>}</div>
                      {!editing && <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 shrink-0" onClick={() => startEdit(stage.id, field)} title={`Editar ${field.label}`}><Pencil className="h-3.5 w-3.5" /></Button>}
                    </div>
                    {editing ? <div className="space-y-2">{renderEditor(field)}<div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={saving} onClick={() => { setEditingId(null); setEditingValue(""); }}><X className="h-4 w-4" /></Button><Button size="icon" className="h-8 w-8" disabled={saving} onClick={() => saveField(stage, field)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button></div></div> : <p className={value ? "text-sm text-foreground font-medium whitespace-pre-wrap" : "text-sm text-muted-foreground italic"}>{value || "Não informado"}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
