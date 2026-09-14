import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/phone";
import { usePipelineStageFields, type PipelineStageField } from "@/hooks/usePipelineStageFields";

type LeadForTransition = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  fonte?: string | null;
  owner_id?: string | null;
  custom_fields?: Record<string, unknown> | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadForTransition | null;
  stageId: string | null;
  stageName: string;
  onConfirm: () => Promise<void> | void;
};

const cnpjMask = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

function directValue(lead: LeadForTransition, field: PipelineStageField): string {
  const mapped = field.maps_to;
  if (mapped && mapped in lead) {
    const value = (lead as Record<string, unknown>)[mapped];
    return value == null ? "" : String(value);
  }
  const value = lead.custom_fields?.[field.field_key];
  return value == null ? "" : String(value);
}

function toScheduledAt(date: string, time?: string) {
  if (!date) return null;
  const safeTime = time && /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  const local = new Date(`${date}T${safeTime}:00`);
  return Number.isNaN(local.getTime()) ? null : local.toISOString();
}

export function StageTransitionDialog({ open, onOpenChange, lead, stageId, stageName, onConfirm }: Props) {
  const { data: fields = [], isLoading } = usePipelineStageFields(stageId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.field_key] = directValue(lead, field);
    });
    setValues(initial);
  }, [open, lead, fields]);

  const stayedWithCurrentOperator = stageName === "Perdido" && values.motivo_perda === "Permaneceu na operadora atual";

  const requiredMissing = useMemo(() => {
    const missing = fields.filter((field) => field.required && !String(values[field.field_key] ?? "").trim());
    if (stayedWithCurrentOperator && !String(values.data_nova_abordagem ?? "").trim()) {
      const followUpField = fields.find((field) => field.field_key === "data_nova_abordagem");
      if (followUpField && !missing.some((field) => field.id === followUpField.id)) missing.push(followUpField);
    }
    return missing;
  }, [fields, values, stayedWithCurrentOperator]);

  const changeValue = (field: PipelineStageField, value: string) => {
    let next = value;
    if (field.field_type === "phone") next = formatPhone(value);
    if (field.field_key === "cnpj") next = cnpjMask(value);
    setValues((prev) => ({ ...prev, [field.field_key]: next }));
  };

  const upsertStageActivity = async () => {
    if (!lead) return;

    const config = (() => {
      if (stageName === "Visita Agendada") {
        return {
          type: values.tipo_visita === "Reunião online" ? "reuniao_online" : "visita",
          title: values.tipo_visita === "Reunião online" ? "Reunião online agendada" : "Visita agendada",
          scheduledAt: toScheduledAt(values.data_visita, values.horario_visita),
          notes: values.observacoes_agenda || values.local_visita || null,
        };
      }
      if (stageName === "Estudo Apresentado") {
        return {
          type: "retorno_cliente",
          title: "Retorno do cliente",
          scheduledAt: toScheduledAt(values.data_retorno_cliente),
          notes: values.posicionamento_cliente || null,
        };
      }
      if (stageName === "Negociação" && values.data_retorno_negociacao) {
        return {
          type: "retorno_negociacao",
          title: "Retorno de negociação",
          scheduledAt: toScheduledAt(values.data_retorno_negociacao),
          notes: values.status_negociacao || null,
        };
      }
      if (stageName === "Stand-by") {
        return {
          type: "retorno_standby",
          title: "Retomar lead em stand-by",
          scheduledAt: toScheduledAt(values.data_novo_contato),
          notes: values.motivo_standby || null,
        };
      }
      if (stageName === "Perdido" && values.data_nova_abordagem) {
        return {
          type: "nova_abordagem",
          title: stayedWithCurrentOperator ? "Retomar cliente que permaneceu na operadora atual" : "Nova abordagem ao lead",
          scheduledAt: toScheduledAt(values.data_nova_abordagem),
          notes: [values.motivo_perda, values.operadora_atual ? `Operadora atual: ${values.operadora_atual}` : null]
            .filter(Boolean)
            .join(" · ") || null,
        };
      }
      return null;
    })();

    if (!config?.scheduledAt) return;

    const auth = await supabase.auth.getUser();
    const currentUserId = auth.data.user?.id;
    if (!currentUserId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", currentUserId)
      .maybeSingle();
    const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id;
    if (!organizationId) return;

    const responsibleId = lead.owner_id || currentUserId;
    const { data: existing } = await supabase
      .from("activities" as never)
      .select("id")
      .eq("lead_id", lead.id)
      .eq("type", config.type)
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((existing as { id?: string } | null)?.id) {
      const { error } = await supabase
        .from("activities" as never)
        .update({
          title: config.title,
          scheduled_at: config.scheduledAt,
          notes: config.notes,
          responsible_id: responsibleId,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", (existing as { id: string }).id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("activities" as never)
      .insert({
        organization_id: organizationId,
        lead_id: lead.id,
        responsible_id: responsibleId,
        created_by: currentUserId,
        type: config.type,
        title: config.title,
        kind: "lead",
        scheduled_at: config.scheduledAt,
        notes: config.notes,
        status: "pendente",
      } as never);
    if (error) throw error;
  };

  const handleConfirm = async () => {
    if (!lead) return;
    if (requiredMissing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${requiredMissing.map((f) => f.label).join(", ")}`);
      return;
    }

    if (stayedWithCurrentOperator) {
      const followUp = new Date(`${values.data_nova_abordagem}T09:00:00`);
      if (Number.isNaN(followUp.getTime()) || followUp.getTime() <= Date.now()) {
        toast.error("A data da nova abordagem precisa ser uma data futura.");
        return;
      }
    }

    setSaving(true);
    try {
      const custom = { ...(lead.custom_fields ?? {}) } as Record<string, unknown>;
      const directPatch: Record<string, unknown> = {};

      fields.forEach((field) => {
        const value = values[field.field_key] ?? "";
        if (field.maps_to) {
          directPatch[field.maps_to] = value;
        } else {
          custom[field.field_key] = value;
        }
      });

      const { error } = await supabase
        .from("leads")
        .update({ ...directPatch, custom_fields: custom } as never)
        .eq("id", lead.id);
      if (error) throw error;

      await upsertStageActivity();
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar dados da etapa:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível avançar o lead.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: PipelineStageField) => {
    const value = values[field.field_key] ?? "";

    if (field.field_type === "long_text") {
      return <Textarea value={value} onChange={(e) => changeValue(field, e.target.value)} placeholder={field.placeholder ?? undefined} rows={3} />;
    }

    if (field.field_type === "select") {
      return (
        <Select value={value} onValueChange={(v) => changeValue(field, v)}>
          <SelectTrigger><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger>
          <SelectContent>
            {field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    const type = field.field_type === "email"
      ? "email"
      : field.field_type === "phone"
      ? "tel"
      : field.field_type === "number"
      ? "number"
      : field.field_type === "date"
      ? "date"
      : "text";

    return (
      <Input
        type={type}
        value={value}
        onChange={(e) => changeValue(field, e.target.value)}
        placeholder={field.placeholder ?? undefined}
        step={field.field_type === "number" ? "0.01" : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avançar para {stageName}</DialogTitle>
          <DialogDescription>
            Preencha os dados desta etapa. Os campos obrigatórios precisam estar completos antes de mover o lead.
          </DialogDescription>
        </DialogHeader>

        {stayedWithCurrentOperator && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm">
            <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Este lead não será esquecido.</p>
              <p className="text-muted-foreground mt-1">Informe uma data futura em “Data da nova abordagem”. O Segly criará automaticamente uma atividade para o responsável comercial e o lead voltará a aparecer na operação nessa data.</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Esta etapa não possui campos adicionais.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 py-2">
            {fields.map((field) => {
              const isConditionalRequired = stayedWithCurrentOperator && field.field_key === "data_nova_abordagem";
              return (
                <div key={field.id} className={field.field_type === "long_text" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                  <Label htmlFor={field.field_key}>{field.label}{field.required || isConditionalRequired ? " *" : ""}</Label>
                  {renderField(field)}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || isLoading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar e mover lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
