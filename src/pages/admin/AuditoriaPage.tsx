import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, Search, User, Clock3, FileDiff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuditRow = {
  id: string;
  entity_type: "lead" | "activity";
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

const fieldLabels: Record<string, string> = {
  nome: "Nome", telefone: "Telefone", email: "E-mail", empresa: "Empresa", status: "Status",
  owner_id: "Responsável", pipeline_id: "Pipeline", stage_id: "Etapa", custom_fields: "Dados da etapa",
  notas: "Notas", responsible_id: "Responsável da atividade", scheduled_at: "Data da atividade",
  completed_at: "Data de conclusão", title: "Título", type: "Tipo", notes: "Observações",
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function customDiff(oldValue: unknown, newValue: unknown, labels: Map<string, string>) {
  const oldObj = asObject(oldValue);
  const newObj = asObject(newValue);
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  return keys
    .filter((key) => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]))
    .map((key) => ({ key, label: labels.get(key) || key.replace(/_/g, " "), before: oldObj[key], after: newObj[key] }));
}

function actionLabel(action: AuditRow["action"]) {
  if (action === "insert") return "Criado";
  if (action === "delete") return "Excluído";
  return "Alterado";
}

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events" as never)
        .select("id,entity_type,entity_id,lead_id,action,changed_fields,old_data,new_data,created_at,actor:profiles!audit_events_actor_id_fkey(id,display_name),lead:leads(id,nome,empresa)")
        .order("created_at", { ascending: false })
        .limit(500);
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

  const customLabelMap = useMemo(() => new Map(stageFields.map((row) => [row.field_key, row.label])), [stageFields]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      if (entity !== "all" && row.entity_type !== entity) return false;
      if (action !== "all" && row.action !== action) return false;
      if (!q) return true;
      const customKeys = row.changed_fields.includes("custom_fields")
        ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap).map((item) => item.label)
        : [];
      const haystack = [row.actor?.display_name, row.lead?.nome, row.lead?.empresa, ...row.changed_fields.map((f) => fieldLabels[f] || f), ...customKeys].join(" ").toLocaleLowerCase("pt-BR");
      return haystack.includes(q);
    });
  }, [rows, search, entity, action, customLabelMap]);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-display font-bold">Auditoria</h1><p className="text-sm text-muted-foreground">Histórico completo de alterações em leads e atividades. Visível apenas para líderes e administradores.</p></div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por usuário, lead, empresa ou campo alterado" className="pl-9" /></div>
        <Select value={entity} onValueChange={setEntity}><SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os registros</SelectItem><SelectItem value="lead">Leads</SelectItem><SelectItem value="activity">Atividades</SelectItem></SelectContent></Select>
        <Select value={action} onValueChange={setAction}><SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as ações</SelectItem><SelectItem value="insert">Criação</SelectItem><SelectItem value="update">Alteração</SelectItem><SelectItem value="delete">Exclusão</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando auditoria...</p> : filtered.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</CardContent></Card> : (
        <div className="space-y-3">{filtered.map((row) => {
          const customChanges = row.changed_fields.includes("custom_fields") ? customDiff(row.old_data?.custom_fields, row.new_data?.custom_fields, customLabelMap) : [];
          return <Card key={row.id}><CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><Badge variant={row.action === "delete" ? "destructive" : row.action === "insert" ? "secondary" : "outline"}>{actionLabel(row.action)}</Badge><Badge variant="outline">{row.entity_type === "lead" ? "Lead" : "Atividade"}</Badge>{row.lead_id && <Link to={`/admin/lead/${row.lead_id}`} className="font-semibold hover:text-primary truncate">{row.lead?.empresa || row.lead?.nome || "Abrir lead"}</Link>}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{row.actor?.display_name || "Sistema / origem externa"}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(row.created_at).toLocaleString("pt-BR")}</span></div></div></div>

            {row.action === "update" && row.changed_fields.length > 0 && <div className="rounded-lg border bg-muted/20 overflow-hidden"><div className="px-3 py-2 border-b flex items-center gap-2 text-sm font-medium"><FileDiff className="h-4 w-4" />Campos alterados</div><div className="divide-y">
              {row.changed_fields.filter((field) => field !== "custom_fields").map((field) => <div key={field} className="grid gap-1 p-3 md:grid-cols-[180px_1fr_1fr] text-sm"><div className="font-medium">{fieldLabels[field] || field}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(row.old_data?.[field])}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(row.new_data?.[field])}</span></div></div>)}
              {customChanges.map((change) => <div key={`custom-${change.key}`} className="grid gap-1 p-3 md:grid-cols-[180px_1fr_1fr] text-sm"><div className="font-medium">{change.label}</div><div><span className="text-xs text-muted-foreground block">Antes</span><span className="break-words">{formatValue(change.before)}</span></div><div><span className="text-xs text-muted-foreground block">Depois</span><span className="break-words">{formatValue(change.after)}</span></div></div>)}
            </div></div>}

            {row.action !== "update" && <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><History className="h-4 w-4" />{row.action === "insert" ? "Registro criado no sistema." : "Registro removido do sistema."}</div>}
          </CardContent></Card>;
        })}</div>
      )}
    </div>
  );
}
