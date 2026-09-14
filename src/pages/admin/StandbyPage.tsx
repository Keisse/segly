import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock3, RotateCcw, Search, User, AlertTriangle } from "lucide-react";
import { usePipelines, usePipelineStages, useLeadsByPipeline, useUpdateLeadStage } from "@/hooks/usePipelines";
import { usePendingActivitiesForLeads } from "@/hooks/useActivities";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { capitalizeWords } from "@/lib/formatName";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type LeadRow = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  owner_id: string | null;
  stage_id: string | null;
  custom_fields?: Record<string, unknown> | null;
  stage_entered_at?: string | null;
};

type Filter = "todos" | "atrasados" | "hoje" | "futuros";

function stateOf(date?: string | null) {
  if (!date) return "sem_data" as const;
  const when = new Date(date);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (when < now) return "atrasado" as const;
  if (when >= todayStart && when < tomorrow) return "hoje" as const;
  return "futuro" as const;
}

export default function StandbyPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const { data: pipelines = [] } = usePipelines();
  const acelera = pipelines.find((p) => p.nome === "Pipeline Acelera") ?? null;
  const { data: stages = [] } = usePipelineStages(acelera?.id);
  const standbyStage = stages.find((s) => s.nome === "Stand-by") ?? null;
  const emContatoStage = stages.find((s) => s.nome.toLocaleLowerCase("pt-BR") === "em contato") ?? null;
  const { data: leadsRaw = [] } = useLeadsByPipeline(acelera?.id);
  const leads = (leadsRaw as unknown as LeadRow[]).filter((lead) => lead.stage_id === standbyStage?.id);
  const { data: activities = [] } = usePendingActivitiesForLeads(leads.map((l) => l.id));
  const { data: members = [] } = useOrgMembers();
  const updateStage = useUpdateLeadStage();

  const ownerMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.id, capitalizeWords(member.display_name || member.email || "Usuário")));
    return map;
  }, [members]);

  const returnMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    activities
      .filter((activity) => activity.type === "retorno_standby")
      .forEach((activity) => {
        const current = map.get(activity.lead_id);
        if (!current || new Date(activity.scheduled_at) < new Date(current.scheduled_at)) map.set(activity.lead_id, activity);
      });
    return map;
  }, [activities]);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return leads
      .map((lead) => ({ lead, activity: returnMap.get(lead.id), state: stateOf(returnMap.get(lead.id)?.scheduled_at) }))
      .filter(({ lead, state }) => {
        if (q && ![lead.nome, lead.empresa, lead.telefone, lead.email].some((v) => String(v ?? "").toLocaleLowerCase("pt-BR").includes(q))) return false;
        if (filter === "atrasados") return state === "atrasado";
        if (filter === "hoje") return state === "hoje";
        if (filter === "futuros") return state === "futuro";
        return true;
      })
      .sort((a, b) => {
        const da = a.activity ? new Date(a.activity.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.activity ? new Date(b.activity.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
  }, [leads, returnMap, filter, search]);

  const counts = useMemo(() => {
    const states = leads.map((lead) => stateOf(returnMap.get(lead.id)?.scheduled_at));
    return {
      total: leads.length,
      atrasados: states.filter((s) => s === "atrasado").length,
      hoje: states.filter((s) => s === "hoje").length,
      futuros: states.filter((s) => s === "futuro").length,
    };
  }, [leads, returnMap]);

  const reactivate = async (leadId: string, activityId?: string) => {
    if (!acelera?.id || !emContatoStage) return;
    try {
      if (activityId) {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("activities" as never)
          .update({ status: "concluida", completed_at: now, updated_at: now } as never)
          .eq("id", activityId);
        if (error) throw error;
      }
      await updateStage.mutateAsync({ leadId, stageId: emContatoStage.id, pipelineId: acelera.id });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      toast.success("Lead retomado e movido para Em Contato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível retomar o lead.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Stand-by</h1>
        <p className="text-sm text-muted-foreground">Leads temporariamente pausados, organizados pela data de novo contato.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total em stand-by</p><p className="text-2xl font-bold mt-1">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Retornos atrasados</p><p className="text-2xl font-bold mt-1">{counts.atrasados}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Retornos hoje</p><p className="text-2xl font-bold mt-1">{counts.hoje}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Retornos futuros</p><p className="text-2xl font-bold mt-1">{counts.futuros}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="atrasados">Atrasados</TabsTrigger>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="futuros">Futuros</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead, empresa ou contato" className="pl-9" />
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum lead neste filtro.</CardContent></Card>
        ) : rows.map(({ lead, activity, state }) => (
          <Card key={lead.id}>
            <CardContent className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/lead/${lead.id}`} className="font-semibold hover:text-primary">{lead.empresa || lead.nome}</Link>
                  {state === "atrasado" && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Atrasado</Badge>}
                  {state === "hoje" && <Badge variant="secondary">Hoje</Badge>}
                  {state === "futuro" && <Badge variant="outline">Futuro</Badge>}
                  {state === "sem_data" && <Badge variant="outline">Sem retorno agendado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">Contato: {lead.nome}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{ownerMap.get(lead.owner_id || "") || "Sem responsável"}</span>
                  {activity ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Retomar em {new Date(activity.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span> : <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Sem próxima atividade</span>}
                </div>
                {activity?.notes && <p className="text-sm text-muted-foreground">Motivo: {activity.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" asChild><Link to={`/admin/lead/${lead.id}`}>Abrir lead</Link></Button>
                <Button onClick={() => reactivate(lead.id, activity?.id)} disabled={updateStage.isPending}>
                  <RotateCcw className="h-4 w-4 mr-2" />Retomar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
