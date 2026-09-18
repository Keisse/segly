import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/phone";
import { formatCurrencyBRL, isMoneyField, maskCurrencyBRLInput, parseCurrencyBRL } from "@/lib/currency";
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

type ProposalSnapshot = {
  id: string;
  product_id: string | null;
  negotiated_value: number | string;
  boleto_due_date: string | null;
  status: string;
  accepted_at: string | null;
  implementation_at: string | null;
  implemented_at: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadForTransition | null;
  stageId: string | null;
  stageName: string;
  onConfirm: () => Promise<void> | void;
};

const BLANK_VALUE = "__segly_blank__";

const cnpjMask = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

const todayInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const money = (value: unknown) => formatCurrencyBRL(value, "Não informado");

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
  const isProposal = stageName === "Proposta";
  const isGain = stageName === "Ganho";
  const isImplanted = stageName === "Implantado";
  const needsCommercialSummary = isGain || isImplanted;

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["active-products-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products" as never).select("id,name,category,insurer_name,admin_commission_pct,broker_commission_pct").eq("active", true).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ProductOption[];
    },
    enabled: open && (isGain || isImplanted),
  });

  const { data: latestProposal = null, isLoading: proposalLoading } = useQuery({
    queryKey: ["transition-latest-proposal", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return null;
      const { data, error } = await supabase
        .from("proposals" as never)
        .select("id,product_id,negotiated_value,boleto_due_date,status,accepted_at,implementation_at,implemented_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProposalSnapshot | null;
    },
    enabled: open && !!lead?.id && (isProposal || isGain || isImplanted),
  });

  const proposalValue = useMemo(() => {
    return latestProposal?.negotiated_value
      ?? lead?.custom_fields?.valor_final_fechado
      ?? lead?.custom_fields?.valor_fechado
      ?? lead?.custom_fields?.valor_apresentado
      ?? null;
  }, [latestProposal, lead]);

  const proposalDueDate = useMemo(() => latestProposal?.boleto_due_date ?? String(lead?.custom_fields?.data_boleto ?? ""), [latestProposal, lead]);

  useEffect(() => {
    if (!open || !lead || !stageId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("lead_stage_data" as never).select("data").eq("lead_id", lead.id).eq("stage_id", stageId).maybeSingle();
      if (cancelled) return;
      const saved = ((data as unknown as { data?: Record<string, unknown> } | null)?.data ?? {});
      const initial: Record<string, string> = {};
      fields.forEach((field) => {
        const savedValue = saved[field.field_key];
        let fallback: unknown = "";
        if (field.field_key === "data_boleto") fallback = latestProposal?.boleto_due_date ?? lead.custom_fields?.data_boleto ?? "";
        if (field.field_key === "boleto_pago") fallback = lead.custom_fields?.boleto_pago ?? (isGain ? "Sim" : "");
        if (field.field_key === "data_pagamento_boleto") fallback = lead.custom_fields?.data_pagamento_boleto ?? "";
        if (field.field_key === "data_ganho") fallback = todayInput();
        if (field.field_key === "valor_fechado") fallback = latestProposal?.negotiated_value ?? lead.custom_fields?.valor_fechado ?? lead.custom_fields?.valor_final_fechado ?? "";
        const initialValue = savedValue == null ? fallback : savedValue;
        initial[field.field_key] = isMoneyField(field.field_key, field.label)
          ? formatCurrencyBRL(initialValue)
          : String(initialValue ?? "");
      });
      setValues(initial);
      setProductId(lead.product_id || latestProposal?.product_id || "");
    };
    load();
    return () => { cancelled = true; };
  }, [open, lead, stageId, fields, latestProposal, isGain]);

  const stayedWithCurrentOperator = stageName === "Perdido" && values.motivo_perda === "Permaneceu na operadora atual";
  const selectedProduct = products.find((product) => product.id === productId);
  const effectiveDueDate = String(values.data_boleto || proposalDueDate || "");
  const numericProposalValue = parseCurrencyBRL(values.valor_fechado || proposalValue || "");

  const changeValue = (field: PipelineStageField, value: string) => {
    let next = value;
    if (field.field_type === "phone") next = formatPhone(value);
    if (field.field_key === "cnpj") next = cnpjMask(value);
    if (isMoneyField(field.field_key, field.label)) next = maskCurrencyBRLInput(value);
    setValues((prev) => ({ ...prev, [field.field_key]: next }));
  };

  const upsertStageActivity = async () => {
    if (!lead) return;
    const config = (() => {
      if (stageName === "Visita Agendada") return { type: values.tipo_visita === "Reunião online" ? "reuniao_online" : "visita", title: values.tipo_visita === "Reunião online" ? "Reunião online agendada" : "Visita agendada", scheduledAt: toScheduledAt(values.data_visita, values.horario_visita), notes: values.observacoes_agenda || values.local_visita || null };
      if (stageName === "Estudo Apresentado") return { type: "retorno_cliente", title: "Retorno do cliente", scheduledAt: toScheduledAt(values.data_retorno_cliente), notes: values.posicionamento_cliente || null };
      if (stageName === "Negociação" && values.data_retorno_negociacao) return { type: "retorno_negociacao", title: "Retorno de negociação", scheduledAt: toScheduledAt(values.data_retorno_negociacao), notes: values.status_negociacao || null };
      if (stageName === "Stand-by") return { type: "retorno_standby", title: "Retomar vida em stand-by", scheduledAt: toScheduledAt(values.data_novo_contato), notes: values.motivo_standby || null };
      if (stageName === "Perdido" && values.data_nova_abordagem) return { type: "nova_abordagem", title: stayedWithCurrentOperator ? "Retomar cliente que permaneceu na operadora atual" : "Nova abordagem à vida", scheduledAt: toScheduledAt(values.data_nova_abordagem), notes: [values.motivo_perda, values.operadora_atual ? `Operadora atual: ${values.operadora_atual}` : null].filter(Boolean).join(" · ") || null };
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

  const validateGain = () => {
    if (!isGain) return true;
    if (!productId) {
      toast.error("Selecione o produto vendido antes de marcar a venda como ganha.");
      return false;
    }
    if (!Number.isFinite(numericProposalValue) || numericProposalValue <= 0) {
      toast.error("Informe o valor fechado na proposta antes de marcar a venda como ganha.");
      return false;
    }
    if (!effectiveDueDate) {
      toast.error("Informe o vencimento do boleto na etapa Proposta antes de marcar a venda como ganha.");
      return false;
    }
    if (values.boleto_pago !== "Sim") {
      toast.error("A etapa Ganho exige a confirmação de que o boleto foi pago.");
      return false;
    }
    if (!values.data_pagamento_boleto) {
      toast.error("Informe a data do pagamento do boleto.");
      return false;
    }
    if (!values.data_ganho) {
      toast.error("Informe a data do ganho.");
      return false;
    }
    return true;
  };

  const saveDeferredStage = async () => {
    if (!lead || !stageId) return;

    const { data: leadMeta, error: leadMetaError } = await supabase
      .from("leads")
      .select("organization_id,custom_fields")
      .eq("id", lead.id)
      .single();
    if (leadMetaError) throw leadMetaError;

    const meta = leadMeta as unknown as {
      organization_id: string;
      custom_fields: Record<string, unknown> | null;
    };

    const saved: Record<string, string | boolean> = { __deferred: true };
    const directPatch: Record<string, unknown> = {};
    const custom = { ...(meta.custom_fields ?? {}) } as Record<string, unknown>;
    let customChanged = false;

    fields.forEach((field) => {
      const value = String(values[field.field_key] ?? "").trim();
      if (!value) return;
      saved[field.field_key] = value;
      if (field.maps_to) directPatch[field.maps_to] = value;
      else {
        custom[field.field_key] = value;
        customChanged = true;
      }
    });

    const { error: stageDataError } = await supabase
      .from("lead_stage_data" as never)
      .upsert(
        {
          organization_id: meta.organization_id,
          lead_id: lead.id,
          stage_id: stageId,
          data: saved,
        } as never,
        { onConflict: "lead_id,stage_id" },
      );
    if (stageDataError) throw stageDataError;

    const patch = {
      ...directPatch,
      ...(customChanged ? { custom_fields: custom } : {}),
    };
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("leads").update(patch as never).eq("id", lead.id);
      if (error) throw error;
    }
  };

  const saveStageAnswers = async () => {
    if (!lead || !stageId) return;

    const saved: Record<string, string | null> = {};
    fields.forEach((field) => {
      const value = String(values[field.field_key] ?? "").trim();
      saved[field.field_key] = value || null;
    });

    const { data: leadMeta, error: leadMetaError } = await supabase.from("leads").select("organization_id,custom_fields").eq("id", lead.id).single();
    if (leadMetaError) throw leadMetaError;
    const meta = leadMeta as unknown as { organization_id: string; custom_fields: Record<string, unknown> | null };

    const { error: stageDataError } = await supabase.from("lead_stage_data" as never).upsert({ organization_id: meta.organization_id, lead_id: lead.id, stage_id: stageId, data: saved } as never, { onConflict: "lead_id,stage_id" });
    if (stageDataError) throw stageDataError;

    const custom = { ...(meta.custom_fields ?? {}) } as Record<string, unknown>;
    const directPatch: Record<string, unknown> = {};
    let customChanged = false;

    fields.forEach((field) => {
      const value = saved[field.field_key];
      if (field.maps_to) directPatch[field.maps_to] = value;
      else {
        custom[field.field_key] = value;
        customChanged = true;
      }
    });

    if (isGain) {
      directPatch.product_id = productId;
      custom.valor_final_fechado = numericProposalValue;
      custom.data_boleto = effectiveDueDate;
      custom.boleto_pago = "Sim";
      custom.data_pagamento_boleto = values.data_pagamento_boleto;
      custom.data_ganho = values.data_ganho;
      customChanged = true;
    }

    const patch = { ...directPatch, ...(customChanged ? { custom_fields: custom } : {}) };
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("leads").update(patch as never).eq("id", lead.id);
      if (error) throw error;
    }

    if (latestProposal) {
      const proposalPatch: Record<string, unknown> = {};
      if (isProposal) {
        proposalPatch.boleto_due_date = values.data_boleto || null;
        const proposalAmount = parseCurrencyBRL(values.valor_fechado || "");
        if (proposalAmount > 0) proposalPatch.negotiated_value = proposalAmount;
      }
      if (isGain) {
        proposalPatch.product_id = productId;
        proposalPatch.negotiated_value = numericProposalValue;
        proposalPatch.boleto_due_date = effectiveDueDate;
        proposalPatch.status = "accepted";
        proposalPatch.accepted_at = latestProposal.accepted_at || new Date().toISOString();
      }
      if (isImplanted) {
        proposalPatch.status = "implemented";
        proposalPatch.implementation_at = latestProposal.implementation_at || new Date().toISOString();
        proposalPatch.implemented_at = latestProposal.implemented_at || new Date().toISOString();
      }
      if (Object.keys(proposalPatch).length > 0) {
        const { error } = await supabase.from("proposals" as never).update(proposalPatch as never).eq("id", latestProposal.id);
        if (error) throw error;
      }
    }

    await upsertStageActivity();
  };

  const handleDefer = async () => {
    if (!lead || !stageId) return;
    setSaving(true);
    try {
      await saveDeferredStage();
      await onConfirm();
      toast.success("Vida movida. Os dados desta etapa ficaram pendentes para responder depois.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Não foi possível mover a vida para responder depois.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!lead || !stageId) return;
    for (const field of fields) {
      if (field.required && !String(values[field.field_key] ?? "").trim()) {
        toast.error(`Preencha: ${field.label}`);
        return;
      }
    }
    if (!validateGain()) return;

    setSaving(true);
    try {
      await saveStageAnswers();
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os dados da etapa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher etapa: {stageName}</DialogTitle>
          <DialogDescription>Complete os dados desta etapa antes de mover a vida.</DialogDescription>
        </DialogHeader>

        {isLoading || proposalLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {needsCommercialSummary && (
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><p className="font-medium">Resumo comercial</p></div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Valor</p><p className="font-semibold">{money(proposalValue)}</p></div>
                  <div><p className="text-muted-foreground">Vencimento do boleto</p><p className="font-semibold">{effectiveDueDate || "Não informado"}</p></div>
                </div>
                {(isGain || isImplanted) && (
                  <div className="space-y-2">
                    <Label>Produto vendido {isGain ? "*" : ""}</Label>
                    <Select value={productId || BLANK_VALUE} onValueChange={(value) => setProductId(value === BLANK_VALUE ? "" : value)} disabled={productsLoading}>
                      <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BLANK_VALUE}>Não informado</SelectItem>
                        {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}{product.insurer_name ? ` · ${product.insurer_name}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedProduct && <p className="text-xs text-muted-foreground">Comissão corretor: {selectedProduct.broker_commission_pct}% · Administrativa: {selectedProduct.admin_commission_pct}%</p>}
                  </div>
                )}
              </div>
            )}

            {fields.map((field) => {
              const value = values[field.field_key] ?? "";
              return (
                <div key={field.id} className="space-y-2">
                  <Label>{field.label}{field.required ? " *" : ""}</Label>
                  {field.field_type === "long_text" ? (
                    <Textarea value={value} onChange={(event) => changeValue(field, event.target.value)} />
                  ) : field.field_type === "select" ? (
                    <Select value={value || BLANK_VALUE} onValueChange={(next) => changeValue(field, next === BLANK_VALUE ? "" : next)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {!field.required && <SelectItem value={BLANK_VALUE}>Não informado</SelectItem>}
                        {(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.field_type === "date" ? "date" : isMoneyField(field.field_key, field.label) ? "text" : field.field_type === "number" ? "number" : "text"}
                      inputMode={isMoneyField(field.field_key, field.label) ? "decimal" : undefined}
                      value={value}
                      onChange={(event) => changeValue(field, event.target.value)}
                    />
                  )}
                </div>
              );
            })}

            {(stageName === "Visita Agendada" || stageName === "Estudo Apresentado" || stageName === "Negociação" || stageName === "Stand-by" || stageName === "Perdido") && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex gap-2 items-start"><CalendarClock className="h-4 w-4 mt-0.5" />As datas de retorno desta etapa também alimentam a Agenda automaticamente.</div>
            )}
            {isGain && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />Ganho confirma pagamento e gera a comissão quando produto, valor e datas obrigatórias estiverem completos.</div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button variant="secondary" onClick={handleDefer} disabled={saving || isLoading}>Responder depois</Button>
          </div>
          <Button onClick={handleConfirm} disabled={saving || isLoading}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar e mover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
