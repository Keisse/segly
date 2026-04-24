import { useMemo, useState } from "react";
import { useDashboardMetrics, useUpdateLeadStatus } from "@/hooks/useLeads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusLabels, statusColors, type LeadStatus, type Lead } from "@/types/lead";
import { formatName } from "@/lib/formatName";
import { Link } from "react-router-dom";

const COLUMNS: LeadStatus[] = ["novo", "em_analise", "contatado", "em_negociacao", "convertido", "perdido"];

const KanbanPage = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const updateStatus = useUpdateLeadStatus();
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, Lead[]> = {
      novo: [], em_analise: [], contatado: [], em_negociacao: [], convertido: [], perdido: [],
    };
    metrics?.leads?.forEach((l) => g[l.status]?.push(l));
    return g;
  }, [metrics]);

  const handleDrop = (status: LeadStatus) => {
    if (dragId) {
      updateStatus.mutate({ id: dragId, status });
      setDragId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Kanban de Leads</h1>
        <p className="text-sm text-muted-foreground">Arraste os cards entre colunas para atualizar o status.</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {COLUMNS.map((col) => (
            <div
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col)}
              className="bg-card/50 rounded-lg p-3 min-h-[400px] border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{statusLabels[col]}</h3>
                <Badge variant="secondary" className="text-xs">{grouped[col].length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[col].map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    className="p-3 cursor-move hover:border-primary/50 transition-colors"
                  >
                    <Link to={`/admin/lead/${lead.id}`} className="block space-y-1">
                      <p className="text-sm font-medium truncate">{formatName(lead.nome)}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.cargo}</p>
                      {lead.resultado_diagnostico && (
                        <Badge className={`${statusColors[lead.status]} text-xs`}>
                          {Math.round(lead.resultado_diagnostico.percentage)}%
                        </Badge>
                      )}
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KanbanPage;
