import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarDays, Clock3, FileDiff, History, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AuditRow = {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  lead_id: string | null;
  action: "insert" | "update" | "delete";
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};
type ProfileRow = { id: string; display_name: string | null; email?: string | null };
type LeadRow = { id: string; nome: string; empresa: string | null };
type LabelRow = { field_key: string; label: string };
type StageRow = { id: string; nome: string };

const entityLabels: Record<string, string> = {
  lead: "Lead",
  activity: "Atividade",
  commission: "Comissão",
  payment_batch: "Fechamento financeiro",
  compensation: "Remuneração",
  profile: "Usuário",
  role: "Permissão",
  client: "Cliente",
  pipeline: "Pipeline",
  pipeline_stage: "Etapa do pipeline",
  stage_field: "Campo de etapa",
  organization_settings: "Configuração",
  auth_user: "Conta de usuário",
  product: "Produto",
  insurer: "Operadora",
  proposal: "Proposta",
  lead_form: "Formulário",
  lead_form_field: "Campo de formulário",
  organization: "Organização",
  campaign: "Campanha",
  campaign_question: "Pergunta de campanha",
  campaign_response: "Resposta de campanha",
  contact_execution: "Execução de contato",
  principle: "Princípio",
};

const fieldLabels: Record<string, string> = {
  nome: "Nome",
  name: "Nome",
  display_name: "Nome do usuário",
  telefone: "Telefone",
  email: "E-mail",
  empresa: "Empresa",
  cargo: "Cargo",
  cnpj: "CNPJ / CPF",
  status: "Status",
  owner_id: "Responsável",
  pipeline_id: "Pipeline",
  stage_id: "Etapa",
  kanban_order: "Posição no pipeline",
  custom_fields: "Informações adicionais",
  notas: "Notas",
  responsible_id: "Responsável da atividade",
  scheduled_at: "Data da atividade",
  completed_at: "Data de conclusão",
  title: "Título",
  type: "Tipo",
  notes: "Observações",
  user_id: "Usuário",
  lead_id: "Lead",
  product_id: "Produto",
  insurer_id: "Operadora",
  amount: "Comissão",
  reference_date: "Data de referência",
  description: "Descrição",
  base_salary: "Salário base",
  salary_amount: "Salário",
  commission_amount: "Comissões",
  total_amount: "Total",
  display_name_user: "Nome",
  lider_id: "Líder",
  organization_id: "Organização",
  is_active: "Usuário ativo",
  role: "Perfil de acesso",
  pipeline_origem: "Pipeline de origem",
  data_conversao: "Data de conversão",
  descricao: "Descrição",
  cor: "Cor",
  ativo: "Ativo",
  arquivado: "Arquivado",
  ordem: "Ordem",
  is_default: "Padrão",
  wip_limit: "Limite WIP",
  is_won: "Etapa ganha",
  is_lost: "Etapa perdida",
  celebrate_enabled: "Celebração ativa",
  celebrate_type: "Tipo de celebração",
  celebrate_audience: "Público da celebração",
  field_key: "Chave do campo",
  label: "Rótulo",
  field_type: "Tipo do campo",
  required: "Importante",
  placeholder: "Placeholder",
  options: "Opções",
  maps_to: "Mapeamento",
  active: "Ativo",
  default_lead_owner: "Responsável padrão",
  track_change_history: "Histórico de mudanças",
  in_app_notifications: "Notificações no sistema",
  email_notifications: "Notificações por e-mail",
  inactive_lead_reminder_days: "Dias para lembrete",
  category: "Categoria",
  insurer_name: "Operadora",
  contract_type: "Tipo de contratação",
  admin_commission_pct: "% administradora",
  broker_commission_pct: "% corretor",
  commission_base_amount: "Valor da venda",
  admin_amount: "Comissão da administradora",
  boleto_due_date: "Vencimento do boleto",
  boleto_paid_at: "Pagamento do boleto",
  paid_at: "Pago em",
  paid_by: "Pago por",
  payment_batch_id: "Fechamento",
  cancellation_reason: "Motivo do cancelamento",
  negotiated_value: "Valor negociado",
  sent_at: "Proposta enviada em",
  accepted_at: "Proposta aceita em",
  implementation_at: "Implantação iniciada em",
  implemented_at: "Implantada em",
  lost_reason: "Motivo da perda",
  form_id: "Formulário",
  help_text: "Texto de ajuda",
  default_value: "Valor padrão",
  validation: "Validação",
  is_system: "Campo do sistema",
  question_text: "Pergunta",
  question_type: "Tipo da pergunta",
  answer_text: "Resposta",
  answer_value: "Valor da resposta",
  contact_type: "Tipo de contato",
  executed_by: "Executado por",
  on_time: "No prazo",
  phrase: "Princípio",
  audience: "Público",
};

const userFields = new Set(["user_id", "owner_id", "responsible_id", "lider_id", "default_lead_owner", "paid_by", "deleted_by", "executed_by", "created_by"]);
const moneyFields = new Set(["amount", "base_salary", "salary_amount", "commission_amount", "total_amount", "commission_base_amount", "admin_amount", "negotiated_value"]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function customDiff(oldValue: unknown, newValue: unknown, labels: Map<string, string>) {
  const oldObj = asObject(oldValue);
  const newObj = asObject(newValue);
  return Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
    .filter((key) => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]))
    .map((key) => ({ key, label: labels.get(key) || key.replace(/_/g, " "), before: oldObj[key], after: newObj[key] }));
}

function actionLabel(action: AuditRow["action"]) {
  if (action === "insert") return "Criado";
  if (action === "delete") return "Excluído";
  return "Alterado";
}

function formatValue(value: unknown, field: string, profiles: Map<string, string>, stages: Map<string, string>) {
  if (value == null || value === "") return "—";
  if (field === "stage_id") return stages.get(String(value)) || String(value);
  if (userFields.has(field)) return profiles.get(String(value)) || "Usuário";
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

function subjectFromRow(row: AuditRow, profiles: Map<string, string>) {
  const src = row.new_data || row.old_data || {};
  if (["profile", "auth_user"].includes(row.entity_type)) return profiles.get(row.entity_id) || String(src.display_name || "Usuário");
  if (row.entity_type === "role") return profiles.get(String(src.user_id || "")) || "Permissão de usuário";
  if (["product", "lead_form", "campaign"].includes(row.entity_type)) return String(src.name || entityLabels[row.entity_type]);
  if (row.entity_type === "insurer") return String(src.name || "Operadora");
  if (row.entity_type === "pipeline" || row.entity_type === "pipeline_stage") return String(src.nome || entityLabels[row.entity_type]);
  if (row.entity_type === "lead_form_field" || row.entity_type === "stage_field") return String(src.label || entityLabels[row.entity_type]);
  if (row.entity_type === "campaign_question") return String(src.question_text || "Pergunta de campanha");
  if (row.entity_type === "principle") return String(src.phrase || "Princípio");
  return entityLabels[row.entity_type] || row.entity_type;
}

export default function AuditoriaPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: rows = [], isLoading, error: auditError } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_events" as never)
        .select("id,actor_id,entity_type,entity_id,lead_id,action,changed_fields,old_data,new_data,created_at")
        .order("created_at", { ascending: false })
        .limit(1500);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["change-log-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name,email");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: stageFields = [] } = useQuery({
    queryKey: ["change-log-stage-fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_stage_fields" as never).select("field_key,label");
      if (error) throw error;
      return (data ?? []) as unknown as LabelRow[];
    },
  });

  const { data: formFields = [] } = useQuery({
    queryKey: ["change-log-form-fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_form_fields" as never).select("field_key,label");
      if (error) throw error;
      return (data ?? []) as unknown as LabelRow[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["change-log-stages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_stages" as never).select("id,nome");
      if (error) throw error;
      return (data ?? []) as unknown as StageRow[];
    },
  });

  const leadIds = useMemo(() => Array.from(new Set(rows.map((row) => row.lead_id).filter(Boolean))) as string[], [rows]);
  const { data: leads = [] } = useQuery({
    queryKey: ["change-log-leads", leadIds.join(",")],
    queryFn: async () => {
      if (!leadIds.length) return [];
      const { data, error } = await supabase.from("leads").select("id,nome,empresa").in("id", leadIds);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
    enabled: leadIds.length > 0,
  });

  const profileMap = useMemo(() => new Map(profiles.map((row) => [row.id, row.display_name || row.email || "Usuário"])), [profiles]);
  const leadMap = useMemo(() => new Map(leads.map((row) => [row.id, row])), [leads]);
  const stageMap = useMemo(() => new Map(stages.map((row) => [row.id, row.nome])), [stages]);
  const dynamicLabels = useMemo(() => new Map([...stageFields, ...formFields].map((row) => [row.field_key, row.label])), [stageFields, formFields]);

  const filtered = useMemo(() => {
    const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return rows.filter((row) => {
      const when = new Date(row.created_at);
      if (start && when < start) return false;
      if (end && when > end) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold">Log de alterações</h1>
        <p className="text-sm text-muted-foreground">Todas as alterações registradas no sistema, da mais recente para a mais antiga.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data inicial</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="md:w-44" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data final</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="md:w-44" />
          </div>
          <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpar filtro</Button>
          <div className="md:ml-auto text-sm text-muted-foreground inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{filtered.length} alterações</div>
        </CardContent>
      </Card>

      {auditError && <Card className="border-destructive/30"><CardContent className="p-4 text-sm flex gap-2 text-destructive"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>Não foi possível carregar o log: {auditError instanceof Error ? auditError.message : "erro desconhecido"}</span></CardContent></Card>}

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando alterações...</p> : filtered.length === 0 && !auditError ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma alteração encontrada nesse período.</CardContent></Card> : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const customChanges = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, dynamicLabels) : [];
            const lead = row.lead_id ? leadMap.get(row.lead_id) : null;
            const actorName = profileMap.get(row.actor_id || "") || "Sistema / integração";
            const subject = subjectFromRow(row, profileMap);
            const normalFields = row.changed_fields.filter((field) => !["custom_fields", "historico", "updated_at", "stage_entered_at"].includes(field));

            return <Card key={row.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.action === "delete" ? "destructive" : row.action === "insert" ? "secondary" : "outline"}>{actionLabel(row.action)}</Badge>
                      <Badge variant="outline">{entityLabels[row.entity_type] || row.entity_type}</Badge>
                      {row.lead_id ? <Link to={`/admin/lead/${row.lead_id}`} className="font-semibold hover:text-primary truncate">{lead?.empresa || lead?.nome || subject}</Link> : <span className="font-semibold">{subject}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{actorName}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(row.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                {row.action === "update" && (normalFields.length > 0 || customChanges.length > 0) && <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <div className="px-3 py-2 border-b flex items-center gap-2 text-sm font-medium"><FileDiff className="h-4 w-4" />Edições realizadas</div>
                  <div className="divide-y">
                    {normalFields.map((field) => {
                      const before = formatValue(row.old_data?.[field], field, profileMap, stageMap);
                      const after = formatValue(row.new_data?.[field], field, profileMap, stageMap);
                      const label = dynamicLabels.get(field) || fieldLabels[field] || field.replace(/_/g, " ");
                      return <div key={field} className="grid gap-2 p-3 md:grid-cols-[210px_1fr] text-sm">
                        <div className="font-medium">{label}</div>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground"><span className="break-words">{before}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /><span className="text-foreground break-words">{after}</span></div>
                      </div>;
                    })}
                    {customChanges.map((change) => <div key={`custom-${change.key}`} className="grid gap-2 p-3 md:grid-cols-[210px_1fr] text-sm">
                      <div className="font-medium">{change.label}</div>
                      <div className="flex flex-wrap items-center gap-2 text-muted-foreground"><span className="break-words">{formatValue(change.before, change.key, profileMap, stageMap)}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /><span className="text-foreground break-words">{formatValue(change.after, change.key, profileMap, stageMap)}</span></div>
                    </div>)}
                  </div>
                </div>}

                {row.action !== "update" && <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><History className="h-4 w-4" />{row.action === "insert" ? "Registro criado no sistema." : "Registro excluído do sistema."}</div>}
              </CardContent>
            </Card>;
          })}
        </div>
      )}
    </div>
  );
}
