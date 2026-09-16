import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  usePipelines,
  usePipelineStages,
  useLeadsByPipeline,
  useUpdateLeadKanbanOrder,
  useUpdateLeadStage,
} from "@/hooks/usePipelines";
import { usePendingActivitiesForLeads } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartyPopper, Mail, MessageCircle, User, Clock3, Search, CalendarClock, CircleDollarSign, FileText, Pin, PinOff, Download } from "lucide-react";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { capitalizeWords } from "@/lib/formatName";
import { PipelineTabs } from "@/components/admin/PipelineTabs";

type LeadRow = {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  fonte?: string | null;
  custom_fields?: Record<string, unknown> | null;
  product_id?: string | null;
  stage_id: string | null;
  owner_id: string | null;
  created_at: string;
  stage_entered_at?: string | null;
  kanban_order: number;
  resultado_diagnostico: { percentage?: number } | null;
};

type ProposalRow = {
  id: string;
  lead_id: string;
  status: "draft" | "sent" | "accepted" | "implementation" | "implemented" | "lost";
  negotiated_value: number | string;
  created_at: string;
  products?: { name: string; insurer_name: string | null } | null;
};

type OwnerInfo = { display_name: string | null; email: string | null };
type ActivityInfo = { type: string; scheduled_at: string };
type BoardState = Record<string, string[]>;
type SortMode = "manual" | "entry_desc" | "entry_asc" | "az" | "za";

const STAGE_PREFIX = "stage:";
const stageDropId = (stageId: string) => `${STAGE_PREFIX}${stageId}`;
const fromStageDropId = (id: string) => id.startsWith(STAGE_PREFIX) ? id.slice(STAGE_PREFIX.length) : null;
const pinnedFilterKey = (pipelineId: string) => `segly:pipeline-filters:${pipelineId}`;

const proposalStatusLabel: Record<ProposalRow["status"], string> = {
  draft: "Proposta em rascunho",
  sent: "Proposta enviada",
  accepted: "Proposta aceita",
  implementation: "Em implantação",
  implemented: "Proposta implantada",
  lost: "Proposta perdida",
};

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

function cloneBoard(board: BoardState): BoardState {
  return Object.fromEntries(Object.entries(board).map(([key, ids]) => [key, [...ids]]));
}

function buildBoard(stages: { id: string }[], leads: LeadRow[]): BoardState {
  const board: BoardState = {};
  stages.forEach((stage) => { board[stage.id] = []; });
  [...leads]
    .sort((a, b) => (b.kanban_order ?? 0) - (a.kanban_order ?? 0))
    .forEach((lead) => {
      if (lead.stage_id && board[lead.stage_id]) board[lead.stage_id].push(lead.id);
    });
  return board;
}

function findContainer(board: BoardState, itemId: string) {
  return Object.keys(board).find((stageId) => board[stageId]?.includes(itemId)) ?? null;
}

function arraysEqual(a: string[] = [], b: string[] = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function calculateOrder(finalIds: string[], activeId: string, leadMap: Map<string, LeadRow>) {
  const index = finalIds.indexOf(activeId);
  const above = index > 0 ? leadMap.get(finalIds[index - 1])?.kanban_order : undefined;
  const below = index >= 0 && index < finalIds.length - 1 ? leadMap.get(finalIds[index + 1])?.kanban_order : undefined;
  if (typeof above !== "number" && typeof below !== "number") return Date.now();
  if (typeof above !== "number") return (below ?? Date.now()) + 1000;
  if (typeof below !== "number") return above - 1000;
  return (above + below) / 2;
}

const activityDotClass = { overdue: "bg-red-500", today: "bg-amber-400", future: "bg-emerald-500" };
const activityLabel = { overdue: "Atividade atrasada", today: "Atividade para hoje", future: "Atividade futura" };

function LeadCardVisual({ lead, owner, nextActivity, proposal, overlay = false }: { lead: LeadRow; owner?: OwnerInfo; nextActivity?: ActivityInfo; proposal?: ProposalRow; overlay?: boolean }) {
  const wa = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
  const activityStatus = nextActivity ? activityState(nextActivity.scheduled_at) : null;
  const amount = formatMoney(proposal?.negotiated_value ?? lead.custom_fields?.valor_apresentado ?? lead.custom_fields?.valor_fechado ?? lead.custom_fields?.valor_final_fechado);
  const mainContent = <>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold truncate uppercase">{lead.empresa || lead.nome}</p><p className="text-xs text-muted-foreground truncate">{lead.nome}</p></div>{activityStatus && <span title={activityLabel[activityStatus]} className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activityDotClass[activityStatus]}`} />}</div>
    {amount && <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><CircleDollarSign className="w-3.5 h-3.5" /><span>{amount}</span></div>}
    {proposal && <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" /><div className="min-w-0"><p className="font-medium text-foreground truncate">{proposal.products?.name || "Proposta comercial"}</p><p className="truncate">{proposalStatusLabel[proposal.status]}{proposal.products?.insurer_name ? ` · ${proposal.products.insurer_name}` : ""}</p></div></div>}
  </>;
  return <Card className={`p-3 space-y-2 ${overlay ? "border-primary/60 shadow-2xl ring-1 ring-primary/20" : "hover:border-primary/50"}`}>
    {overlay ? <div className="block space-y-1.5">{mainContent}</div> : <Link to={`/admin/lead/${lead.id}`} className="block space-y-1.5">{mainContent}</Link>}
    <div className="pt-2 border-t border-border/50 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><User className="w-3 h-3 shrink-0" /><span className="truncate">{owner ? capitalizeWords(owner.display_name || owner.email || "Usuário") : "Sem responsável comercial"}</span></div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 className="w-3 h-3 shrink-0" /><span>{stageAge(lead.stage_entered_at || lead.created_at)} nesta etapa</span></div>
      {nextActivity ? <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><CalendarClock className="w-3 h-3 shrink-0 mt-0.5" /><span className="line-clamp-2">{nextActivity.type} · {new Date(nextActivity.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div> : <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarClock className="w-3 h-3 shrink-0" /><span>Sem próxima atividade</span></div>}
      {!overlay && lead.email && <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{lead.email}</span></a>}
      {!overlay && wa && <a href={`https://wa.me/${wa.startsWith("55") ? wa : `55${wa}`}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"><MessageCircle className="w-3 h-3 shrink-0" /><span className="truncate">{lead.telefone}</span></a>}
    </div>
  </Card>;
}

function SortableLeadCard({ lead, owner, nextActivity, proposal }: { lead: LeadRow; owner?: OwnerInfo; nextActivity?: ActivityInfo; proposal?: ProposalRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  return <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-20" : "opacity-100"}`} style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "manipulation" }}><LeadCardVisual lead={lead} owner={owner} nextActivity={nextActivity} proposal={proposal} /></div>;
}

function DroppableStageColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageDropId(id) });
  return <div ref={setNodeRef} className={`bg-card/50 rounded-lg p-3 min-h-[400px] border transition-all duration-150 ${isOver ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04]" : "border-border"}`}>{children}</div>;
}

const KanbanPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pipelines = [] } = usePipelines();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [filtersPinned, setFiltersPinned] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardState>({});
  const dragStartBoard = useRef<BoardState>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerWithin(args);
    return pointer.length ? pointer : closestCenter(args);
  };

  const activePipelineId = useMemo(() => {
    const fromUrl = searchParams.get("pipeline");
    if (fromUrl && pipelines.some((p) => p.id === fromUrl)) return fromUrl;
    return pipelines[0]?.id ?? null;
  }, [pipelines, searchParams]);

  useEffect(() => {
    if (activePipelineId && searchParams.get("pipeline") !== activePipelineId) {
      const next = new URLSearchParams(searchParams);
      next.set("pipeline", activePipelineId);
      setSearchParams(next, { replace: true });
    }
  }, [activePipelineId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activePipelineId) return;
    const raw = localStorage.getItem(pinnedFilterKey(activePipelineId));
    if (!raw) {
      setFiltersPinned(false);
      setSearch("");
      setOwnerFilter("all");
      setSortMode("manual");
      return;
    }
    try {
      const saved = JSON.parse(raw) as { search?: string; ownerFilter?: string; sortMode?: SortMode };
      setSearch(saved.search ?? "");
      setOwnerFilter(saved.ownerFilter ?? "all");
      setSortMode(saved.sortMode ?? "manual");
      setFiltersPinned(true);
    } catch {
      localStorage.removeItem(pinnedFilterKey(activePipelineId));
      setFiltersPinned(false);
    }
  }, [activePipelineId]);

  useEffect(() => {
    if (!activePipelineId || !filtersPinned) return;
    localStorage.setItem(pinnedFilterKey(activePipelineId), JSON.stringify({ search, ownerFilter, sortMode }));
  }, [activePipelineId, filtersPinned, search, ownerFilter, sortMode]);

  const { data: stages = [] } = usePipelineStages(activePipelineId);
  const { data: leadsRaw = [], isLoading: loadingLeads } = useLeadsByPipeline(activePipelineId);
  const leads = leadsRaw as unknown as LeadRow[];
  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const leadIds = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const { data: activities = [] } = usePendingActivitiesForLeads(leadIds);
  const { data: proposals = [] } = useQuery({
    queryKey: ["pipeline-proposals", activePipelineId, leadIds.join(",")],
    queryFn: async () => {
      if (!leadIds.length) return [];
      const { data, error } = await supabase.from("proposals" as never).select("id,lead_id,status,negotiated_value,created_at,products(name,insurer_name)").in("lead_id", leadIds).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProposalRow[];
    },
    enabled: leadIds.length > 0,
  });
  const updateStage = useUpdateLeadStage();
  const updateOrder = useUpdateLeadKanbanOrder();

  useEffect(() => {
    if (!activeDragId) setBoard(buildBoard(stages, leads));
  }, [stages, leads, activeDragId]);

  const { data: members = [] } = useOrgMembers({ activeOnly: true });
  const ownerMap = useMemo(() => {
    const map = new Map<string, OwnerInfo>();
    members.forEach((member) => map.set(member.id, { display_name: member.display_name, email: member.email }));
    return map;
  }, [members]);

  const nextActivityMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    activities.forEach((activity) => {
      const current = map.get(activity.lead_id);
      if (!current || new Date(activity.scheduled_at) < new Date(current.scheduled_at)) map.set(activity.lead_id, activity);
    });
    return map;
  }, [activities]);

  const latestProposalMap = useMemo(() => {
    const map = new Map<string, ProposalRow>();
    proposals.forEach((proposal) => { if (!map.has(proposal.lead_id)) map.set(proposal.lead_id, proposal); });
    return map;
  }, [proposals]);

  const matchesFilters = (lead: LeadRow) => {
    if (ownerFilter === "unassigned" && lead.owner_id) return false;
    if (ownerFilter !== "all" && ownerFilter !== "unassigned" && lead.owner_id !== ownerFilter) return false;
    const q = normalize(search.trim());
    if (!q) return true;
    return [lead.empresa, lead.nome, lead.telefone, lead.email, lead.custom_fields?.cnpj].some((value) => normalize(value).includes(q));
  };

  const sortIds = (ids: string[]) => {
    if (sortMode === "manual") return ids;
    return [...ids].sort((a, b) => {
      const first = leadMap.get(a);
      const second = leadMap.get(b);
      if (!first || !second) return 0;
      if (sortMode === "entry_desc") return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      if (sortMode === "entry_asc") return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
      const aName = normalize(first.empresa || first.nome);
      const bName = normalize(second.empresa || second.nome);
      return sortMode === "az" ? aName.localeCompare(bName, "pt-BR") : bName.localeCompare(aName, "pt-BR");
    });
  };

  const visibleLeads = useMemo(() => leads.filter(matchesFilters), [leads, search, ownerFilter]);
  const activeLead = activeDragId ? leadMap.get(activeDragId) ?? null : null;

  const togglePin = () => {
    if (!activePipelineId) return;
    if (filtersPinned) {
      localStorage.removeItem(pinnedFilterKey(activePipelineId));
      setFiltersPinned(false);
    } else {
      localStorage.setItem(pinnedFilterKey(activePipelineId), JSON.stringify({ search, ownerFilter, sortMode }));
      setFiltersPinned(true);
    }
  };

  const exportCsv = () => {
    const stageMap = new Map(stages.map((stage) => [stage.id, stage.nome]));
    const rows = visibleLeads.map((lead) => [
      lead.empresa || "",
      lead.nome,
      lead.telefone || "",
      lead.email || "",
      stageMap.get(lead.stage_id || "") || "",
      ownerMap.get(lead.owner_id || "")?.display_name || ownerMap.get(lead.owner_id || "")?.email || "Sem responsável",
      new Date(lead.created_at).toLocaleString("pt-BR"),
    ]);
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [["Empresa", "Contato", "Telefone", "E-mail", "Etapa", "Responsável", "Data de entrada"], ...rows].map((row) => row.map(escape).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (event: DragStartEvent) => {
    dragStartBoard.current = cloneBoard(board);
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    setBoard((current) => {
      const sourceStage = findContainer(current, activeId);
      const stageFromArea = fromStageDropId(overId);
      const targetStage = stageFromArea ?? findContainer(current, overId);
      if (!sourceStage || !targetStage) return current;
      const next = cloneBoard(current);
      Object.keys(next).forEach((stageId) => { next[stageId] = next[stageId].filter((id) => id !== activeId); });
      if (stageFromArea) {
        next[targetStage] = [activeId, ...next[targetStage]];
        return next;
      }
      const targetIds = next[targetStage];
      const overIndex = targetIds.indexOf(overId);
      if (overIndex < 0) {
        next[targetStage] = [activeId, ...targetIds];
        return next;
      }
      const translatedTop = event.active.rect.current.translated?.top ?? 0;
      const activeHeight = event.active.rect.current.translated?.height ?? 0;
      const activeCenter = translatedTop + activeHeight / 2;
      const overCenter = event.over!.rect.top + event.over!.rect.height / 2;
      targetIds.splice(overIndex + (activeCenter > overCenter ? 1 : 0), 0, activeId);
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const lead = leadMap.get(activeId);
    const targetStage = findContainer(board, activeId);
    const sourceStage = findContainer(dragStartBoard.current, activeId);
    setActiveDragId(null);
    if (!lead || !targetStage || !sourceStage || !activePipelineId) {
      setBoard(cloneBoard(dragStartBoard.current));
      return;
    }
    const targetIds = board[targetStage] ?? [];
    const kanbanOrder = calculateOrder(targetIds, activeId, leadMap);
    const changedStage = targetStage !== sourceStage;
    const changedPosition = !arraysEqual(dragStartBoard.current[sourceStage], board[sourceStage]) || !arraysEqual(dragStartBoard.current[targetStage], board[targetStage]);
    if (!changedStage && !changedPosition) return;
    try {
      if (changedStage) await updateStage.mutateAsync({ leadId: activeId, stageId: targetStage, pipelineId: activePipelineId, kanbanOrder });
      else await updateOrder.mutateAsync({ leadId: activeId, kanbanOrder });
    } catch {
      setBoard(cloneBoard(dragStartBoard.current));
    }
  };

  const handleDragCancel = () => {
    setBoard(cloneBoard(dragStartBoard.current));
    setActiveDragId(null);
  };

  const selectPipeline = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("pipeline", id);
    setSearchParams(next);
  };

  const overlayOwner = activeLead ? ownerMap.get(activeLead.owner_id ?? "") : undefined;
  const overlayActivity = activeLead ? nextActivityMap.get(activeLead.id) : undefined;
  const overlayProposal = activeLead ? latestProposalMap.get(activeLead.id) : undefined;

  const toolbar = <div className="flex items-center gap-2">
    <div className="relative w-56"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-8 pl-8 text-xs" /></div>
    <Select value={ownerFilter} onValueChange={setOwnerFilter}><SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os usuários</SelectItem><SelectItem value="unassigned">Sem responsável</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{capitalizeWords(member.display_name || member.email || "Usuário")}</SelectItem>)}</SelectContent></Select>
    <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}><SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Ordem manual</SelectItem><SelectItem value="entry_desc">Entrada: mais recente</SelectItem><SelectItem value="entry_asc">Entrada: mais antiga</SelectItem><SelectItem value="az">A → Z</SelectItem><SelectItem value="za">Z → A</SelectItem></SelectContent></Select>
    <Button type="button" variant={filtersPinned ? "secondary" : "outline"} size="sm" className="h-8 px-2" onClick={togglePin} title={filtersPinned ? "Desafixar pesquisa" : "Fixar pesquisa"}>{filtersPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}</Button>
    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCsv}><Download className="h-3.5 w-3.5" />Exportar</Button>
  </div>;

  return <div className="p-6 space-y-4">
    <div><h1 className="text-2xl font-display font-bold">Pipelines</h1><p className="text-sm text-muted-foreground">Arraste entre colunas ou encaixe o card na posição desejada.</p></div>
    <PipelineTabs pipelines={pipelines} activeId={activePipelineId} onSelect={selectPipeline} rightActions={toolbar} />

    {!activePipelineId ? <p className="text-sm text-muted-foreground">Nenhum pipeline disponível.</p> : loadingLeads ? <p className="text-sm text-muted-foreground">Carregando leads…</p> : stages.length === 0 ? <p className="text-sm text-muted-foreground">Este pipeline ainda não tem etapas.</p> : (
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(245px, 1fr))` }}>
          {stages.map((stage) => {
            const allIds = board[stage.id] ?? [];
            const visibleIds = sortIds(allIds.filter((id) => {
              const lead = leadMap.get(id);
              return lead ? matchesFilters(lead) : false;
            }));
            const overWip = stage.wip_limit != null && allIds.length > stage.wip_limit;
            return <DroppableStageColumn key={stage.id} id={stage.id}>
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: stage.cor ?? "#64748b" }} />{stage.nome}{stage.celebrate_enabled && <PartyPopper className="w-3.5 h-3.5 text-primary" aria-label="Celebração ativa" />}</h3><Badge variant={overWip ? "destructive" : "secondary"} className="text-xs">{visibleIds.length}{stage.wip_limit != null ? `/${stage.wip_limit}` : ""}</Badge></div>
              <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}><div className="space-y-2 min-h-[320px]">{visibleIds.map((id) => { const lead = leadMap.get(id); if (!lead) return null; return <SortableLeadCard key={id} lead={lead} owner={ownerMap.get(lead.owner_id ?? "")} nextActivity={nextActivityMap.get(id)} proposal={latestProposalMap.get(id)} />; })}</div></SortableContext>
            </DroppableStageColumn>;
          })}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>{activeLead ? <div className="w-[245px] rotate-[1.5deg] scale-[1.03] cursor-grabbing pointer-events-none"><LeadCardVisual lead={activeLead} owner={overlayOwner} nextActivity={overlayActivity} proposal={overlayProposal} overlay /></div> : null}</DragOverlay>
      </DndContext>
    )}
  </div>;
};

export default KanbanPage;
