import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlarmClock, CircleDollarSign, Clock3, PhoneCall, Target, TrendingUp, Users } from "lucide-react";
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
type ContactExecutionRow = {
  id: string;
  contact_type: string;
  scheduled_at: string;
  completed_at: string;
  on_time: boolean;
};

type Period = 7 | 30 | 90;

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function pct(n: number, d: number) {
  return d <= 0 ? 0 : Math.round((n / d) * 100);
}

function differenceText(current: number, previous: number, suffix = "") {
  const diff = current - previous;
  if (diff === 0) return "igual ao período anterior";
  return `${diff > 0 ? "+" : ""}${diff}${suffix} vs. período anterior`;
}

function dayBounds(offset = 0) {
  const start = new Date();
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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

  const { data: contacts = [] } = useQuery({
    queryKey: ["productivity-contact-executions", selectedId, period],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("contact_execution_log" as never)
        .select("id,contact_type,scheduled_at,completed_at,on_time")
        .eq("user_id", selectedId)
        .gte("completed_at", range.previousStart.toISOString())
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContactExecutionRow[];
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

  const daily = useMemo(() => {
    const today = dayBounds(0);
    const yesterday = dayBounds(-1);
    const todayActivities = activities.filter((a) => {
      const when = new Date(a.scheduled_at);
      return when >= today.start && when < today.end && a.status !== "cancelada";
    });
    const yesterdayActivities = activities.filter((a) => {
      const when = new Date(a.scheduled_at);
      return when >= yesterday.start && when < yesterday.end && a.status !== "cancelada";
    });
    const completedToday = todayActivities.filter((a) => a.status === "concluida").length;
    const completedYesterday = yesterdayActivities.filter((a) => a.status === "concluida").length;
    const pendingToday = todayActivities.filter((a) => a.status === "pendente").length;
    const overdueNow = todayActivities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) < new Date()).length;
    const dailyOnTimeCount = todayActivities.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length;
    const dailyOnTime = pct(dailyOnTimeCount, todayActivities.filter((a) => new Date(a.scheduled_at) <= new Date()).length);
    const executionRate = pct(completedToday, todayActivities.length);
    const yesterdayExecutionRate = pct(completedYesterday, yesterdayActivities.length);
    const contactsToday = contacts.filter((c) => {
      const completed = new Date(c.completed_at);
      return completed >= today.start && completed < today.end;
    }).length;
    const contactsYesterday = contacts.filter((c) => {
      const completed = new Date(c.completed_at);
      return completed >= yesterday.start && completed < yesterday.end;
    }).length;

    return {
      planned: todayActivities.length,
      completed: completedToday,
      pending: pendingToday,
      overdue: overdueNow,
      dailyOnTime,
      executionRate,
      yesterdayExecutionRate,
      contactsToday,
      contactsYesterday,
    };
  }, [activities, contacts]);

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
    const contactTypes = ["contato", "telefone", "whatsapp", "email", "visita", "reuniao_online"];
    const overdueContacts = activities.filter((a) =>
      a.status === "pendente" && new Date(a.scheduled_at) < range.now && contactTypes.includes(a.type.toLowerCase())
    ).length;

    const currentContacts = contacts.filter((c) => {
      const completed = new Date(c.completed_at);
      return completed >= range.start && completed <= range.now;
    });
    const previousContacts = contacts.filter((c) => {
      const completed = new Date(c.completed_at);
      return completed >= range.previousStart && completed < range.start;
    });
    const contactsOnTime = currentContacts.filter((c) => c.on_time).length;
    const previousContactsOnTime = previousContacts.filter((c) => c.on_time).length;
    const contactOnTimeRate = pct(contactsOnTime, currentContacts.length);
    const previousContactOnTimeRate = pct(previousContactsOnTime, previousContacts.length);

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
      contactsExecuted: currentContacts.length,
      previousContactsExecuted: previousContacts.length,
      contactsOnTime,
      previousContactsOnTime,
      contactOnTimeRate,
      previousContactOnTimeRate,
      stoppedLeads,
      commissionTotal,
      salary,
      nextPayment: salary + commissionTotal,
    };
  }, [activities, contacts, leads, commissions, compensation, range]);

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hoje · {selectedPerson?.display_name || "colaborador"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <DailyMetric title="Planejadas" value={String(daily.planned)} detail="carga da agenda de hoje" />
                <DailyMetric title="Concluídas" value={String(daily.completed)} detail={`${daily.executionRate}% da agenda executada`} />
                <DailyMetric title="Pendentes" value={String(daily.pending)} detail="ainda abertas hoje" />
                <DailyMetric title="Atrasadas agora" value={String(daily.overdue)} detail="horário já vencido" />
                <DailyMetric title="Contatos hoje" value={String(daily.contactsToday)} detail={differenceText(daily.contactsToday, daily.contactsYesterday)} />
                <DailyMetric title="OnTime hoje" value={`${daily.dailyOnTime}%`} detail="atividades vencidas executadas no prazo" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Execução da agenda do dia</span>
                  <span>{daily.executionRate}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(daily.executionRate, 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{differenceText(daily.executionRate, daily.yesterdayExecutionRate, " p.p.")} na taxa de execução diária.</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Target} title="OnTime" value={`${metrics.currentOnTime}%`} detail={differenceText(metrics.currentOnTime, metrics.previousOnTime, " p.p.")} />
            <Metric icon={Activity} title="Atividades concluídas" value={String(metrics.completedCurrent)} detail={differenceText(metrics.completedCurrent, metrics.completedPrevious)} />
            <Metric icon={PhoneCall} title="Contatos realizados" value={String(metrics.contactsExecuted)} detail={differenceText(metrics.contactsExecuted, metrics.previousContactsExecuted)} />
            <Metric icon={Target} title="Contatos OnTime" value={`${metrics.contactOnTimeRate}%`} detail={`${metrics.contactsOnTime} no prazo · ${differenceText(metrics.contactOnTimeRate, metrics.previousContactOnTimeRate, " p.p.")}`} />
            <Metric icon={AlarmClock} title="Contatos atrasados" value={String(metrics.overdueContacts)} detail="contatos pendentes fora do prazo" />
            <Metric icon={Clock3} title="Atividades pendentes" value={String(metrics.pending)} detail="já deveriam ter sido executadas" />
            <Metric icon={TrendingUp} title="Atividades futuras" value={String(metrics.future)} detail="programadas após agora" />
            <Metric icon={Users} title="Leads parados >48h" value={String(metrics.stoppedLeads)} detail="sem avanço de etapa há mais de 48 horas" />
            <Metric icon={CircleDollarSign} title="Comissões do mês" value={money(metrics.commissionTotal)} detail="projetadas/ganhas, excluindo canceladas" />
            <Metric icon={CircleDollarSign} title="Pagamento próximo mês" value={money(metrics.nextPayment)} detail={`salário ${money(metrics.salary)} + comissões`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Resumo de {selectedPerson?.display_name || "colaborador"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div><p className="text-xs text-muted-foreground">Contatos realizados</p><p className="text-xl font-bold">{metrics.contactsExecuted}</p></div>
              <div><p className="text-xs text-muted-foreground">Contatos no prazo</p><p className="text-xl font-bold">{metrics.contactsOnTime}</p></div>
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

function DailyMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
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
