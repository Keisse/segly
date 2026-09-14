import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Clock3, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePipelines, usePipelineStages, useLeadsByPipeline } from "@/hooks/usePipelines";

function elapsedHours(value?: string | null) {
  if (!value) return 0;
  const ms = Date.now() - new Date(value).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms / 3_600_000 : 0;
}

function formatAge(hours: number) {
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  return rem ? `${days}d ${rem}h` : `${days}d`;
}

export function AceleraAlerts() {
  const { user } = useAuth();
  const { data: pipelines = [] } = usePipelines();
  const acelera = pipelines.find((p) => p.nome === "Pipeline Acelera") ?? null;
  const { data: stages = [] } = usePipelineStages(acelera?.id);
  const { data: leads = [] } = useLeadsByPipeline(acelera?.id);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const novoStage = stages.find((s) => s.nome.toLocaleLowerCase("pt-BR") === "novo");

  const alerts = useMemo(() => {
    if (!user?.id || !novoStage) return [];

    return (leads as Array<{
      id: string;
      nome: string;
      empresa: string | null;
      owner_id: string | null;
      stage_id: string | null;
      stage_entered_at?: string | null;
      created_at: string;
    }>)
      .filter((lead) => lead.owner_id === user.id && lead.stage_id === novoStage.id)
      .map((lead) => {
        const hours = elapsedHours(lead.stage_entered_at || lead.created_at);
        if (hours >= 48) {
          return {
            lead,
            hours,
            level: "critical" as const,
            title: "Lead novo há mais de 48h",
            message: "Este lead ainda não avançou para Cotar.",
          };
        }
        if (hours >= 24) {
          return {
            lead,
            hours,
            level: "warning" as const,
            title: "Lead novo há mais de 24h",
            message: "Faça o primeiro contato e avance a jornada.",
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.hours ?? 0) - (a?.hours ?? 0));
  }, [leads, novoStage, user?.id]);

  const total = alerts.length;
  const critical = alerts.filter((a) => a?.level === "critical").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-10 w-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Alertas"
        >
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className={`absolute -right-0.5 -top-0.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${critical > 0 ? "bg-red-500" : "bg-amber-500"}`}>
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Alertas</p>
              <p className="text-xs text-muted-foreground">Pipeline Acelera</p>
            </div>
            {total > 0 && <Badge variant={critical > 0 ? "destructive" : "secondary"}>{total}</Badge>}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {total === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum alerta pendente para você.
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                if (!alert) return null;
                const isCritical = alert.level === "critical";
                return (
                  <Link
                    key={alert.lead.id}
                    to={`/admin/lead/${alert.lead.id}`}
                    className="block p-4 hover:bg-accent/60 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isCritical ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {isCritical ? <AlertTriangle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="text-sm truncate mt-0.5">{alert.lead.empresa || alert.lead.nome}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-2">Há {formatAge(alert.hours)} na etapa Novo</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
