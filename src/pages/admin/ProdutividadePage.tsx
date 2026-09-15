import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlarmClock, CircleDollarSign, Clock3, PhoneCall, Target, TrendingUp, Users, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Person = { id: string; display_name: string | null; lider_id: string | null };
type ActivityRow = { id: string; type: string; scheduled_at: string; status: string; completed_at: string | null };
type LeadRow = { id: string; status: string; stage_entered_at: string | null };
type ContactExecutionRow = { id: string; contact_type: string; scheduled_at: string; completed_at: string; on_time: boolean };
type CompensationRow = { user_id: string; base_salary: number | string };
type CommissionRow = { user_id: string; amount: number | string; status: string; reference_date: string; description?: string | null };
type Period = 7 | 30 | 90;

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const dateBr = (value: Date) => new Intl.DateTimeFormat("pt-BR").format(value);

function pct(n: number, d: number) { return d <= 0 ? 0 : Math.round((n / d) * 100); }
function differenceText(current: number, previous: number, suffix = "") {
  const diff = current - previous;
  if (diff === 0) return "igual ao período anterior";
  return `${diff > 0 ? "+" : ""}${diff}${suffix} vs. período anterior`;
}
function dayBounds(offset = 0) {
  const start = new Date(); start.setDate(start.getDate() + offset); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start, end };
}
function nextPayrollWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const payment = new Date(start);
  if (payment.getDay() === 6) payment.setDate(payment.getDate() + 2);
  if (payment.getDay() === 0) payment.setDate(payment.getDate() + 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end), payment };
}

export default function ProdutividadePage() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const [period, setPeriod] = useState<Period>(30);
  const [selectedId, setSelectedId] = useState("");
  const payroll = useMemo(nextPayrollWindow, []);

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
    const start = new Date(now); start.setDate(start.getDate() - period);
    const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - period);
    return { now, start, previousStart };
  }, [period]);

  const { data: activities = [] } = useQuery({
    queryKey: ["productivity-activities", selectedId, period],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase.from("activities" as never).select("id,type,scheduled_at,status,completed_at").eq("responsible_id", selectedId).gte("scheduled_at", range.previousStart.toISOString()).order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    }, enabled: !!selectedId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["productivity-contact-executions", selectedId, period],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase.from("contact_execution_log" as never).select("id,contact_type,scheduled_at,completed_at,on_time").eq("user_id", selectedId).gte("completed_at", range.previousStart.toISOString()).order("completed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContactExecutionRow[];
    }, enabled: !!selectedId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["productivity-leads", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase.from("leads").select("id,status,stage_entered_at").eq("owner_id", selectedId);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    }, enabled: !!selectedId,
  });

  const { data: compensation } = useQuery({
    queryKey: ["productivity-compensation", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase.from("compensation_profiles" as never).select("base_salary").eq("user_id", selectedId).maybeSingle();
      if (error) throw error;
      return data as unknown as { base_salary: number | string } | null;
    }, enabled: !!selectedId,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["productivity-next-commissions", selectedId, payroll.start],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase.from("commission_entries" as never)
        .select("user_id,amount,status,reference_date,description")
        .eq("user_id", selectedId)
        .eq("status", "earned")
        .gte("reference_date", payroll.start)
        .lt("reference_date", payroll.end);
      if (error) throw error;
      return (data ?? []) as unknown as CommissionRow[];
    }, enabled: !!selectedId,
  });

  const personIds = useMemo(() => people.map((p) => p.id), [people]);
  const { data: teamCompensation = [] } = useQuery({
    queryKey: ["productivity-team-compensation", personIds.join(",")],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("compensation_profiles" as never).select("user_id,base_salary").in("user_id", personIds);
      if (error) throw error;
      return (data ?? []) as unknown as CompensationRow[];
    }, enabled: personIds.length > 0,
  });

  const { data: teamCommissions = [] } = useQuery({
    queryKey: ["productivity-team-next-commissions", personIds.join(","), payroll.start],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("commission_entries" as never)
        .select("user_id,amount,status,reference_date,description")
        .in("user_id", personIds)
        .eq("status", "earned")
        .gte("reference_date", payroll.start)
        .lt("reference_date", payroll.end);
      if (error) throw error;
      return (data ?? []) as unknown as CommissionRow[];
    }, enabled: personIds.length > 0,
  });

  const daily = useMemo(() => {
    const today = dayBounds(0), yesterday = dayBounds(-1);
    const todayActivities = activities.filter((a) => { const when = new Date(a.scheduled_at); return when >= today.start && when < today.end && a.status !== "cancelada"; });
    const yesterdayActivities = activities.filter((a) => { const when = new Date(a.scheduled_at); return when >= yesterday.start && when < yesterday.end && a.status !== "cancelada"; });
    const completedToday = todayActivities.filter((a) => a.status === "concluida").length;
    const completedYesterday = yesterdayActivities.filter((a) => a.status === "concluida").length;
    const contactsToday = contacts.filter((c) => { const completed = new Date(c.completed_at); return completed >= today.start && completed < today.end; }).length;
    const contactsYesterday = contacts.filter((c) => { const completed = new Date(c.completed_at); return completed >= yesterday.start && completed < yesterday.end; }).length;
    return {
      planned: todayActivities.length,
      completed: completedToday,
      pending: todayActivities.filter((a) => a.status === "pendente").length,
      overdue: todayActivities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) < new Date()).length,
      dailyOnTime: pct(todayActivities.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length, todayActivities.filter((a) => new Date(a.scheduled_at) <= new Date()).length),
      executionRate: pct(completedToday, todayActivities.length),
      yesterdayExecutionRate: pct(completedYesterday, yesterdayActivities.length),
      contactsToday, contactsYesterday,
    };
  }, [activities, contacts]);

  const metrics = useMemo(() => {
    const dueCurrent = activities.filter((a) => { const when = new Date(a.scheduled_at); return when >= range.start && when <= range.now && a.status !== "cancelada"; });
    const duePrevious = activities.filter((a) => { const when = new Date(a.scheduled_at); return when >= range.previousStart && when < range.start && a.status !== "cancelada"; });
    const currentContacts = contacts.filter((c) => { const completed = new Date(c.completed_at); return completed >= range.start && completed <= range.now; });
    const previousContacts = contacts.filter((c) => { const completed = new Date(c.completed_at); return completed >= range.previousStart && completed < range.start; });
    const currentOnTime = pct(dueCurrent.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length, dueCurrent.length);
    const previousOnTime = pct(duePrevious.filter((a) => a.completed_at && new Date(a.completed_at) <= new Date(a.scheduled_at)).length, duePrevious.length);
    const contactsOnTime = currentContacts.filter((c) => c.on_time).length;
    const previousContactsOnTime = previousContacts.filter((c) => c.on_time).length;
    const stoppedThreshold = new Date(range.now.getTime() - 48 * 60 * 60 * 1000);
    const commissionTotal = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const salary = Number(compensation?.base_salary || 0);
    return {
      currentOnTime, previousOnTime,
      completedCurrent: dueCurrent.filter((a) => a.status === "concluida").length,
      completedPrevious: duePrevious.filter((a) => a.status === "concluida").length,
      pending: activities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) <= range.now).length,
      future: activities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) > range.now).length,
      overdueContacts: activities.filter((a) => a.status === "pendente" && new Date(a.scheduled_at) < range.now && ["contato", "telefone", "whatsapp", "email", "visita", "reuniao_online"].includes(a.type.toLowerCase())).length,
      contactsExecuted: currentContacts.length,
      previousContactsExecuted: previousContacts.length,
      contactsOnTime,
      contactOnTimeRate: pct(contactsOnTime, currentContacts.length),
      previousContactOnTimeRate: pct(previousContactsOnTime, previousContacts.length),
      stoppedLeads: leads.filter((lead) => lead.stage_entered_at && new Date(lead.stage_entered_at) < stoppedThreshold && !["convertido", "perdido"].includes(lead.status)).length,
      commissionTotal,
      salary,
      nextPayment: salary + commissionTotal,
    };
  }, [activities, contacts, leads, commissions, compensation, range]);

  const payrollForecast = useMemo(() => people.map((person) => {
    const salary = Number(teamCompensation.find((item) => item.user_id === person.id)?.base_salary || 0);
    const commission = teamCommissions.filter((item) => item.user_id === person.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const sales = teamCommissions.filter((item) => item.user_id === person.id).length;
    return { ...person, salary, commission, sales, total: salary + commission };
  }).sort((a, b) => b.total - a.total), [people, teamCompensation, teamCommissions]);

  const selectedPerson = people.find((p) => p.id === selectedId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1500px] mx-auto min-w-0">
      <div>
        <h1 className="text-2xl font-display font-bold">Desempenho</h1>
        <p className="text-sm text-muted-foreground">Visão gerencial de execução, carteira e remuneração. Apenas líderes e administradores têm acesso.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger className="sm:w-[280px]"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger><SelectContent>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name || "Usuário"}</SelectItem>)}</SelectContent></Select>
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}><SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent></Select>
      </div>

      {!selectedId ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum liderado disponível para este usuário.</CardContent></Card> : <>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Hoje · {selectedPerson?.display_name || "colaborador"}</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <DailyMetric title="Planejadas" value={String(daily.planned)} detail="carga do dia" />
            <DailyMetric title="Concluídas" value={String(daily.completed)} detail={`${daily.executionRate}% executada`} />
            <DailyMetric title="Pendentes" value={String(daily.pending)} detail="ainda abertas hoje" />
            <DailyMetric title="Atrasadas agora" value={String(daily.overdue)} detail="horário já vencido" />
            <DailyMetric title="Contatos hoje" value={String(daily.contactsToday)} detail={differenceText(daily.contactsToday, daily.contactsYesterday)} />
            <DailyMetric title="OnTime hoje" value={`${daily.dailyOnTime}%`} detail="atividades no prazo" />
          </div>
          <div className="space-y-2"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Execução da agenda do dia</span><span>{daily.executionRate}%</span></div><div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(daily.executionRate, 100)}%` }} /></div><p className="text-xs text-muted-foreground">{differenceText(daily.executionRate, daily.yesterdayExecutionRate, " p.p.")} na taxa de execução diária.</p></div>
        </CardContent></Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Metric icon={Target} title="OnTime" value={`${metrics.currentOnTime}%`} detail={differenceText(metrics.currentOnTime, metrics.previousOnTime, " p.p.")} />
          <Metric icon={Activity} title="Atividades concluídas" value={String(metrics.completedCurrent)} detail={differenceText(metrics.completedCurrent, metrics.completedPrevious)} />
          <Metric icon={PhoneCall} title="Contatos realizados" value={String(metrics.contactsExecuted)} detail={differenceText(metrics.contactsExecuted, metrics.previousContactsExecuted)} />
          <Metric icon={AlarmClock} title="Contatos atrasados" value={String(metrics.overdueContacts)} detail="pendentes fora do prazo" />
          <Metric icon={Users} title="Leads parados >48h" value={String(metrics.stoppedLeads)} detail="sem avanço de etapa" />
        </div>

        <Card className="border-primary/20 bg-primary/[0.025]">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><WalletCards className="h-4 w-4" />Próximo pagamento · {dateBr(payroll.payment)}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Salário fixo</p><p className="text-2xl font-bold">{money(metrics.salary)}</p></div>
            <div><p className="text-xs text-muted-foreground">Comissões liberadas</p><p className="text-2xl font-bold">{money(metrics.commissionTotal)}</p><p className="text-[11px] text-muted-foreground mt-1">Somente vendas com boleto pago</p></div>
            <div className="rounded-xl bg-primary text-primary-foreground p-4"><p className="text-xs opacity-80">Total previsto</p><p className="text-3xl font-bold mt-1">{money(metrics.nextPayment)}</p></div>
          </CardContent>
        </Card>
      </>}

      <Card>
        <CardHeader><CardTitle className="text-base">Previsão de pagamento da equipe · {dateBr(payroll.payment)}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {payrollForecast.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum colaborador disponível.</p> : payrollForecast.map((person) => (
            <div key={person.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr] lg:items-center">
              <div><p className="font-semibold">{person.display_name || "Usuário"}</p><p className="text-xs text-muted-foreground">{person.sales} venda{person.sales === 1 ? "" : "s"} com comissão liberada</p></div>
              <div><p className="text-xs text-muted-foreground">Salário</p><p className="font-semibold">{money(person.salary)}</p></div>
              <div><p className="text-xs text-muted-foreground">Comissões</p><p className="font-semibold">{money(person.commission)}</p></div>
              <div className="lg:text-right"><p className="text-xs text-muted-foreground">Próximo pagamento</p><p className="text-xl font-bold text-primary">{money(person.total)}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DailyMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{title}</p><p className="text-2xl font-bold mt-1">{value}</p><p className="text-[11px] text-muted-foreground mt-1">{detail}</p></div>;
}
function Metric({ icon: Icon, title, value, detail }: { icon: typeof Target; title: string; value: string; detail: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-bold mt-2">{value}</p><p className="text-xs text-muted-foreground mt-1">{detail}</p></CardContent></Card>;
}