import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clock3, AlertTriangle, CalendarClock, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePipelines, usePipelineStages, useLeadsByPipeline } from "@/hooks/usePipelines";
import { supabase } from "@/integrations/supabase/client";
import { resumeStandbyLead } from "@/lib/activityQuickActions";
import { toast } from "sonner";

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

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

type ActivityAlertRow = {
  id: string;
  lead_id: string | null;
  type: string;
  title: string | null;
  scheduled_at: string;
  lead?: { id: string; nome: string; empresa: string | null } | null;
};

export function AceleraAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pipelines = [] } = usePipelines();
  const acelera = pipelines.find((p) => p.nome === "Pipeline Acelera") ?? null;
  const { data: stages = [] } = usePipelineStages(acelera?.id);
  const { data: leads = [] } = useLeadsByPipeline(acelera?.id);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { data: dueActivities = [] } = useQuery({
    queryKey: ["acelera-due-alerts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const limit = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, type, title, scheduled_at, lead:leads(id,nome,empresa)")
        .eq("responsible_id", user.id)
        .eq("status", "pendente")
        .in("type", ["retorno_cliente", "retorno_standby", "nova_abordagem"])
        .lte("scheduled_at", limit)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActivityAlertRow[];
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const resumeLead = useMutation({
    mutationFn: async ({ leadId, activityId }: { leadId: string; activityId: string }) => {
      await resumeStandbyLead(leadId, activityId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acelera-due-alerts"] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Vida retomada e movida para Em Contato.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const novoStage = stages.find((s) => s.nome.toLocaleLowerCase("pt-BR") === "novo");
  const cotarStage = stages.find((s) => s.nome.toLocaleLowerCase("pt-BR") === "cotar");
  const stageOrder = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.ordem])), [stages]);

  const leadAlerts = useMemo(() => {
    if (!user?.id || !novoStage || !cotarStage) return [];

    return (leads as Array<{
      id: string;
      nome: string;
      empresa: string | null;
      owner_id: string | null;
      stage_id: string | null;
      created_at: string;
    }>)
      .filter((lead) => lead.owner_id === user.id)
      .map((lead) => {
        const hours = elapsedHours(lead.created_at);
        const currentOrder = lead.stage_id ? stageOrder.get(lead.stage_id) : undefined;
        const hasNotReachedCotar = currentOrder == null || currentOrder < cotarStage.ordem;

        if (hours >= 48 && hasNotReachedCotar) {
          return {
            id: `lead-48-${lead.id}`,
            leadId: lead.id,
            level: "critical" as const,
            title: "Vida há mais de 48h sem chegar em Cotar",
            subject: lead.empresa || lead.nome,
            message: "Esta vida precisa avançar para a etapa Cotar.",
            meta: `Há ${formatAge(hours)} desde a entrada da vida`,
          };
        }

        if (hours >= 24 && lead.stage_id === novoStage.id) {
          return {
            id: `lead-24-${lead.id}`,
            leadId: lead.id,
            level: "warning" as const,
            title: "Vida nova há mais de 24h",
            subject: lead.empresa || lead.nome,
            message: "Faça o primeiro contato e avance a jornada.",
            meta: `Há ${formatAge(hours)} desde a entrada da vida`,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [leads, novoStage, cotarStage, stageOrder, user?.id]);

  const activityAlerts = useMemo(() => {
    const now = Date.now();
    return dueActivities.map((activity) => {
      const isOverdue = new Date(activity.scheduled_at).getTime() < now;
      const standby = activity.type === "retorno_standby";
      const lostFollowUp = activity.type === "nova_abordagem";
      const resumable = standby || lostFollowUp;
      return {
        id: `activity-${activity.id}`,
        activityId: activity.id,
        leadId: activity.lead_id,
        level: isOverdue ? ("critical" as const) : ("warning" as const),
        title: lostFollowUp
          ? "Hora de retomar esta vida perdida"
          : standby
          ? "Stand-by próximo do contato"
          : "Retorno de cliente",
        subject: activity.lead?.empresa || activity.lead?.nome || activity.title || "Atividade",
        message: lostFollowUp
          ? isOverdue
            ? "A data da nova abordagem já chegou e está atrasada."
            : "A nova abordagem acontece nas próximas 24 horas."
          : isOverdue
          ? "Esta atividade está atrasada."
          : "Esta atividade acontece nas próximas 24 horas.",
        meta: formatWhen(activity.scheduled_at),
        activity: true,
        resumable,
      };
    });
  }, [dueActivities]);

  const alerts = useMemo(
    () => [...leadAlerts, ...activityAlerts].sort((a, b) => (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1)),
    [leadAlerts, activityAlerts]
  );

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
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Alertas</p>
              <p className="text-xs text-muted-foreground">Pipeline Acelera</p>
            </div>
            {total > 0 && <Badge variant={critical > 0 ? "destructive" : "secondary"}>{total}</Badge>}
          </div>
        </div>

        <div className="max-h-[460px] overflow-y-auto">
          {total === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum alerta pendente para você.
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                if (!alert) return null;
                const isCritical = alert.level === "critical";
                const content = (
                  <div className="flex gap-3">
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isCritical ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                      {"activity" in alert ? <CalendarClock className="h-4 w-4" /> : isCritical ? <AlertTriangle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="text-sm truncate mt-0.5">{alert.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">{alert.meta}</p>
                    </div>
                  </div>
                );

                const resumable = "resumable" in alert && alert.resumable && alert.leadId && "activityId" in alert;

                return (
                  <div key={alert.id} className="p-4 hover:bg-accent/40 transition-colors">
                    {alert.leadId ? <Link to={`/admin/lead/${alert.leadId}`} className="block">{content}</Link> : content}
                    {resumable && (
                      <div className="mt-3 pl-11">
                        <Button
                          size="sm"
                          variant={isCritical ? "default" : "outline"}
                          disabled={resumeLead.isPending}
                          onClick={() => resumeLead.mutate({ leadId: alert.leadId as string, activityId: alert.activityId as string })}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Retomar agora
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
