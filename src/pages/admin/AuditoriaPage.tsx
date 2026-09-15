import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, FileDiff, History, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuditEntity = "lead" | "activity" | "commission" | "payment_batch" | "compensation" | "profile" | "role" | "client" | "pipeline" | "pipeline_stage" | "stage_field" | "organization_settings" | "auth_user" | "product" | "insurer" | "proposal";
type AuditRow = {
  id: string;
  actor_id: string | null;
  entity_type: AuditEntity;
  entity_id: string;
  lead_id: string | null;
  action: "insert" | "update" | "delete";
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};
type StageFieldRow = { field_key: string; label: string };
type ProfileRow = { id: string; display_name: string | null };
type LeadRow = { id: string; nome: string; empresa: string | null };

const entityLabels: Record<AuditEntity, string> = {
  lead: "Lead", activity: "Atividade", commission: "Comissão", payment_batch: "Fechamento financeiro", compensation: "Remuneração",
  profile: "Usuário", role: "Permissão", client: "Cliente", pipeline: "Pipeline", pipeline_stage: "Etapa do pipeline",
  stage_field: "Campo da etapa", organization_settings: "Configuração", auth_user: "Conta de usuário", product: "Produto",
  insurer: "Operadora", proposal: "Proposta",
};

const fieldLabels: Record<string, string> = {
  nome: "Nome", name: "Nome", telefone: "Telefone", email: "E-mail", empresa: "Empresa", status: "Status",
  owner_id: "Responsável", pipeline_id: "Pipeline", stage_id: "Etapa", custom_fields: "Dados da etapa",
  notas: "Notas", responsible_id: "Responsável da atividade", scheduled_at: "Data da atividade", completed_at: "Data de conclusão",
  title: "Título", type: "Tipo", notes: "Observações", user_id: "Usuário", lead_id: "Lead", product_id: "Produto",
  insurer_id: "Operadora", amount: "Comissão do corretor", reference_date: "Data de pagamento", description: "Descrição",
  base_salary: "Salário base", salary_amount: "Salário", commission_amount: "Comissões", total_amount: "Total do pagamento",
  commission_count: "Quantidade de comissões", display_name: "Nome do usuário", lider_id: "Líder", organization_id: "Organização",
  is_active: "Usuário ativo", role: "Perfil de acesso", pipeline_origem: "Pipeline de origem", data_conversao: "Data de conversão",
  descricao: "Descrição", cor: "Cor", ativo: "Ativo", arquivado: "Arquivado", ordem: "Ordem", is_default: "Pipeline padrão",
  wip_limit: "Limite WIP", is_won: "Etapa ganha", is_lost: "Etapa perdida", celebrate_enabled: "Celebração ativa",
  celebrate_type: "Tipo de celebração", celebrate_audience: "Público da celebração", field_key: "Chave do campo", label: "Rótulo",
  field_type: "Tipo do campo", required: "Obrigatório", placeholder: "Placeholder", options: "Opções", maps_to: "Mapeamento",
  active: "Ativo", default_lead_owner: "Responsável padrão", track_change_history: "Histórico de mudanças",
  in_app_notifications: "Notificações no sistema", email_notifications: "Notificações por e-mail",
  inactive_lead_reminder_days: "Dias para lembrete de lead inativo", password: "Senha", category: "Categoria",
  insurer_name: "Operadora", contract_type: "Tipo de contratação", admin_commission_pct: "% administradora",
  broker_commission_pct: "% corretor", commission_base_amount: "Valor da venda", admin_amount: "Comissão da administradora",
  boleto_due_date: "Vencimento do boleto", boleto_paid_at: "Pagamento do boleto", paid_at: "Pago em", paid_by: "Pago por",
  payment_batch_id: "Fechamento", cancellation_reason: "Motivo do cancelamento", negotiated_value: "Valor negociado",
  sent_at: "Proposta enviada em", accepted_at: "Proposta aceita em", implementation_at: "Implantação iniciada em",
  implemented_at: "Implantada em", lost_reason: "Motivo da perda", deleted_at: "Excluída em", deleted_by: "Excluída por",
};

const moneyFields = new Set(["amount", "base_salary", "salary_amount", "commission_amount", "total_amount", "commission_base_amount", "admin_amount", "negotiated_value"]);
const userFields = new Set(["user_id", "owner_id", "responsible_id", "lider_id", "default_lead_owner", "paid_by", "deleted_by"]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function actionLabel(action: AuditRow["action"]) {
  if (action === "insert") return "Criado";
  if (action === "delete") return "Excluído";
  return "Alterado";
}

function formatValue(value: unknown, field: string, profiles: Map<string, string>) {
  if (value == null || value === "") return "—";
  if (userFields.has(field)) return profiles.get(String(value)) || "Usuário";
  if (field === "password") return "Atualizada";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (field.includes("date") || field.includes("data_") || field.endsWith("_at")) {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString("pt-BR");
  }
  if (moneyFields.has(field)) {
    const n = Number(value);
    if (Number.isFinite(n)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  }
  return String(value);
}

function customDiff(oldValue: unknown, newValue: unknown, labels: Map<string, string>) {
  const oldObj = asObject(oldValue);
  const newObj = asObject(newValue);
  return Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
    .filter((key) => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]))
    .map((key) => ({ key, label: labels.get(key) || key.replace(/_/g, " "), before: oldObj[key], after: newObj[key] }));
}

function subjectFromRow(row: AuditRow, profiles: Map<string, string>) {
  const src = row.new_data || row.old_data || {};
  if (["profile", "auth_user"].includes(row.entity_type)) return profiles.get(row.entity_id) || String(src.display_name || "Usuário");
  if (row.entity_type === "role") return profiles.get(String(src.user_id || "")) || "Permissão de usuário";
  if (row.entity_type === "product") return String(src.name || "Produto");
  if (row.entity_type === "insurer") return String(src.name || "Operadora");
  if (row.entity_type === "pipeline") return String(src.nome || "Pipeline");
  if (row.entity_type === "pipeline_stage") return String(src.nome || "Etapa do pipeline");
  if (row.entity_type === "proposal") return `Proposta · ${formatValue(src.negotiated_value, "negotiated_value", profiles)}`;
  if (row.entity_type === "payment_batch") return profiles.get(String(src.user_id || "")) || "Fechamento financeiro";
  if (row.entity_type === "commission" || row.entity_type === "compensation") return profiles.get(String(src.user_id || row.entity_id || "")) || entityLabels[row.entity_type];
  return entityLabels[row.entity_type] || row.entity_type;
}

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  const { data: rows = [], isLoading, error: auditError } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_events" as never)
        .select("id,actor_id,entity_type,entity_id,lead_id,action,changed_fields,old_data,new_data,created_at")
        .order("created_at", { ascending: false }).limit(750);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  const { data: stageFields = [] } = useQuery({
    queryKey: ["audit-page-stage-field-labels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_stage_fields" as never).select("field_key,label");
      if (error) throw error;
      return (data ?? []) as unknown as StageFieldRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-page-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const leadIds = useMemo(() => Array.from(new Set(rows.map((row) => row.lead_id).filter(Boolean))) as string[], [rows]);
  const { data: leads = [] } = useQuery({
    queryKey: ["audit-page-leads", leadIds.join(",")],
    queryFn: async () => {
      if (!leadIds.length) return [];
      const { data, error } = await supabase.from("leads").select("id,nome,empresa").in("id", leadIds);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
    enabled: leadIds.length > 0,
  });

  const customLabelMap = useMemo(() => new Map(stageFields.map((row) => [row.field_key, row.label])), [stageFields]);
  const profileMap = useMemo(() => new Map(profiles.map((row) => [row.id, row.display_name || "Usuário"])), [profiles]);
  const leadMap = useMemo(() => new Map(leads.map((row) => [row.id, row])), [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      if (entity !== "all" && row.entity_type !== entity) return false;
      if (action !== "all" && row.action !== action) return false;
      if (!q) return true;
      const customKeys = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap).map((item) => item.label) : [];
      const lead = row.lead_id ? leadMap.get(row.lead_id) : null;
      const payload = JSON.stringify(row.new_data ?? row.old_data ?? {});
      return [profileMap.get(row.actor_id || ""), lead?.nome, lead?.empresa, entityLabels[row.entity_type] || row.entity_type, subjectFromRow(row, profileMap), ...row.changed_fields.map((f) => fieldLabels[f] || f), ...customKeys, payload]
        .join(" ").toLocaleLowerCase("pt-BR").includes(q);
    });
  }, [rows, search, entity, action, customLabelMap, profileMap, leadMap]);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-display font-bold">Auditoria</h1><p className="text-sm text-muted-foreground">Histórico de alterações operacionais, comerciais, financeiras e de usuários. Visível apenas para líderes e administradores.</p></div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuário, lead, campo ou valor" className="pl-9" /></div>
        <Select value={entity} onValueChange={setEntity}><SelectTrigger className="lg:w-56"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">Todos os registros</SelectItem>
          {Object.entries(entityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent></Select>
        <Select value={action} onValueChange={setAction}><SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem><SelectItem value="insert">Criação</SelectItem><SelectItem value="update">Alteração</SelectItem><SelectItem value="delete">Exclusão</SelectItem></SelectContent></Select>
      </div>

      {auditError && <Card className="border-destructive/30"><CardContent className="p-4 text-sm flex gap-2 text-destructive"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>Não foi possível carregar os registros da auditoria: {auditError instanceof Error ? auditError.message : "erro desconhecido"}</span></CardContent></Card>}

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando auditoria...</p> : filtered.length === 0 && !auditError ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado com os filtros atuais.</CardContent></Card> : (
        <div className="space-y-3">{filtered.map((row) => {
          const customChanges = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap) : [];
          const lead = row.lead_id ? leadMap.get(row.lead_id) : null;
          const actorName = profileMap.get(row.actor_id || "") || "Sistema / integração";
          const subject = subjectFromRow(row, profileMap);
          return <Card key={row.id}><CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><Badge variant={row.action === "delete" ? "destructive" : row.action === "insert" ? "secondary" : "outline"}>{actionLabel(row.action)}</Badge><Badge variant="outline">{entityLabels[row.entity_type] || row.entity_type}</Badge>{row.lead_id ? <Link to={`/admin/lead/${row.lead_id}`} className="font-semibold hover:text-primary truncate">{lead?.empresa || lead?.nome || subject}</Link> : <span className="font-semibold">{subject}</span>}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{actorName}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(row.created_at).toLocaleString("pt-BR")}</span></div></div></div>

            {row.action === "update" && row.changed_fields.length > 0 && <div className="rounded-lg border bg-muted/20 overflow-hidden"><div className="px-3 py-2 border-b flex items-center gap-2 text-sm font-medium"><FileDiff className="h-4 w-4" />Campos alterados</div><div className="divide-y">
              {row.changed_fields.filter((field) => field !== "custom_fields").map((field) => <div key={field} className="grid gap-1 p-3 md:grid-cols-[190px_1fr_1fr] text-sm"><div className="font-medium">{fieldLabels[field] || field.replace(/_/g, " ")}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(row.old_data?.[field], field, profileMap)}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(row.new_data?.[field], field, profileMap)}</span></div></div>)}
              {customChanges.map((change) => <div key={`custom-${change.key}`} className="grid gap-1 p-3 md:grid-cols-[190px_1fr_1fr] text-sm"><div className="font-medium">{change.label}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(change.before, change.key, profileMap)}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(change.after, change.key, profileMap)}</span></div></div>)}
            </div></div>}

            {row.action !== "update" && <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><History className="h-4 w-4" />{row.action === "insert" ? "Registro criado no sistema." : "Registro removido do sistema."}</div>}
          </CardContent></Card>;
        })}</div>
      )}
    </div>
  );
}
