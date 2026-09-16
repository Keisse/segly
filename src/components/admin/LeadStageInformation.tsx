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
type LeadSnapshot = { id: string; organization_id: string; stage_id: string | null; custom_fields: Record<string, unknown> | null; [key: string]: unknown };
type StageDataRow = { id: string; data: Record<string, unknown> | null };

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
    queryKey: ["lead-current-stage-information", leadId],
    queryFn: async () => {
      const { data: leadData, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (leadError) throw leadError;
      const lead = leadData as unknown as LeadSnapshot;
      if (!lead.stage_id) return { lead, stage: null as StageRow | null, fields: [] as StageField[], stageData: null as StageDataRow | null };

      const [{ data: stageData, error: stageError }, { data: fieldsData, error: fieldsError }, { data: savedData, error: savedError }] = await Promise.all([
        supabase.from("pipeline_stages" as never).select("id,nome,ordem").eq("id", lead.stage_id).single(),
        supabase.from("pipeline_stage_fields" as never).select("*").eq("stage_id", lead.stage_id).eq("active", true).order("ordem"),
        supabase.from("lead_stage_data" as never).select("id,data").eq("lead_id", leadId).eq("stage_id", lead.stage_id).maybeSingle(),
      ]);
      if (stageError) throw stageError;
      if (fieldsError) throw fieldsError;
      if (savedError) throw savedError;
      const fields = ((fieldsData ?? []) as unknown as StageField[]).map((field) => ({ ...field, options: normalizeOptions(field.options) }));
      return { lead, stage: stageData as unknown as StageRow, fields, stageData: savedData as unknown as StageDataRow | null };
    },
    enabled: !!leadId,
  });

  const lead = data?.lead;
  const stage = data?.stage;
  const fields = data?.fields ?? [];
  const stageValues = data?.stageData?.data ?? {};

  const valueFor = (field: StageField) => {
    const raw = stageValues?.[field.field_key];
    if (Array.isArray(raw)) return raw.join(", ");
    return raw == null ? "" : String(raw);
  };

  const startEdit = (field: StageField) => { setEditingId(field.id); setEditingValue(valueFor(field)); };

  const saveField = async (field: StageField) => {
    if (!lead || !stage) return;
    setSavingId(field.id);
    try {
      let value = editingValue.trim();
      if (field.field_type === "phone") value = formatPhone(value);
      if (field.field_key === "cnpj") value = formatCpfCnpj(value);

      const nextStageData = { ...(stageValues ?? {}), [field.field_key]: value || null };
      const { error: stageDataError } = await supabase.from("lead_stage_data" as never).upsert({ organization_id: lead.organization_id, lead_id: leadId, stage_id: stage.id, data: nextStageData } as never, { onConflict: "lead_id,stage_id" });
      if (stageDataError) throw stageDataError;

      if (field.maps_to) {
        const { error } = await supabase.from("leads").update({ [field.maps_to]: value || null } as never).eq("id", leadId);
        if (error) throw error;
      } else {
        const custom = { ...(lead.custom_fields ?? {}), [field.field_key]: value || null };
        const { error } = await supabase.from("leads").update({ custom_fields: custom } as never).eq("id", leadId);
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead-current-stage-information", leadId] }),
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
    if (field.field_type === "select" && field.options.length > 0) return <Select value={editingValue} onValueChange={setEditingValue}><SelectTrigger><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger><SelectContent>{field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
    const type = field.field_type === "email" ? "email" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "phone" ? "tel" : "text";
    return <Input type={type} value={editingValue} onChange={(event) => setEditingValue(event.target.value)} placeholder={field.placeholder ?? undefined} autoFocus />;
  };

  if (isLoading) return <div className="glass-card p-6 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!lead || !stage || stage.ordem === 0 || fields.length === 0) return null;

  const answered = fields.filter((field) => !!valueFor(field).trim()).length;

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dados desta etapa</h2>
          <p className="text-sm text-muted-foreground">Informações da etapa atual: {stage.nome}.</p>
        </div>
        {answered > 0 && <Badge variant="secondary">{answered}/{fields.length} preenchidas</Badge>}
      </div>

      {answered > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((field) => {
            const value = valueFor(field);
            const editing = editingId === field.id;
            const saving = savingId === field.id;
            return (
              <div key={field.id} className={`bg-secondary/30 rounded-lg p-4 ${field.field_type === "long_text" ? "md:col-span-2" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex flex-wrap items-center gap-2 min-w-0"><p className="text-xs text-muted-foreground">{field.label}</p>{field.required && <Badge variant="secondary" className="text-[9px] font-normal">Importante</Badge>}</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 shrink-0" onClick={() => startEdit(field)} title={`Editar ${field.label}`}><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
                {editing ? <div className="space-y-2">{renderEditor(field)}<div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={saving} onClick={() => { setEditingId(null); setEditingValue(""); }}><X className="h-4 w-4" /></Button><Button size="icon" className="h-8 w-8" disabled={saving} onClick={() => saveField(field)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button></div></div> : <p className={value ? "text-sm text-foreground font-medium whitespace-pre-wrap" : "text-sm text-muted-foreground italic"}>{value || "Não informado"}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
