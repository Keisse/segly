import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, Search, User, Clock3, FileDiff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuditEntity = "lead" | "activity" | "commission" | "compensation" | "profile" | "role" | "client" | "pipeline" | "pipeline_stage" | "stage_field" | "organization_settings" | "auth_user";
type AuditRow = {
  id: string;
  entity_type: AuditEntity;
  entity_id: string;
  lead_id: string | null;
  action: "insert" | "update" | "delete";
  changed_fields: string[];
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: string; display_name: string | null } | null;
  lead?: { id: string; nome: string; empresa: string | null } | null;
};
type StageFieldRow = { field_key: string; label: string };
type ProfileRow = { id: string; display_name: string | null };

const entityLabels: Record<AuditEntity, string> = {
  lead: "Lead", activity: "Atividade", commission: "Comissão", compensation: "Remuneração",
  profile: "Usuário", role: "Permissão", client: "Cliente", pipeline: "Pipeline",
  pipeline_stage: "Etapa do pipeline", stage_field: "Campo da etapa", organization_settings: "Configuração", auth_user: "Conta de usuário",
};

const fieldLabels: Record<string, string> = {
  nome: "Nome", telefone: "Telefone", email: "E-mail", empresa: "Empresa", status: "Status",
  owner_id: "Responsável", pipeline_id: "Pipeline", stage_id: "Etapa", custom_fields: "Dados da etapa",
  notas: "Notas", responsible_id: "Responsável da atividade", scheduled_at: "Data da atividade",
  completed_at: "Data de conclusão", title: "Título", type: "Tipo", notes: "Observações",
  user_id: "Usuário", lead_id: "Lead", amount: "Valor", reference_date: "Data de referência",
  description: "Descrição", base_salary: "Salário base", display_name: "Nome do usuário", lider_id: "Líder",
  organization_id: "Organização", is_active: "Usuário ativo", role: "Perfil de acesso",
  pipeline_origem: "Pipeline de origem", data_conversao: "Data de conversão", descricao: "Descrição",
  cor: "Cor", ativo: "Ativo", arquivado: "Arquivado", ordem: "Ordem", is_default: "Pipeline padrão",
  wip_limit: "Limite WIP", is_won: "Etapa ganha", is_lost: "Etapa perdida", celebrate_enabled: "Celebração ativa",
  celebrate_type: "Tipo de celebração", celebrate_audience: "Público da celebração", field_key: "Chave do campo",
  label: "Rótulo", field_type: "Tipo do campo", required: "Obrigatório", placeholder: "Placeholder", options: "Opções",
  maps_to: "Mapeamento", active: "Campo ativo", default_lead_owner: "Responsável padrão",
  track_change_history: "Histórico de mudanças", in_app_notifications: "Notificações no sistema",
  email_notifications: "Notificações por e-mail", inactive_lead_reminder_days: "Dias para lembrete de lead inativo",
  password: "Senha",
};

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
  if (["user_id", "owner_id", "responsible_id", "lider_id", "default_lead_owner"].includes(field)) return profiles.get(String(value)) || "Usuário";
  if (field === "password") return "Atualizada";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (field.includes("date") || field.includes("data_") || field.endsWith("_at")) {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString("pt-BR");
  }
  if (field === "amount" || field === "base_salary") {
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

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_events" as never)
        .select("id,entity_type,entity_id,lead_id,action,changed_fields,old_data,new_data,created_at,actor:profiles!audit_events_actor_id_fkey(id,display_name),lead:leads(id,nome,empresa)")
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

  const customLabelMap = useMemo(() => new Map(stageFields.map((row) => [row.field_key, row.label])), [stageFields]);
  const profileMap = useMemo(() => new Map(profiles.map((row) => [row.id, row.display_name || "Usuário"])), [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      if (entity !== "all" && row.entity_type !== entity) return false;
      if (action !== "all" && row.action !== action) return false;
      if (!q) return true;
      const customKeys = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap).map((item) => item.label) : [];
      const payload = JSON.stringify(row.new_data ?? row.old_data ?? {});
      return [row.actor?.display_name, row.lead?.nome, row.lead?.empresa, entityLabels[row.entity_type], ...row.changed_fields.map((f) => fieldLabels[f] || f), ...customKeys, payload]
        .join(" ").toLocaleLowerCase("pt-BR").includes(q);
    });
  }, [rows, search, entity, action, customLabelMap]);

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

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando auditoria...</p> : filtered.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</CardContent></Card> : (
        <div className="space-y-3">{filtered.map((row) => {
          const customChanges = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap) : [];
          const subjectUser = String(row.new_data?.user_id || row.old_data?.user_id || (row.entity_type === "profile" || row.entity_type === "auth_user" ? row.entity_id : ""));
          const subjectName = subjectUser ? profileMap.get(subjectUser) : null;
          return <Card key={row.id}><CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><Badge variant={row.action === "delete" ? "destructive" : row.action === "insert" ? "secondary" : "outline"}>{actionLabel(row.action)}</Badge><Badge variant="outline">{entityLabels[row.entity_type]}</Badge>{row.lead_id && <Link to={`/admin/lead/${row.lead_id}`} className="font-semibold hover:text-primary truncate">{row.lead?.empresa || row.lead?.nome || "Abrir lead"}</Link>}{!row.lead_id && subjectName && <span className="font-semibold">{subjectName}</span>}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{row.actor?.display_name || "Sistema / integração"}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(row.created_at).toLocaleString("pt-BR")}</span></div></div></div>

            {row.action === "update" && row.changed_fields.length > 0 && <div className="rounded-lg border bg-muted/20 overflow-hidden"><div className="px-3 py-2 border-b flex items-center gap-2 text-sm font-medium"><FileDiff className="h-4 w-4" />Campos alterados</div><div className="divide-y">
              {row.changed_fields.filter((field) => field !== "custom_fields").map((field) => <div key={field} className="grid gap-1 p-3 md:grid-cols-[190px_1fr_1fr] text-sm"><div className="font-medium">{fieldLabels[field] || field}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(row.old_data?.[field], field, profileMap)}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(row.new_data?.[field], field, profileMap)}</span></div></div>)}
              {customChanges.map((change) => <div key={`custom-${change.key}`} className="grid gap-1 p-3 md:grid-cols-[190px_1fr_1fr] text-sm"><div className="font-medium">{change.label}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(change.before, change.key, profileMap)}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(change.after, change.key, profileMap)}</span></div></div>)}
            </div></div>}

            {row.action !== "update" && <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><History className="h-4 w-4" />{row.action === "insert" ? "Registro criado no sistema." : "Registro removido do sistema."}</div>}
          </CardContent></Card>;
        })}</div>
      )}
    </div>
  );
}
