import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { usePipelines, usePipelineStages, useLeadsByPipeline, useUpdateLeadStage } from "@/hooks/usePipelines";
import { usePendingActivitiesForLeads } from "@/hooks/useActivities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PartyPopper, Mail, MessageCircle, User, Clock3, Search, CalendarClock, CircleDollarSign } from "lucide-react";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { capitalizeWords } from "@/lib/formatName";
import { PipelineTabs } from "@/components/admin/PipelineTabs";
import { StageTransitionDialog } from "@/components/admin/StageTransitionDialog";

type LeadRow = {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  fonte?: string | null;
  custom_fields?: Record<string, unknown> | null;
  stage_id: string | null;
  owner_id: string | null;
  created_at: string;
  stage_entered_at?: string | null;
  resultado_diagnostico: { percentage?: number } | null;
};

type PendingMove = {
  lead: LeadRow;
  stageId: string;
  stageName: string;
} | null;

function normalize(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatMoney(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^\d,.-]/g, "").replace(".", "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function stageAge(value?: string | null) {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days}d ${rem}h` : `${days}d`;
}

function activityState(date: string) {
  const when = new Date(date);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (when < now) return "overdue" as const;
  if (when >= todayStart && when < tomorrowStart) return "today" as const;
  return "future" as const;
}

const activityDotClass = {
  overdue: "bg-red-500",
  today: "bg-amber-400",
  future: "bg-emerald-500",
};

const activityLabel = {
  overdue: "Atividade atrasada",
  today: "Atividade para hoje",
  future: "Atividade futura",
};

const KanbanPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pipelines = [] } = usePipelines();
  const [search, setSearch] = useState("");

  const activePipelineId = useMemo(() => {
    const fromUrl = searchParams.get("pipeline");
    if (fromUrl && pipelines.some((p) => p.id === fromUrl)) return fromUrl;
    return pipelines[0]?.id ?? null;
  }, [pipelines, searchParams]);

  const activePipeline = useMemo(() => pipelines.find((p) => p.id === activePipelineId) ?? null, [pipelines, activePipelineId]);
  const isAcelera = activePipeline?.nome === "Pipeline Acelera";

  useEffect(() => {
    if (activePipelineId && searchParams.get("pipeline") !== activePipelineId) {
      const next = new URLSearchParams(searchParams);
      next.set("pipeline", activePipelineId);
      setSearchParams(next, { replace: true });
    }
  }, [activePipelineId, searchParams, setSearchParams]);

  const { data: stages = [] } = usePipelineStages(activePipelineId);
  const { data: leadsRaw = [], isLoading: loadingLeads } = useLeadsByPipeline(activePipelineId);
  const leads = leadsRaw as unknown as LeadRow[];
  const { data: activities = [] } = usePendingActivitiesForLeads(leads.map((l) => l.id));
  const updateStage = useUpdateLeadStage();
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);

  const { data: members = [] } = useOrgMembers();
  const ownerMap = useMemo(() => {
    const m = new Map<string, { display_name: string | null; email: string | null }>();
    members.forEach((u) => m.set(u.id, { display_name: u.display_name, email: u.email }));
    return m;
  }, [members]);

  const nextActivityMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    activities.forEach((activity) => {
      const current = map.get(activity.lead_id);
      if (!current || new Date(activity.scheduled_at) < new Date(current.scheduled_at)) map.set(activity.lead_id, activity);
    });
    return map;
  }, [activities]);

  const filteredLeads = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return leads;
    return leads.filter((lead) => {
      const cnpj = lead.custom_fields?.cnpj;
      return [lead.empresa, lead.nome, lead.telefone, cnpj].some((value) => normalize(value).includes(q));
    });
  }, [leads, search]);

  const grouped = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    stages.forEach((s) => { g[s.id] = []; });
    filteredLeads.forEach((l) => { if (l.stage_id && g[l.stage_id]) g[l.stage_id].push(l); });
    return g;
  }, [stages, filteredLeads]);

  const handleDrop = (stageId: string) => {
    if (!dragId || !activePipelineId) return;
    const lead = leads.find((item) => item.id === dragId);
    const stage = stages.find((item) => item.id === stageId);
    setDragId(null);
    if (!lead || !stage || lead.stage_id === stageId) return;
    if (isAcelera) {
      setPendingMove({ lead, stageId, stageName: stage.nome });
      return;
    }
    updateStage.mutate({ leadId: lead.id, stageId, pipelineId: activePipelineId });
  };

  const confirmAceleraMove = async () => {
    if (!pendingMove || !activePipelineId) return;
    await updateStage.mutateAsync({ leadId: pendingMove.lead.id, stageId: pendingMove.stageId, pipelineId: activePipelineId });
    setPendingMove(null);
  };

  const selectPipeline = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("pipeline", id);
    setSearchParams(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Pipelines</h1>
          <p className="text-sm text-muted-foreground">
            {isAcelera ? "Arraste os cards entre etapas. O formulário da nova etapa será aberto antes da movimentação." : "Arraste os cards entre etapas para movê-los."}
          </p>
        </div>
        {isAcelera && (
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa, contato, telefone ou CNPJ" className="pl-9" />
          </div>
        )}
      </div>

      <PipelineTabs pipelines={pipelines} activeId={activePipelineId} onSelect={selectPipeline} />

      {!activePipelineId ? (
        <p className="text-sm text-muted-foreground">Nenhum pipeline disponível.</p>
      ) : loadingLeads ? (
        <p className="text-sm text-muted-foreground">Carregando leads…</p>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este pipeline ainda não tem etapas.</p>
      ) : (
        <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(245px, 1fr))` }}>
          {stages.map((col) => {
            const cards = grouped[col.id] ?? [];
            const overWip = col.wip_limit != null && cards.length > col.wip_limit;
            return (
              <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)} className="bg-card/50 rounded-lg p-3 min-h-[400px] border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.cor ?? "#64748b" }} />
                    {col.nome}
                    {col.celebrate_enabled && <PartyPopper className="w-3.5 h-3.5 text-primary" aria-label="Celebração ativa" />}
                  </h3>
                  <Badge variant={overWip ? "destructive" : "secondary"} className="text-xs">{cards.length}{col.wip_limit != null ? `/${col.wip_limit}` : ""}</Badge>
                </div>
                <div className="space-y-2">
                  {cards.map((lead) => {
                    const owner = ownerMap.get(lead.owner_id ?? "");
                    const wa = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
                    const nextActivity = nextActivityMap.get(lead.id);
                    const activityStatus = nextActivity ? activityState(nextActivity.scheduled_at) : null;
                    const amount = formatMoney(lead.custom_fields?.valor_apresentado ?? lead.custom_fields?.valor_fechado ?? lead.custom_fields?.valor_final_fechado);
                    return (
                      <Card key={lead.id} draggable onDragStart={() => setDragId(lead.id)} className="p-3 cursor-move hover:border-primary/50 transition-colors space-y-2">
                        <Link to={`/admin/lead/${lead.id}`} className="block space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate uppercase">{lead.empresa || lead.nome}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.nome}</p>
                            </div>
                            {activityStatus && <span title={activityLabel[activityStatus]} className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activityDotClass[activityStatus]}`} />}
                          </div>
                          {amount && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><CircleDollarSign className="w-3.5 h-3.5" /><span>{amount}</span></div>
                          )}
                        </Link>

                        <div className="pt-2 border-t border-border/50 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{owner ? capitalizeWords(owner.display_name || owner.email || "Usuário") : "Sem responsável comercial"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock3 className="w-3 h-3 shrink-0" /><span>{stageAge(lead.stage_entered_at || lead.created_at)} nesta etapa</span>
                          </div>
                          {nextActivity ? (
                            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <CalendarClock className="w-3 h-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{nextActivity.type} · {new Date(nextActivity.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarClock className="w-3 h-3 shrink-0" /><span>Sem próxima atividade</span></div>
                          )}
                          {lead.email && <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{lead.email}</span></a>}
                          {wa && <a href={`https://wa.me/${wa.startsWith("55") ? wa : `55${wa}`}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"><MessageCircle className="w-3 h-3 shrink-0" /><span className="truncate">{lead.telefone}</span></a>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StageTransitionDialog open={!!pendingMove} onOpenChange={(open) => { if (!open) setPendingMove(null); }} lead={pendingMove?.lead ?? null} stageId={pendingMove?.stageId ?? null} stageName={pendingMove?.stageName ?? "etapa"} onConfirm={confirmAceleraMove} />
    </div>
  );
};

export default KanbanPage;
