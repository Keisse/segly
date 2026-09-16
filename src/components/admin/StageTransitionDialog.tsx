import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Loader2, Package } from "lucide-react";
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
  product_id?: string | null;
  custom_fields?: Record<string, unknown> | null;
};

type ProductOption = {
  id: string;
  name: string;
  category: string;
  insurer_name: string | null;
  admin_commission_pct: number | string;
  broker_commission_pct: number | string;
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
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const isImplanted = stageName === "Implantado";

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["active-products-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products" as never)
        .select("id,name,category,insurer_name,admin_commission_pct,broker_commission_pct")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ProductOption[];
    },
    enabled: open && isImplanted,
  });

  useEffect(() => {
    if (!open || !lead) return;
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      initial[field.field_key] = directValue(lead, field);
    });
    setValues(initial);
    setProductId(isImplanted ? lead.product_id || "" : "");
  }, [open, lead, fields, isImplanted]);

  const stayedWithCurrentOperator = stageName === "Perdido" && values.motivo_perda === "Permaneceu na operadora atual";
  const selectedProduct = products.find((product) => product.id === productId);

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
      if (stageName === "Estudo Apresentado") return { type: "retorno_cliente", title: "Retorno do cliente", scheduledAt: toScheduledAt(values.data_retorno_cliente), notes: values.posicionamento_cliente || null };
      if (stageName === "Negociação" && values.data_retorno_negociacao) return { type: "retorno_negociacao", title: "Retorno de negociação", scheduledAt: toScheduledAt(values.data_retorno_negociacao), notes: values.status_negociacao || null };
      if (stageName === "Stand-by") return { type: "retorno_standby", title: "Retomar lead em stand-by", scheduledAt: toScheduledAt(values.data_novo_contato), notes: values.motivo_standby || null };
      if (stageName === "Perdido" && values.data_nova_abordagem) {
        return {
          type: "nova_abordagem",
          title: stayedWithCurrentOperator ? "Retomar cliente que permaneceu na operadora atual" : "Nova abordagem ao lead",
          scheduledAt: toScheduledAt(values.data_nova_abordagem),
          notes: [values.motivo_perda, values.operadora_atual ? `Operadora atual: ${values.operadora_atual}` : null].filter(Boolean).join(" · ") || null,
        };
      }
      return null;
    })();

    if (!config?.scheduledAt) return;

    const auth = await supabase.auth.getUser();
    const currentUserId = auth.data.user?.id;
    if (!currentUserId) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", currentUserId).maybeSingle();
    const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id;
    if (!organizationId) return;

    const responsibleId = lead.owner_id || currentUserId;
    const { data: existing } = await supabase.from("activities" as never).select("id").eq("lead_id", lead.id).eq("type", config.type).eq("status", "pendente").order("created_at", { ascending: false }).limit(1).maybeSingle();

    if ((existing as { id?: string } | null)?.id) {
      const { error } = await supabase.from("activities" as never).update({ title: config.title, scheduled_at: config.scheduledAt, notes: config.notes, responsible_id: responsibleId, updated_at: new Date().toISOString() } as never).eq("id", (existing as { id: string }).id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("activities" as never).insert({ organization_id: organizationId, lead_id: lead.id, responsible_id: responsibleId, created_by: currentUserId, type: config.type, title: config.title, kind: "lead", scheduled_at: config.scheduledAt, notes: config.notes, status: "pendente" } as never);
    if (error) throw error;
  };

  const saveEnteredAnswers = async () => {
    if (!lead) return;
    const custom = { ...(lead.custom_fields ?? {}) } as Record<string, unknown>;
    const directPatch: Record<string, unknown> = {};
    let customChanged = false;

    fields.forEach((field) => {
      const value = String(values[field.field_key] ?? "").trim();
      if (!value) return;
      if (field.maps_to) directPatch[field.maps_to] = value;
      else {
        custom[field.field_key] = value;
        customChanged = true;
      }
    });

    if (isImplanted && productId) directPatch.product_id = productId;
    const patch = { ...directPatch, ...(customChanged ? { custom_fields: custom } : {}) };
    if (Object.keys(patch).length === 0) return;

    const { error } = await supabase.from("leads").update(patch as never).eq("id", lead.id);
    if (error) throw error;
  };

  const moveLead = async (saveAnswers: boolean) => {
    if (!lead) return;
    setSaving(true);
    try {
      if (saveAnswers) {
        await saveEnteredAnswers();
        await upsertStageActivity();
      }
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao mover lead:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível mover o lead.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: PipelineStageField) => {
    const value = values[field.field_key] ?? "";
    if (field.field_type === "long_text") return <Textarea value={value} onChange={(e) => changeValue(field, e.target.value)} placeholder={field.placeholder ?? undefined} rows={3} />;
    if (field.field_type === "select") {
      return <Select value={value} onValueChange={(v) => changeValue(field, v)}><SelectTrigger><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger><SelectContent>{field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
    }
    const type = field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text";
    return <Input type={type} value={value} onChange={(e) => changeValue(field, e.target.value)} placeholder={field.placeholder ?? undefined} step={field.field_type === "number" ? "0.01" : undefined} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações de {stageName}</DialogTitle>
          <DialogDescription>Estas informações são importantes para a etapa, mas não bloqueiam a movimentação. Você pode preencher agora ou responder depois.</DialogDescription>
        </DialogHeader>

        {stayedWithCurrentOperator && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm"><CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /><div><p className="font-semibold">Você pode agendar uma nova abordagem.</p><p className="text-muted-foreground mt-1">Se informar uma data, o Segly cria automaticamente uma atividade para o responsável comercial. Se preferir, isso também pode ser preenchido depois na tela do lead.</p></div></div>}

        {isImplanted && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-start gap-3"><Package className="h-5 w-5 text-primary shrink-0 mt-0.5" /><div><p className="font-semibold">Produto vendido</p><p className="text-xs text-muted-foreground">Pode ser informado agora ou completado posteriormente no lead.</p></div></div>
            <Select value={productId} onValueChange={setProductId} disabled={productsLoading}>
              <SelectTrigger><SelectValue placeholder={productsLoading ? "Carregando produtos..." : "Selecione o produto"} /></SelectTrigger>
              <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.category}{product.insurer_name ? ` · ${product.insurer_name}` : ""}</SelectItem>)}</SelectContent>
            </Select>
            {selectedProduct && <div className="grid gap-2 sm:grid-cols-2 text-xs"><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Administradora:</span> <strong>{Number(selectedProduct.admin_commission_pct).toLocaleString("pt-BR")}% do valor fechado</strong></div><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Corretor:</span> <strong>{Number(selectedProduct.broker_commission_pct).toLocaleString("pt-BR")}% da comissão da administradora</strong></div></div>}
          </div>
        )}

        {isLoading ? <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : fields.length === 0 ? <p className="text-sm text-muted-foreground py-4">Esta etapa não possui campos adicionais.</p> : (
          <div className="grid gap-5 md:grid-cols-2 py-2">
            {fields.map((field) => (
              <div key={field.id} className={field.field_type === "long_text" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <div className="flex items-center gap-2"><Label htmlFor={field.field_key}>{field.label}</Label>{field.required && <Badge variant="secondary" className="text-[10px] font-normal">Importante</Badge>}</div>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="outline" onClick={() => moveLead(false)} disabled={saving || isLoading}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Responder depois</Button>
          <Button onClick={() => moveLead(true)} disabled={saving || isLoading || (isImplanted && productsLoading)}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar e mover lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
