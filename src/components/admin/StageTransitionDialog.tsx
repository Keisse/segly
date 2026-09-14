import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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

  const requiredMissing = useMemo(
    () => fields.filter((field) => field.required && !String(values[field.field_key] ?? "").trim()),
    [fields, values]
  );

  const changeValue = (field: PipelineStageField, value: string) => {
    let next = value;
    if (field.field_type === "phone") next = formatPhone(value);
    if (field.field_key === "cnpj") next = cnpjMask(value);
    setValues((prev) => ({ ...prev, [field.field_key]: next }));
  };

  const handleConfirm = async () => {
    if (!lead) return;
    if (requiredMissing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${requiredMissing.map((f) => f.label).join(", ")}`);
      return;
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

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Esta etapa não possui campos adicionais.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 py-2">
            {fields.map((field) => (
              <div key={field.id} className={field.field_type === "long_text" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <Label htmlFor={field.field_key}>{field.label}{field.required ? " *" : ""}</Label>
                {renderField(field)}
              </div>
            ))}
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
