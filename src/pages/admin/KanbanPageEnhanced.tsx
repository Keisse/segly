import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { usePipelines, usePipelineStages, useLeadsByPipeline, useUpdateLeadStage } from "@/hooks/usePipelines";
import { usePendingActivitiesForLeads } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PartyPopper, Mail, MessageCircle, User, Clock3, Search, CalendarClock, CircleDollarSign, FileText, UsersRound } from "lucide-react";
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
  product_id?: string | null;
  stage_id: string | null;
  owner_id: string | null;
  created_at: string;
  stage_entered_at?: string | null;
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
type PendingMove = { lead: LeadRow; stageId: string; stageName: string; previousStageId: string | null } | null;
type AgeDistribution = { total: number; faixas: Array<{ label: string; count: number }> };

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

const AGE_RANGES = [
  { label: "0 a 18 anos de idade", min: 0, max: 18 },
  { label: "19 a 23 anos de idade", min: 19, max: 23 },
  { label: "24 a 28 anos de idade", min: 24, max: 28 },
  { label: "29 a 33 anos de idade", min: 29, max: 33 },
  { label: "34 a 38 anos de idade", min: 34, max: 38 },
  { label: "39 a 43 anos de idade", min: 39, max: 43 },
  { label: "44 a 48 anos de idade", min: 44, max: 48 },
  { label: "49 a 53 anos de idade", min: 49, max: 53 },
  { label: "54 a 58 anos de idade", min: 54, max: 58 },
  { label: "59 anos de idade e acima", min: 59, max: Number.POSITIVE_INFINITY },
];

function normalizeBirthDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!br) return "";
  return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
}

function birthDateValues(value: unknown, count: number) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[;,\n]+/).map((item) => item.trim()).filter(Boolean);
  return Array.from({ length: Math.max(0, count) }, (_, index) => normalizeBirthDate(source[index]));
}

function calculateAge(value: string) {
  if (!value) return null;
  const birth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

function getAgeDistribution(lead: LeadRow): AgeDistribution | null {
  const count = Math.min(100, Math.max(0, Math.trunc(Number(lead.custom_fields?.quantidade_pessoas ?? 0) || 0)));
  if (!count) return null;

  const ages = birthDateValues(lead.custom_fields?.datas_nascimento, count)
    .map(calculateAge)
    .filter((age): age is number => age !== null);

  if (!ages.length) return null;

  return {
    total: ages.length,
    faixas: AGE_RANGES.map((range) => ({
      label: range.label,
      count: ages.filter((age) => age >= range.min && age <= range.max).length,
    })),
  };
}

const activityDotClass = { overdue: "bg-red-500", today: "bg-amber-400", future: "bg-emerald-500" };
const activityLabel = { overdue: "Atividade atrasada", today: "Atividade para hoje", future: "Atividade futura" };

function LeadCardVisual({ lead, owner, nextActivity, proposal, overlay = false }: { lead: LeadRow; owner?: OwnerInfo; nextActivity?: ActivityInfo; proposal?: ProposalRow; overlay?: boolean }) {
  const wa = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
  const activityStatus = nextActivity ? activityState(nextActivity.scheduled_at) : null;
  const amount = formatMoney(proposal?.negotiated_value ?? lead.custom_fields?.valor_apresentado ?? lead.custom_fields?.valor_fechado ?? lead.custom_fields?.valor_final_fechado);
  const ageDistribution = getAgeDistribution(lead);
  const mainContent = <>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold truncate uppercase">{lead.empresa || lead.nome}</p><p className="text-xs text-muted-foreground truncate">{lead.nome}</p></div>{activityStatus && <span title={activityLabel[activityStatus]} className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activityDotClass[activityStatus]}`} />}</div>
    {amount && <div className="flex items-center gap-1.5 text-xs font-medium text-foreground"><CircleDollarSign className="w-3.5 h-3.5" /><span>{amount}</span></div>}
    {proposal && <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" /><div className="min-w-0"><p className="font-medium text-foreground truncate">{proposal.products?.name || "Proposta comercial"}</p><p className="truncate">{proposalStatusLabel[proposal.status]}{proposal.products?.insurer_name ? ` · ${proposal.products.insurer_name}` : ""}</p></div></div>}
    {ageDistribution && <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
      <UsersRound className="h-3.5 w-3.5 shrink-0 mt-1" />
      <div className="min-w-0">
        <span className="font-medium text-foreground">Faixas etárias</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {ageDistribution.faixas.filter((row) => row.count > 0).map((row) => {
            const label = row.label
              .replace(" anos de idade", "")
              .replace(" de idade", "")
              .replace(/\s+a\s+/g, "–")
              .replace(/acima de\s*/i, "")
              .replace(/mais de\s*/i, "");
            const suffix = /(acima de|mais de)/i.test(row.label) ? "+" : "";
            return (
              <span key={row.label} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-0.5 pr-2 font-medium text-primary">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                  {row.count}
                </span>
                <span className="whitespace-nowrap">{label}{suffix}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>}
  </>;

  return <Card className={`p-3 space-y-2 ${overlay ? "border-primary/60 shadow-2xl ring-1 ring-primary/20" : "hover:border-primary/50"}`}>
    {overlay ? <div className="block space-y-1.5">{mainContent}</div> : <Link to={`/admin/lead/${lead.id}`} draggable={false} className="block space-y-1.5">{mainContent}</Link>}
    <div className="pt-2 border-t border-border/50 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><User className="w-3 h-3 shrink-0" /><span className="truncate">{owner ? capitalizeWords(owner.display_name || owner.email || "Usuário") : "Sem responsável comercial"}</span></div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 className="w-3 h-3 shrink-0" /><span>{stageAge(lead.stage_entered_at || lead.created_at)} nesta etapa</span></div>
      {nextActivity ? <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><CalendarClock className="w-3 h-3 shrink-0 mt-0.5" /><span className="line-clamp-2">{nextActivity.type} · {new Date(nextActivity.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div> : <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarClock className="w-3 h-3 shrink-0" /><span>Sem próxima atividade</span></div>}
      {!overlay && lead.email && <a href={`mailto:${lead.email}`} draggable={false} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{lead.email}</span></a>}
      {!overlay && wa && <a href={`https://wa.me/${wa.startsWith("55") ? wa : `55${wa}`}`} target="_blank" rel="noreferrer" draggable={false} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"><MessageCircle className="w-3 h-3 shrink-0" /><span className="truncate">{lead.telefone}</span></a>}
    </div>
  </Card>;
}

function DraggableLeadCard({ lead, owner, nextActivity, proposal }: { lead: LeadRow; owner?: OwnerInfo; nextActivity?: ActivityInfo; proposal?: ProposalRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`select-none cursor-grab active:cursor-grabbing transition-[opacity,transform] duration-150 ${isDragging ? "opacity-25 scale-[0.98]" : "opacity-100 scale-100"}`}
      style={{ touchAction: "none" }}
      onDragStart={(event) => event.preventDefault()}
    >
      <LeadCardVisual lead={lead} owner={owner} nextActivity={nextActivity} proposal={proposal} />
    </div>
  );
}

function DroppableStageColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`bg-card/50 rounded-lg p-3 min-h-[400px] border transition-all duration-150 ${isOver ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04] scale-[1.005]" : "border-border"}`}>{children}</div>;
}

const KanbanPageEnhanced = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pipelines = [] } = usePipelines();
  const [search, setSearch] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [optimisticStages, setOptimisticStages] = useState<Record<string, string>>({});
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);
  const moveConfirmedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const activePipelineId = useMemo(() => {
    const fromUrl = searchParams.get("pipeline");
    if (fromUrl && pipelines.some((p) => p.id === fromUrl)) return fromUrl;
    return pipelines[0]?.id ?? null;
  }, [pipelines, searchParams]);
  const activePipeline = useMemo(() => pipelines.find((p) => p.id === activePipelineId) ?? null, [pipelines, activePipelineId]);
  const isAcelera = activePipeline?.nome === "Pipeline Acelera";

  useEffect(() => {
    if (activePipelineId && searchParams.get("pipeline") !== activePipelineId) {
      const next = new URLSearchParams(searchParams); next.set("pipeline", activePipelineId); setSearchParams(next, { replace: true });
    }
  }, [activePipelineId, searchParams, setSearchParams]);

  const { data: stages = [] } = usePipelineStages(activePipelineId);
  const { data: leadsRaw = [], isLoading: loadingLeads } = useLeadsByPipeline(activePipelineId);
  const leads = leadsRaw as unknown as LeadRow[];
  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const { data: activities = [] } = usePendingActivitiesForLeads(leadIds);
  const { data: proposals = [] } = useQuery({ queryKey: ["pipeline-proposals", activePipelineId, leadIds.join(",")], queryFn: async () => { if (!leadIds.length) return []; const { data, error } = await supabase.from("proposals" as never).select("id,lead_id,status,negotiated_value,created_at,products(name,insurer_name)").in("lead_id", leadIds).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as unknown as ProposalRow[]; }, enabled: leadIds.length > 0 });
  const updateStage = useUpdateLeadStage();
  const { data: members = [] } = useOrgMembers();
  const ownerMap = useMemo(() => { const m = new Map<string, OwnerInfo>(); members.forEach((u) => m.set(u.id, { display_name: u.display_name, email: u.email })); return m; }, [members]);
  const nextActivityMap = useMemo(() => { const map = new Map<string, (typeof activities)[number]>(); activities.forEach((activity) => { const current = map.get(activity.lead_id); if (!current || new Date(activity.scheduled_at) < new Date(current.scheduled_at)) map.set(activity.lead_id, activity); }); return map; }, [activities]);
  const latestProposalMap = useMemo(() => { const map = new Map<string, ProposalRow>(); proposals.forEach((proposal) => { if (!map.has(proposal.lead_id)) map.set(proposal.lead_id, proposal); }); return map; }, [proposals]);

  useEffect(() => {
    setOptimisticStages((current) => {
      let changed = false; const next = { ...current };
      Object.entries(current).forEach(([leadId, stageId]) => { const lead = leads.find((item) => item.id === leadId); if (!lead || lead.stage_id === stageId) { delete next[leadId]; changed = true; } });
      return changed ? next : current;
    });
  }, [leads]);

  const filteredLeads = useMemo(() => { const q = normalize(search.trim()); if (!q) return leads; return leads.filter((lead) => { const cnpj = lead.custom_fields?.cnpj; return [lead.empresa, lead.nome, lead.telefone, cnpj].some((value) => normalize(value).includes(q)); }); }, [leads, search]);
  const grouped = useMemo(() => { const g: Record<string, LeadRow[]> = {}; stages.forEach((s) => { g[s.id] = []; }); filteredLeads.forEach((lead) => { const effectiveStageId = optimisticStages[lead.id] ?? lead.stage_id; if (effectiveStageId && g[effectiveStageId]) g[effectiveStageId].push(lead); }); return g; }, [stages, filteredLeads, optimisticStages]);
  const activeLead = useMemo(() => leads.find((lead) => lead.id === activeDragId) ?? null, [leads, activeDragId]);

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));
  const handleDragEnd = async (event: DragEndEvent) => {
    const leadId = String(event.active.id); const targetStageId = event.over ? String(event.over.id) : null; setActiveDragId(null);
    if (!targetStageId || !activePipelineId) return;
    const lead = leads.find((item) => item.id === leadId); const stage = stages.find((item) => item.id === targetStageId);
    if (!lead || !stage) return;
    const currentStageId = optimisticStages[lead.id] ?? lead.stage_id;
    if (currentStageId === targetStageId) return;
    setOptimisticStages((current) => ({ ...current, [lead.id]: targetStageId }));
    if (isAcelera) {
      moveConfirmedRef.current = false;
      setPendingMove({ lead, stageId: targetStageId, stageName: stage.nome, previousStageId: lead.stage_id });
      return;
    }
    try { await updateStage.mutateAsync({ leadId: lead.id, stageId: targetStageId, pipelineId: activePipelineId }); }
    catch { setOptimisticStages((current) => { const next = { ...current }; delete next[lead.id]; return next; }); }
  };

  const confirmPendingMove = async () => {
    if (!pendingMove || !activePipelineId) return;
    await updateStage.mutateAsync({ leadId: pendingMove.lead.id, stageId: pendingMove.stageId, pipelineId: activePipelineId });
    moveConfirmedRef.current = true;
    setPendingMove(null);
  };

  const handleTransitionOpenChange = (open: boolean) => {
    if (open) return;
    if (pendingMove && !moveConfirmedRef.current) {
      setOptimisticStages((current) => { const next = { ...current }; delete next[pendingMove.lead.id]; return next; });
    }
    moveConfirmedRef.current = false;
    setPendingMove(null);
  };

  const selectPipeline = (id: string) => { const next = new URLSearchParams(searchParams); next.set("pipeline", id); setSearchParams(next); };
  const overlayOwner = activeLead ? ownerMap.get(activeLead.owner_id ?? "") : undefined;
  const overlayActivity = activeLead ? nextActivityMap.get(activeLead.id) : undefined;
  const overlayProposal = activeLead ? latestProposalMap.get(activeLead.id) : undefined;

  return <div className="p-6 space-y-4">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h1 className="text-2xl font-display font-bold">Pipelines</h1><p className="text-sm text-muted-foreground">Arraste os cards livremente. Ao soltar, você pode preencher as informações da nova etapa agora ou responder depois.</p></div>{isAcelera && <div className="relative w-full xl:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa, contato, telefone ou CNPJ" className="pl-9" /></div>}</div>
    <PipelineTabs pipelines={pipelines} activeId={activePipelineId} onSelect={selectPipeline} />
    {!activePipelineId ? <p className="text-sm text-muted-foreground">Nenhum pipeline disponível.</p> : loadingLeads ? <p className="text-sm text-muted-foreground">Carregando vidas…</p> : stages.length === 0 ? <p className="text-sm text-muted-foreground">Este pipeline ainda não tem etapas.</p> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
      <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(245px, 1fr))` }}>
        {stages.map((col) => { const cards = grouped[col.id] ?? []; const overWip = col.wip_limit != null && cards.length > col.wip_limit; return <DroppableStageColumn key={col.id} id={col.id}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: col.cor ?? "#64748b" }} />{col.nome}{col.celebrate_enabled && <PartyPopper className="w-3.5 h-3.5 text-primary" aria-label="Celebração ativa" />}</h3><Badge variant={overWip ? "destructive" : "secondary"} className="text-xs">{cards.length}{col.wip_limit != null ? `/${col.wip_limit}` : ""}</Badge></div><div className="space-y-2 min-h-[320px]">{cards.map((lead) => <DraggableLeadCard key={lead.id} lead={lead} owner={ownerMap.get(lead.owner_id ?? "")} nextActivity={nextActivityMap.get(lead.id)} proposal={latestProposalMap.get(lead.id)} />)}</div></DroppableStageColumn>; })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>{activeLead ? <div className="w-[245px] rotate-[1.5deg] scale-[1.03] cursor-grabbing pointer-events-none"><LeadCardVisual lead={activeLead} owner={overlayOwner} nextActivity={overlayActivity} proposal={overlayProposal} overlay /></div> : null}</DragOverlay>
    </DndContext>}
    <StageTransitionDialog open={!!pendingMove} onOpenChange={handleTransitionOpenChange} lead={pendingMove?.lead ?? null} stageId={pendingMove?.stageId ?? null} stageName={pendingMove?.stageName ?? "etapa"} onConfirm={confirmPendingMove} />
  </div>;
};

export default KanbanPageEnhanced;