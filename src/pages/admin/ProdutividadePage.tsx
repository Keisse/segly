import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlarmClock,
  CheckCircle2,
  CircleDollarSign,
  PhoneCall,
  ReceiptText,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Period = 7 | 30 | 90;
type Person = { id: string; display_name: string | null; lider_id: string | null };
type ActivityRow = { id: string; responsible_id: string; type: string; scheduled_at: string; status: string; completed_at: string | null };
type ContactRow = { id: string; user_id: string; contact_type: string; completed_at: string; on_time: boolean };
type LeadRow = { id: string; owner_id: string | null; nome: string; empresa: string | null; status: string; created_at: string; stage_entered_at: string | null };
type CompensationRow = { user_id: string; base_salary: number | string };
type ProductRow = { id: string; name: string; insurer_name: string | null };
type CommissionRow = {
  id: string;
  user_id: string;
  lead_id: string | null;
  product_id: string | null;
  amount: number | string;
  commission_base_amount: number | string | null;
  admin_commission_pct: number | string | null;
  broker_commission_pct: number | string | null;
  admin_amount: number | string | null;
  boleto_paid_at: string | null;
  reference_date: string;
  status: string;
  description: string | null;
  paid_at?: string | null;
};
type BatchRow = {
  id: string;
  user_id: string;
  reference_date: string;
  salary_amount: number | string;
  commission_amount: number | string;
  total_amount: number | string;
  commission_count: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
};

const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateBr = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR").format(date);
};
const dateTimeBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const pct = (n: number, d: number) => d <= 0 ? 0 : Math.round((n / d) * 100);

function firstBusinessDay(year: number, monthZeroBased: number) {
  const d = new Date(year, monthZeroBased, 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextCycle() {
  const now = new Date();
  return firstBusinessDay(now.getFullYear(), now.getMonth() + 1);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T12:00:00`);
}

function changeText(current: number, previous: number, suffix = "") {
  if (current === previous) return `igual ao período anterior (${previous}${suffix})`;
  const diff = current - previous;
  return `${diff > 0 ? "+" : ""}${diff}${suffix} vs. período anterior (${previous}${suffix})`;
}

function moneyChangeText(current: number, previous: number) {
  if (current === previous) return `igual ao período anterior (${money(previous)})`;
  return `${current > previous ? "+" : ""}${money(current - previous)} vs. período anterior (${money(previous)})`;
}

export default function ProdutividadePage() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>(30);
  const [selectedId, setSelectedId] = useState("all");
  const [commissionStatus, setCommissionStatus] = useState("all");
  const [cycle, setCycle] = useState(nextCycle());
  const isAdmin = role === "admin";

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - period);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - period);
    return { now, start, previousStart };
  }, [period]);

  const nextMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    return { start, end };
  }, []);

  const { data: people = [] } = useQuery({
    queryKey: ["performance-people", user?.id, role],
    queryFn: async () => {
      if (!user || (role !== "admin" && role !== "lider")) return [];
      let q = supabase.from("profiles").select("id,display_name,lider_id").eq("is_active", true).order("display_name");
      if (role === "lider") q = q.eq("lider_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Person[];
    },
    enabled: !!user && !!role,
  });

  useEffect(() => {
    if (selectedId !== "all" && !people.some((person) => person.id === selectedId)) setSelectedId("all");
  }, [people, selectedId]);

  const personIds = useMemo(() => people.map((person) => person.id), [people]);
  const selectedIds = useMemo(() => selectedId === "all" ? personIds : [selectedId], [selectedId, personIds]);

  const { data: activities = [] } = useQuery({
    queryKey: ["performance-activities", personIds.join(","), period],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("activities" as never)
        .select("id,responsible_id,type,scheduled_at,status,completed_at")
        .in("responsible_id", personIds)
        .gte("scheduled_at", range.previousStart.toISOString())
        .lte("scheduled_at", range.now.toISOString());
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
    enabled: personIds.length > 0,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["performance-contacts", personIds.join(","), period],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("contact_execution_log" as never)
        .select("id,user_id,contact_type,completed_at,on_time")
        .in("user_id", personIds)
        .gte("completed_at", range.previousStart.toISOString())
        .lte("completed_at", range.now.toISOString());
      if (error) throw error;
      return (data ?? []) as unknown as ContactRow[];
    },
    enabled: personIds.length > 0,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["performance-leads", personIds.join(",")],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("leads")
        .select("id,owner_id,nome,empresa,status,created_at,stage_entered_at")
        .in("owner_id", personIds);
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
    enabled: personIds.length > 0,
  });

  const { data: compensations = [] } = useQuery({
    queryKey: ["performance-compensations", personIds.join(",")],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("compensation_profiles" as never).select("user_id,base_salary").in("user_id", personIds);
      if (error) throw error;
      return (data ?? []) as unknown as CompensationRow[];
    },
    enabled: personIds.length > 0,
  });

  const { data: entries = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ["commission-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_entries" as never).select("*").order("reference_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommissionRow[];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["commission-payment-batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_payment_batches" as never).select("*").order("reference_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BatchRow[];
    },
  });

  const visibleEntries = useMemo(() => entries.filter((entry) => personIds.includes(entry.user_id)), [entries, personIds]);
  const productIds = useMemo(() => Array.from(new Set(visibleEntries.map((entry) => entry.product_id).filter(Boolean))) as string[], [visibleEntries]);
  const commissionLeadIds = useMemo(() => Array.from(new Set(visibleEntries.map((entry) => entry.lead_id).filter(Boolean))) as string[], [visibleEntries]);

  const { data: products = [] } = useQuery({
    queryKey: ["performance-commission-products", productIds.join(",")],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data, error } = await supabase.from("products" as never).select("id,name,insurer_name").in("id", productIds);
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
    enabled: productIds.length > 0,
  });

  const { data: commissionLeads = [] } = useQuery({
    queryKey: ["performance-commission-leads", commissionLeadIds.join(",")],
    queryFn: async () => {
      if (!commissionLeadIds.length) return [];
      const { data, error } = await supabase.from("leads").select("id,nome,empresa").in("id", commissionLeadIds);
      if (error) throw error;
      return (data ?? []) as unknown as Pick<LeadRow, "id" | "nome" | "empresa">[];
    },
    enabled: commissionLeadIds.length > 0,
  });

  const performanceFor = (ids: string[]) => {
    const currentActivities = activities.filter((item) => ids.includes(item.responsible_id) && new Date(item.scheduled_at) >= range.start && new Date(item.scheduled_at) <= range.now && item.status !== "cancelada");
    const previousActivities = activities.filter((item) => ids.includes(item.responsible_id) && new Date(item.scheduled_at) >= range.previousStart && new Date(item.scheduled_at) < range.start && item.status !== "cancelada");
    const currentCompleted = currentActivities.filter((item) => item.status === "concluida");
    const previousCompleted = previousActivities.filter((item) => item.status === "concluida");
    const currentContacts = contacts.filter((item) => ids.includes(item.user_id) && new Date(item.completed_at) >= range.start && new Date(item.completed_at) <= range.now);
    const previousContacts = contacts.filter((item) => ids.includes(item.user_id) && new Date(item.completed_at) >= range.previousStart && new Date(item.completed_at) < range.start);
    const currentLeads = leads.filter((lead) => lead.owner_id && ids.includes(lead.owner_id) && new Date(lead.created_at) >= range.start && new Date(lead.created_at) <= range.now);
    const previousLeads = leads.filter((lead) => lead.owner_id && ids.includes(lead.owner_id) && new Date(lead.created_at) >= range.previousStart && new Date(lead.created_at) < range.start);
    const stoppedThreshold = new Date(range.now.getTime() - 48 * 60 * 60 * 1000);
    const stopped = leads.filter((lead) => lead.owner_id && ids.includes(lead.owner_id) && lead.stage_entered_at && new Date(lead.stage_entered_at) < stoppedThreshold && !["convertido", "perdido"].includes(lead.status)).length;
    const onTime = pct(currentCompleted.filter((item) => item.completed_at && new Date(item.completed_at) <= new Date(item.scheduled_at)).length, currentCompleted.length);
    const previousOnTime = pct(previousCompleted.filter((item) => item.completed_at && new Date(item.completed_at) <= new Date(item.scheduled_at)).length, previousCompleted.length);
    return {
      completed: currentCompleted.length,
      previousCompleted: previousCompleted.length,
      contacts: currentContacts.length,
      previousContacts: previousContacts.length,
      onTime,
      previousOnTime,
      execution: pct(currentCompleted.length, currentActivities.length),
      previousExecution: pct(previousCompleted.length, previousActivities.length),
      newLeads: currentLeads.length,
      previousNewLeads: previousLeads.length,
      overdue: currentActivities.filter((item) => item.status === "pendente" && new Date(item.scheduled_at) < range.now).length,
      stopped,
      contactsOnTime: pct(currentContacts.filter((item) => item.on_time).length, currentContacts.length),
    };
  };

  const performance = useMemo(() => performanceFor(selectedIds), [selectedIds, activities, contacts, leads, range]);
  const ranking = useMemo(() => people.map((person) => ({ person, ...performanceFor([person.id]) })).sort((a, b) => b.completed - a.completed || b.contacts - a.contacts || b.newLeads - a.newLeads), [people, activities, contacts, leads, range]);

  const performanceChart = useMemo(() => [
    { name: "Atividades", atual: performance.completed, anterior: performance.previousCompleted },
    { name: "Contatos", atual: performance.contacts, anterior: performance.previousContacts },
    { name: "Novas vidas", atual: performance.newLeads, anterior: performance.previousNewLeads },
  ], [performance]);

  const periodEntries = useMemo(() => {
    const valid = visibleEntries.filter((entry) => selectedIds.includes(entry.user_id) && entry.status !== "cancelled");
    const current = valid.filter((entry) => { const d = parseDateOnly(entry.reference_date); return d >= range.start && d <= range.now; });
    const previous = valid.filter((entry) => { const d = parseDateOnly(entry.reference_date); return d >= range.previousStart && d < range.start; });
    const summarize = (rows: CommissionRow[]) => ({
      broker: rows.filter((entry) => ["earned", "paid"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      gross: rows.filter((entry) => ["earned", "paid"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.admin_amount || 0), 0),
      net: rows.filter((entry) => ["earned", "paid"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.admin_amount || 0) - Number(entry.amount || 0), 0),
      sales: rows.filter((entry) => ["earned", "paid"].includes(entry.status)).length,
    });
    return { current: summarize(current), previous: summarize(previous) };
  }, [visibleEntries, selectedIds, range]);

  const commissionChart = useMemo(() => [
    { name: "Comissões", atual: periodEntries.current.broker, anterior: periodEntries.previous.broker },
    { name: "Adm. bruta", atual: periodEntries.current.gross, anterior: periodEntries.previous.gross },
    { name: "Adm. líquida", atual: periodEntries.current.net, anterior: periodEntries.previous.net },
  ], [periodEntries]);

  const nextForecast = useMemo(() => people
    .filter((person) => selectedId === "all" || person.id === selectedId)
    .map((person) => {
      const salary = Number(compensations.find((row) => row.user_id === person.id)?.base_salary || 0);
      const personEntries = visibleEntries.filter((entry) => entry.user_id === person.id && ["earned", "paid"].includes(entry.status) && parseDateOnly(entry.reference_date) >= nextMonth.start && parseDateOnly(entry.reference_date) < nextMonth.end);
      const commission = personEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      return { ...person, salary, commission, total: salary + commission, sales: personEntries.length };
    })
    .sort((a, b) => b.total - a.total), [people, selectedId, compensations, visibleEntries, nextMonth]);

  const cycleOptions = useMemo(() => {
    const values = new Set<string>([nextCycle(), cycle]);
    visibleEntries.forEach((entry) => values.add(entry.reference_date));
    batches.filter((batch) => personIds.includes(batch.user_id)).forEach((batch) => values.add(batch.reference_date));
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [visibleEntries, batches, cycle, personIds]);

  const cycleEntries = useMemo(() => visibleEntries.filter((entry) => selectedIds.includes(entry.user_id) && entry.reference_date === cycle && entry.status !== "cancelled"), [visibleEntries, selectedIds, cycle]);
  const cycleBatches = useMemo(() => batches.filter((batch) => selectedIds.includes(batch.user_id) && batch.reference_date === cycle && batch.status === "paid"), [batches, selectedIds, cycle]);
  const cyclePeople = useMemo(() => people.filter((person) => selectedIds.includes(person.id)), [people, selectedIds]);

  const closingByPerson = useMemo(() => cyclePeople.map((person) => {
    const salary = Number(compensations.find((row) => row.user_id === person.id)?.base_salary || 0);
    const personEntries = cycleEntries.filter((entry) => entry.user_id === person.id);
    const earnedCommission = personEntries.filter((entry) => entry.status === "earned").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const paidCommission = personEntries.filter((entry) => entry.status === "paid").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const batch = cycleBatches.find((row) => row.user_id === person.id);
    return {
      ...person,
      salary: batch ? Number(batch.salary_amount || 0) : salary,
      commission: batch ? Number(batch.commission_amount || 0) : earnedCommission + paidCommission,
      saleCount: personEntries.filter((entry) => ["earned", "paid"].includes(entry.status)).length,
      total: batch ? Number(batch.total_amount || 0) : salary + earnedCommission + paidCommission,
      paid: !!batch,
      paidAt: batch?.paid_at || null,
    };
  }), [cyclePeople, compensations, cycleEntries, cycleBatches]);

  const adminGross = cycleEntries.filter((entry) => ["earned", "paid"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.admin_amount || 0), 0);
  const brokerDue = cycleEntries.filter((entry) => entry.status === "earned").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const adminNet = cycleEntries.filter((entry) => ["earned", "paid"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.admin_amount || 0) - Number(entry.amount || 0), 0);
  const payrollForecast = closingByPerson.reduce((sum, person) => sum + person.total, 0);

  const filteredLedger = useMemo(() => cycleEntries.filter((entry) => commissionStatus === "all" || entry.status === commissionStatus), [cycleEntries, commissionStatus]);
  const filteredBatches = useMemo(() => batches.filter((batch) => selectedIds.includes(batch.user_id)).slice(0, 30), [batches, selectedIds]);

  const settle = useMutation({
    mutationFn: async (person: Person) => {
      const confirmation = confirm(`Confirmar o pagamento de ${person.display_name || "colaborador"} referente a ${dateBr(cycle)}? Esta ação marcará as comissões liberadas deste ciclo como pagas.`);
      if (!confirmation) return null;
      const { data, error } = await supabase.rpc("settle_commission_payment" as never, { p_user_id: person.id, p_reference_date: cycle, p_notes: null } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      qc.invalidateQueries({ queryKey: ["commission-ledger"] });
      qc.invalidateQueries({ queryKey: ["commission-payment-batches"] });
      toast.success("Pagamento confirmado e fechamento atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const profileName = (id: string) => people.find((person) => person.id === id)?.display_name || "Corretor";
  const productName = (id: string | null) => products.find((product) => product.id === id);
  const leadName = (id: string | null) => commissionLeads.find((lead) => lead.id === id);
  const cycleInFuture = cycle > new Date().toISOString().slice(0, 10);
  const selectedPerson = people.find((person) => person.id === selectedId);
  const rangeLabel = `${dateBr(range.start)} a ${dateBr(range.now)}`;
  const previousRangeLabel = `${dateBr(range.previousStart)} a ${dateBr(new Date(range.start.getTime() - 1))}`;

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold sm:text-2xl">Desempenho e Comissões</h1>
          <p className="text-sm text-muted-foreground">Desempenho primeiro, comissões e fechamento financeiro na sequência. Todos os dados obedecem aos filtros abaixo.</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full xl:w-[270px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os colaboradores</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id}>{person.display_name || "Usuário"}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(period)} onValueChange={(value) => setPeriod(Number(value) as Period)}>
            <SelectTrigger className="w-full xl:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Período atual: <strong className="text-foreground">{rangeLabel}</strong> · comparação: <strong className="text-foreground">{previousRangeLabel}</strong>{selectedPerson ? ` · ${selectedPerson.display_name || "Usuário"}` : " · equipe completa"}
      </div>

      <section className="space-y-4 min-w-0">
        <div><h2 className="text-lg font-semibold">Desempenho</h2><p className="text-sm text-muted-foreground">Execução comercial comparada com o mesmo intervalo imediatamente anterior.</p></div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon={Activity} title="Atividades concluídas" value={String(performance.completed)} detail={changeText(performance.completed, performance.previousCompleted)} />
          <MetricCard icon={PhoneCall} title="Contatos realizados" value={String(performance.contacts)} detail={changeText(performance.contacts, performance.previousContacts)} />
          <MetricCard icon={Target} title="OnTime" value={`${performance.onTime}%`} detail={changeText(performance.onTime, performance.previousOnTime, " p.p.")} />
          <MetricCard icon={TrendingUp} title="Execução da agenda" value={`${performance.execution}%`} detail={changeText(performance.execution, performance.previousExecution, " p.p.")} />
          <MetricCard icon={Users} title="Novas vidas" value={String(performance.newLeads)} detail={changeText(performance.newLeads, performance.previousNewLeads)} />
          <MetricCard icon={AlarmClock} title="Vidas paradas >48h" value={String(performance.stopped)} detail={`${performance.overdue} atividades atrasadas no período`} />
        </div>

        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">Atual x período anterior</CardTitle></CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceChart} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="atual" name="Período atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="anterior" name="Período anterior" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {selectedId === "all" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ranking de desempenho da equipe</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
              <div className="min-w-[760px] divide-y">
                <div className="grid grid-cols-[60px_1.5fr_repeat(4,minmax(100px,1fr))] gap-3 px-4 py-3 text-xs font-medium text-muted-foreground sm:px-0">
                  <span>#</span><span>Colaborador</span><span>Atividades</span><span>Contatos</span><span>OnTime</span><span>Novas vidas</span>
                </div>
                {ranking.map((row, index) => <div key={row.person.id} className="grid grid-cols-[60px_1.5fr_repeat(4,minmax(100px,1fr))] gap-3 px-4 py-3 text-sm sm:px-0"><span className="font-semibold">{index + 1}º</span><span className="font-medium">{row.person.display_name || "Usuário"}</span><span>{row.completed}</span><span>{row.contacts}</span><span>{row.onTime}%</span><span>{row.newLeads}</span></div>)}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4 border-t pt-6 min-w-0">
        <div><h2 className="text-lg font-semibold">Comissões</h2><p className="text-sm text-muted-foreground">Resultados financeiros do mesmo filtro de pessoa e período, seguidos do fechamento mensal completo.</p></div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={CircleDollarSign} title="Comissões no período" value={money(periodEntries.current.broker)} detail={moneyChangeText(periodEntries.current.broker, periodEntries.previous.broker)} />
          <MetricCard icon={ReceiptText} title="Administradora bruta" value={money(periodEntries.current.gross)} detail={moneyChangeText(periodEntries.current.gross, periodEntries.previous.gross)} />
          <MetricCard icon={WalletCards} title="Administradora líquida" value={money(periodEntries.current.net)} detail={moneyChangeText(periodEntries.current.net, periodEntries.previous.net)} />
          <MetricCard icon={CheckCircle2} title="Vendas com comissão" value={String(periodEntries.current.sales)} detail={changeText(periodEntries.current.sales, periodEntries.previous.sales)} />
        </div>

        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">Comparativo financeiro do período</CardTitle></CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Bar dataKey="atual" name="Período atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="anterior" name="Período anterior" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><WalletCards className="h-4 w-4" />Previsão de ganho em {dateBr(nextMonth.start)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {nextForecast.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum colaborador disponível.</p> : nextForecast.map((person) => (
              <div key={person.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr] lg:items-center">
                <div><p className="font-semibold">{person.display_name || "Usuário"}</p><p className="text-xs text-muted-foreground">{person.sales} venda{person.sales === 1 ? "" : "s"} com comissão prevista no próximo mês</p></div>
                <div><p className="text-xs text-muted-foreground">Salário atual</p><p className="font-semibold">{money(person.salary)}</p></div>
                <div><p className="text-xs text-muted-foreground">Comissão prevista</p><p className="font-semibold">{money(person.commission)}</p></div>
                <div className="lg:text-right"><p className="text-xs text-muted-foreground">Ganho previsto</p><p className="text-xl font-bold text-primary">{money(person.total)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div><h3 className="font-semibold">Fechamento de comissões</h3><p className="text-xs text-muted-foreground">Toda a lógica financeira anterior permanece disponível abaixo.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-auto">
            <Select value={cycle} onValueChange={setCycle}><SelectTrigger className="w-full xl:w-[220px]"><SelectValue /></SelectTrigger><SelectContent>{cycleOptions.map((item) => <SelectItem key={item} value={item}>Pagamento {dateBr(item)}</SelectItem>)}</SelectContent></Select>
            <Select value={commissionStatus} onValueChange={setCommissionStatus}><SelectTrigger className="w-full xl:w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="earned">Liberadas</SelectItem><SelectItem value="paid">Pagas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={ReceiptText} title="Administradora bruta" value={money(adminGross)} detail="Receita de comissão do ciclo" />
          <MetricCard icon={CircleDollarSign} title="Repasse ainda a pagar" value={money(brokerDue)} detail="Comissões liberadas dos corretores" />
          <MetricCard icon={WalletCards} title="Administradora líquida" value={money(adminNet)} detail="Bruto menos participação dos corretores" />
          <MetricCard icon={WalletCards} title="Folha prevista" value={money(payrollForecast)} detail="Salários + comissões deste ciclo" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Fechamento por colaborador · {dateBr(cycle)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {closingByPerson.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum pagamento previsto para este ciclo.</div> : closingByPerson.map((person) => (
              <div key={person.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto] lg:items-center">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{person.display_name || "Usuário"}</p><Badge variant={person.paid ? "default" : "secondary"}>{person.paid ? "Pago" : "Previsto"}</Badge></div><p className="text-xs text-muted-foreground mt-1">{person.saleCount} venda{person.saleCount === 1 ? "" : "s"} com comissão no ciclo{person.paidAt ? ` · pago em ${dateTimeBr(person.paidAt)}` : ""}</p></div>
                <div><p className="text-xs text-muted-foreground">Salário fixo</p><p className="font-semibold">{money(person.salary)}</p></div>
                <div><p className="text-xs text-muted-foreground">Comissões</p><p className="font-semibold">{money(person.commission)}</p></div>
                <div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold text-primary">{money(person.total)}</p></div>
                <div className="lg:justify-self-end">{isAdmin && !person.paid && <Button size="sm" onClick={() => settle.mutate(person)} disabled={settle.isPending || cycleInFuture}><CheckCircle2 className="h-4 w-4 mr-1.5" />Confirmar pagamento</Button>}{isAdmin && !person.paid && cycleInFuture && <p className="mt-1 max-w-[190px] text-[11px] text-muted-foreground">Disponível na data prevista ou depois.</p>}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lançamentos do ciclo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loadingCommissions ? <p className="text-sm text-muted-foreground">Carregando comissões...</p> : filteredLedger.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma comissão encontrada neste ciclo.</div> : filteredLedger.map((entry) => {
              const product = productName(entry.product_id);
              const lead = leadName(entry.lead_id);
              return <div key={entry.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_.8fr_.8fr_.8fr_auto] lg:items-center"><div><p className="font-semibold">{profileName(entry.user_id)}</p><p className="text-xs text-muted-foreground">{lead?.empresa || lead?.nome || "Venda"}</p></div><div><p className="text-xs text-muted-foreground">Produto</p><p className="text-sm font-medium">{product?.name || "—"}</p><p className="text-xs text-muted-foreground">{product?.insurer_name || ""}</p></div><div><p className="text-xs text-muted-foreground">Venda</p><p className="font-semibold">{money(entry.commission_base_amount)}</p><p className="text-xs text-muted-foreground">Boleto: {dateBr(entry.boleto_paid_at)}</p></div><div><p className="text-xs text-muted-foreground">Administradora</p><p className="font-semibold">{money(entry.admin_amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.admin_commission_pct || 0).toLocaleString("pt-BR")}% da venda</p></div><div><p className="text-xs text-muted-foreground">Corretor</p><p className="font-semibold text-primary">{money(entry.amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.broker_commission_pct || 0).toLocaleString("pt-BR")}% da comissão</p></div><div className="flex items-center lg:justify-end"><Badge variant={entry.status === "earned" ? "secondary" : entry.status === "paid" ? "default" : entry.status === "cancelled" ? "destructive" : "outline"}>{entry.status === "earned" ? "Liberada" : entry.status === "paid" ? "Paga" : entry.status === "cancelled" ? "Cancelada" : entry.status}</Badge></div></div>;
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Histórico de fechamentos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {filteredBatches.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fechamento confirmado ainda.</p> : filteredBatches.map((batch) => <div key={batch.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr_.8fr] lg:items-center"><div><p className="font-medium">{profileName(batch.user_id)}</p><p className="text-xs text-muted-foreground">Pagamento {dateBr(batch.reference_date)} · {batch.commission_count} comissão{batch.commission_count === 1 ? "" : "ões"}</p></div><div><p className="text-xs text-muted-foreground">Salário</p><p className="font-semibold">{money(batch.salary_amount)}</p></div><div><p className="text-xs text-muted-foreground">Comissões</p><p className="font-semibold">{money(batch.commission_amount)}</p></div><div className="lg:text-right"><p className="text-xs text-muted-foreground">Total pago</p><p className="text-lg font-bold">{money(batch.total_amount)}</p><p className="text-[11px] text-muted-foreground">{dateTimeBr(batch.paid_at)}</p></div></div>)}
          </CardContent>
        </Card>

        <Card className="border-primary/20"><CardContent className="flex gap-3 p-4"><WalletCards className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Regra financeira do Segly</p><p className="mt-1 text-xs text-muted-foreground">A comissão só é liberada quando a venda está Implantada, possui produto vinculado, valor final fechado e boleto efetivamente pago. O valor do corretor é calculado sobre a comissão recebida pela administradora. Ao confirmar o pagamento, o Segly congela o salário e as comissões daquele fechamento para manter o histórico financeiro.</p></div></CardContent></Card>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: string; detail: string }) {
  return <Card className="min-w-0"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /></div><p className="mt-2 break-words text-xl font-bold sm:text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
