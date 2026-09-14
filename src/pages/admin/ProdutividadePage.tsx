import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlarmClock, CircleDollarSign, Clock3, Target, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Person = { id: string; display_name: string | null; lider_id: string | null };
type ActivityRow = {
  id: string;
  type: string;
  scheduled_at: string;
  status: string;
  completed_at: string | null;
};
type LeadRow = { id: string; status: string; stage_entered_at: string | null };

type Period = 7 | 30 | 90;

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function pct(n: number, d: number) {
  return d <= 0 ? 0 : Math.round((n / d) * 100);
}

function differenceText(current: number, previous: number, suffix = "") {
  const diff = current - previous;
  if (diff === 0) return `igual ao período anterior`;
  return `${diff > 0 ? "+" : ""}${diff}${suffix} vs. período anterior`;
}

export default function ProdutividadePage() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const [period, setPeriod] = useState<Period>(30);
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: people = [] } = useQuery({
    queryKey: ["productivity-people", user?.id, role],
    queryFn: async () => {
      if (!user || (role !== "admin" && role !== "lider")) return [];
      let q = supabase.from("profiles").select("id, display_name, lider_id").eq("is_active", true).order("display_name");
      if (role === "lider") q = q.eq("lider_id", user.id);
      else q = q.neq("id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Person[];
    },
    enabled: !!user && !!role,
  });

  useEffect(() => {
    if (!selectedId && people.length) setSelectedId(people[0].id);
    if (selectedId && !people.some((p) => p.id === selectedId)) setSelectedId(people[0]?.id ?? "");
  }, [people, selectedId]);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - period);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - period);
    return { now, start, previousStart };
  }, [period]);

  const { data: activities = [] } = useQuery({
    queryKey: ["productivity-activities", selectedId, period],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id,type,scheduled_at,status,completed_at")
        .eq("responsible_id", selectedId)
        .gte("scheduled_at", range.previousStart.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
    enabled: !!selectedId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["productivity-leads", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id,status,stage_entered_at")
        .eq("owner_id", selectedId);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
    enabled: !!selectedId,
  });

  const { data: compensation } = useQuery({
    queryKey: ["productivity-compensation", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase
        .from("compensation_profiles" as never)
        .select("base_salary")
        .eq("user_id", selectedId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { base_salary: number } | null;
    },
    enabled: !!selectedId,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["productivity-commissions", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const firstDay = new Date();
      firstDay.setDate(1);
      firstDay.setHours(0, 0, 0, 0);
      const nextMonth = new Date(firstDay);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { data, error } = await supabase
        .from("commission_entries" as never)
        .select("amount,status,reference_date")
        .eq("user_id", selectedId)
        .gte("reference_date", firstDay.toISOString().slice(0, 10))
        .lt("reference_date", nextMonth.toISOString().slice(0, 10))
        .neq("status", "cancelled");
      if (error) throw error;
      return (data ?? []) as unknown as { amount: number; status: string; reference_date: string }[];
    },
    enabled: !!selectedId,
  });

  const metrics = useMemo(() => {
    const dueCurrent = activities.filter((a) => {
      const when = new Date(a.scheduled_at);
      return when >= range.start && when <= range.now && a.status !== "cancelada";
    });
    const duePrevious = activities.filter((a) => {
      const when = new Date(a.scheduled_at);
      return when >= range.previousStart && when < range.start && a.status !== "cancelada";
    });
    const onTimeCurrent = dueCurrent.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length;
    const onTimePrevious = duePrevious.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length;
    const currentOnTime = pct(onTimeCurrent, dueCurrent.length);
    const previousOnTime = pct(onTimePrevious, duePrevious.length);
    const completedCurrent = dueCurrent.filter((a) => a.status === "concluida").length;
    const completedPrevious = duePrevious.filter((a) => a.status === "concluida").length;
    const pending = activities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) <= range.now).length;
    const future = activities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) > range.now).length;
    const contactTypes = ["contato", "ligacao", "whatsapp", "email", "e-mail", "presencial", "reuniao", "reunião"];
    const overdueContacts = activities.filter((a) =>
      a.status === "pendente" && new Date(a.scheduled_at) < range.now && contactTypes.some((t) => a.type.toLowerCase().includes(t))
    ).length;
    const stoppedThreshold = new Date(range.now.getTime() - 48 * 60 * 60 * 1000);
    const stoppedLeads = leads.filter((lead) =>
      lead.stage_entered_at && new Date(lead.stage_entered_at) < stoppedThreshold && !["convertido", "perdido"].includes(lead.status)
    ).length;
    const commissionTotal = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const salary = Number(compensation?.base_salary || 0);

    return {
      currentOnTime,
      previousOnTime,
      completedCurrent,
      completedPrevious,
      pending,
      future,
      overdueContacts,
      stoppedLeads,
      commissionTotal,
      salary,
      nextPayment: salary + commissionTotal,
    };
  }, [activities, leads, commissions, compensation, range]);

  const selectedPerson = people.find((p) => p.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Produtividade</h1>
        <p className="text-sm text-muted-foreground">Visão gerencial de execução, carteira e remuneração. Apenas líderes e administradores têm acesso.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="sm:w-[280px]"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
          <SelectContent>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name || "Usuário"}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
          <SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedId ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum liderado disponível para este usuário.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Target} title="OnTime" value={`${metrics.currentOnTime}%`} detail={differenceText(metrics.currentOnTime, metrics.previousOnTime, " p.p.")} />
            <Metric icon={Activity} title="Atividades concluídas" value={String(metrics.completedCurrent)} detail={differenceText(metrics.completedCurrent, metrics.completedPrevious)} />
            <Metric icon={AlarmClock} title="Contatos atrasados" value={String(metrics.overdueContacts)} detail="contatos pendentes fora do prazo" />
            <Metric icon={Clock3} title="Atividades pendentes" value={String(metrics.pending)} detail="já deveriam ter sido executadas" />
            <Metric icon={TrendingUp} title="Atividades futuras" value={String(metrics.future)} detail="programadas após agora" />
            <Metric icon={Users} title="Leads parados >48h" value={String(metrics.stoppedLeads)} detail="sem avanço de etapa há mais de 48 horas" />
            <Metric icon={CircleDollarSign} title="Comissões do mês" value={money(metrics.commissionTotal)} detail="projetadas/ganhas, excluindo canceladas" />
            <Metric icon={CircleDollarSign} title="Pagamento próximo mês" value={money(metrics.nextPayment)} detail={`salário ${money(metrics.salary)} + comissões`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Resumo de {selectedPerson?.display_name || "colaborador"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Salário base</p><p className="text-xl font-bold">{money(metrics.salary)}</p></div>
              <div><p className="text-xs text-muted-foreground">Comissões mês atual</p><p className="text-xl font-bold">{money(metrics.commissionTotal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Previsão de pagamento</p><p className="text-xl font-bold">{money(metrics.nextPayment)}</p></div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, title, value, detail }: { icon: typeof Target; title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-muted-foreground" /></div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      </CardContent>
    </Card>
  );
}
