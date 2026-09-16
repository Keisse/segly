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

const money = (value: unknown) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
};

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

  const proposalDueDate = useMemo(() => {
    return latestProposal?.boleto_due_date
      ?? String(lead?.custom_fields?.data_boleto ?? "")
      ?? "";
  }, [latestProposal, lead]);

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
        initial[field.field_key] = savedValue == null ? String(fallback ?? "") : String(savedValue);
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
  const numericProposalValue = Number(String(proposalValue ?? values.valor_fechado ?? "").replace(/\./g, "").replace(",", "."));

  const changeValue = (field: PipelineStageField, value: string) => {
    let next = value;
    if (field.field_type === "phone") next = formatPhone(value);
    if (field.field_key === "cnpj") next = cnpjMask(value);
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
        const proposalAmount = Number(String(values.valor_fechado || "").replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(proposalAmount) && proposalAmount > 0) proposalPatch.negotiated_value = proposalAmount;
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
  };

  const moveLead = async (completeNow: boolean) => {
    if (!lead) return;
    if (isGain && !validateGain()) return;
    setSaving(true);
    try {
      await saveStageAnswers();
      if (completeNow) await upsertStageActivity();
      await onConfirm();
      onOpenChange(false);
      toast.success(isGain ? "Venda confirmada como ganha e pagamento registrado." : completeNow ? "Informações salvas e vida movida." : "Respostas parciais salvas. Você pode completar depois.");
    } catch (error) {
      console.error("Erro ao mover vida:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível mover a vida.");
    } finally { setSaving(false); }
  };

  const renderField = (field: PipelineStageField) => {
    const value = values[field.field_key] ?? "";
    if (field.field_type === "long_text") return <Textarea value={value} onChange={(e) => changeValue(field, e.target.value)} placeholder={field.placeholder ?? undefined} rows={3} />;
    if (field.field_type === "select") {
      const blankAllowed = !isGain;
      return <Select value={value || (blankAllowed ? BLANK_VALUE : undefined)} onValueChange={(v) => changeValue(field, v === BLANK_VALUE ? "" : v)}><SelectTrigger><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger><SelectContent>{blankAllowed && <SelectItem value={BLANK_VALUE}>Deixar em branco</SelectItem>}{field.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
    }
    const type = field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text";
    return <Input type={type} value={value} onChange={(e) => changeValue(field, e.target.value)} placeholder={field.placeholder ?? undefined} step={field.field_type === "number" ? "0.01" : undefined} />;
  };

  const description = isGain
    ? "Confirme os dados financeiros da venda. Nesta etapa o pagamento é obrigatório e libera a comissão para a previsão do próximo pagamento."
    : isImplanted
      ? "Registre somente os dados de implantação e ativação do plano. Os dados comerciais já vêm da venda ganha."
      : "Estas informações não bloqueiam a movimentação. Preencha o que souber agora, deixe o restante em branco e complete depois.";

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Informações de {stageName}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {stayedWithCurrentOperator && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-sm"><CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /><div><p className="font-semibold">Você pode agendar uma nova abordagem.</p><p className="text-muted-foreground mt-1">Se informar uma data, o Segly cria automaticamente uma atividade para o responsável comercial.</p></div></div>}

    {needsCommercialSummary && <div className="rounded-lg border bg-muted/20 p-4 space-y-3"><div className="flex items-start gap-3">{isGain ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> : <Package className="h-5 w-5 text-primary shrink-0 mt-0.5" />}<div><p className="font-semibold">{isGain ? "Conferência da venda" : "Venda que será implantada"}</p><p className="text-xs text-muted-foreground">Produto, valor e vencimento vêm da proposta e permanecem vinculados à vida.</p></div></div>
      {proposalLoading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando proposta...</div> : <div className="grid gap-2 sm:grid-cols-3 text-xs"><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Produto</span><p className="font-semibold mt-1">{selectedProduct?.name || (productId ? "Produto vinculado" : "Não informado")}</p></div><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Valor fechado</span><p className="font-semibold mt-1">{money(proposalValue)}</p></div><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Vencimento</span><p className="font-semibold mt-1">{effectiveDueDate ? new Date(`${effectiveDueDate}T12:00:00`).toLocaleDateString("pt-BR") : "Não informado"}</p></div></div>}
      {isGain && <div className="space-y-2"><Label>Produto vendido *</Label><Select value={productId || BLANK_VALUE} onValueChange={(value) => setProductId(value === BLANK_VALUE ? "" : value)} disabled={productsLoading}><SelectTrigger><SelectValue placeholder={productsLoading ? "Carregando produtos..." : "Selecione o produto"} /></SelectTrigger><SelectContent><SelectItem value={BLANK_VALUE}>Selecione o produto</SelectItem>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.category}{product.insurer_name ? ` · ${product.insurer_name}` : ""}</SelectItem>)}</SelectContent></Select>{selectedProduct && <div className="grid gap-2 sm:grid-cols-2 text-xs"><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Administradora:</span> <strong>{Number(selectedProduct.admin_commission_pct).toLocaleString("pt-BR")}% do valor fechado</strong></div><div className="rounded-md border bg-background p-2.5"><span className="text-muted-foreground">Corretor:</span> <strong>{Number(selectedProduct.broker_commission_pct).toLocaleString("pt-BR")}% da comissão da administradora</strong></div></div>}</div>}
    </div>}

    {isLoading ? <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : fields.length === 0 ? <p className="text-sm text-muted-foreground py-4">Esta etapa não possui campos adicionais.</p> : <div className="grid gap-5 md:grid-cols-2 py-2">{fields.map((field) => <div key={field.id} className={field.field_type === "long_text" ? "space-y-2 md:col-span-2" : "space-y-2"}><div className="flex items-center gap-2"><Label>{field.label}</Label>{field.required && <Badge variant="secondary" className="text-[10px] font-normal">Obrigatório</Badge>}</div>{renderField(field)}</div>)}</div>}
    <DialogFooter className="gap-2 sm:gap-2"><Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>{!isGain && <Button variant="outline" onClick={() => moveLead(false)} disabled={saving || isLoading}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar e responder depois</Button>}<Button onClick={() => moveLead(true)} disabled={saving || isLoading || (isGain && productsLoading)}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isGain ? "Confirmar venda ganha" : "Salvar e mover vida"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
