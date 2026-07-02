import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { usePipelines, usePipelineStages, useLeadsByPipeline, useUpdateLeadStage } from "@/hooks/usePipelines";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type LeadRow = { id: string; nome: string; empresa: string | null; cargo: string | null; stage_id: string | null; resultado_diagnostico: { percentage?: number } | null };

const KanbanPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pipelines = [], isLoading: loadingPipelines } = usePipelines();

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

  const { data: stages = [] } = usePipelineStages(activePipelineId);
  const { data: leadsRaw = [], isLoading: loadingLeads } = useLeadsByPipeline(activePipelineId);
  const leads = leadsRaw as unknown as LeadRow[];
  const updateStage = useUpdateLeadStage();
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    stages.forEach((s) => { g[s.id] = []; });
    leads.forEach((l) => { if (l.stage_id && g[l.stage_id]) g[l.stage_id].push(l); });
    return g;
  }, [stages, leads]);

  const handleDrop = (stageId: string) => {
    if (dragId && activePipelineId) {
      updateStage.mutate({ leadId: dragId, stageId, pipelineId: activePipelineId });
      setDragId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Pipelines</h1>
        <p className="text-sm text-muted-foreground">Arraste os cards entre etapas para movê-los. Configure etapas em Configurações → Pipeline.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1">
        {loadingPipelines ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {pipelines.map((p) => {
              const isActive = p.id === activePipelineId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("pipeline", p.id);
                    setSearchParams(next);
                  }}
                  className={cn(
                    "shrink-0 px-4 py-2 text-sm rounded-t-md border-b-2 -mb-[1px] transition-colors",
                    isActive
                      ? "border-primary text-foreground bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.cor ?? "#1D9E75" }} />
                    {p.nome}
                  </span>
                </button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => navigate("/admin/configuracoes?tab=pipeline")}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo pipeline
            </Button>
          </>
        )}
      </div>

      {!activePipelineId ? (
        <p className="text-sm text-muted-foreground">Nenhum pipeline criado ainda. Crie em Configurações → Pipeline.</p>
      ) : loadingLeads ? (
        <p className="text-sm text-muted-foreground">Carregando leads…</p>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este pipeline ainda não tem etapas. Configure em Configurações → Pipeline.</p>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}
        >
          {stages.map((col) => {
            const cards = grouped[col.id] ?? [];
            const overWip = col.wip_limit != null && cards.length > col.wip_limit;
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
                className="bg-card/50 rounded-lg p-3 min-h-[400px] border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.cor ?? "#64748b" }} />
                    {col.nome}
                  </h3>
                  <Badge variant={overWip ? "destructive" : "secondary"} className="text-xs">
                    {cards.length}{col.wip_limit != null ? `/${col.wip_limit}` : ""}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {cards.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      className="p-3 cursor-move hover:border-primary/50 transition-colors"
                    >
                      <Link to={`/admin/lead/${lead.id}`} className="block space-y-1">
                        <p className="text-sm font-medium truncate uppercase">{lead.nome}</p>
                        {lead.empresa && <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>}
                        {lead.cargo && <p className="text-xs text-muted-foreground truncate">{lead.cargo}</p>}
                        {lead.resultado_diagnostico?.percentage != null && (
                          <Badge className="text-xs">{Math.round(lead.resultado_diagnostico.percentage)}%</Badge>
                        )}
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KanbanPage;
