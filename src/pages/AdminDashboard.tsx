import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  KanbanSquare,
  Plus,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeadsTable from "@/components/admin/LeadsTable";
import type { Lead } from "@/types/lead";

type Period = "7" | "30" | "90" | "all";
type ProfileRow = { id: string; display_name: string | null; lider_id: string | null; is_active: boolean | null };
type ActivityRow = { id: string; responsible_id: string; scheduled_at: string; completed_at: string | null; status: string };
type ClientRow = { id: string; owner_id: string | null; data_conversao: string; status: string | null };
type ContactRow = { id: string; user_id: string; completed_at: string; on_time: boolean | null };
type StageRow = { id: string; pipeline_id: string; nome: string; ordem: number; is_won: boolean; is_lost: boolean };
type LeadRow = Lead & { stage_entered_at?: string | null };

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function periodStart(period: Period) {
  if (period === "all") return null;
  const d = startOfDay();
  d.setDate(d.getDate() - (Number(period) - 1));
  return d;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function KpiCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const [period, setPeriod] = useState<Period>("30");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-v2-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["dashboard-v2-activities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities" as never).select("id,responsible_id,scheduled_at,completed_at,status");
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["dashboard-v2-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes" as never).select("id,owner_id,data_conversao,status");
      if (error) throw error;
      return (data ?? []) as unknown as ClientRow[];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["dashboard-v2-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_execution_log" as never).select("id,user_id,completed_at,on_time");
      if (error) throw error;
      return (data ?? []) as unknown as ContactRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["dashboard-v2-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,display_name,lider_id,is_active").eq("is_active", true).order("display_name");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["dashboard-v2-stages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_stages" as never).select("id,pipeline_id,nome,ordem,is_won,is_lost").order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as StageRow[];
    },
  });

  const people = useMemo(() => {
    if (!user) return [];
    if (role === "admin") return profiles;
    if (role === "lider") return profiles.filter((p) => p.id === user.id || p.lider_id === user.id);
    return profiles.filter((p) => p.id === user.id);
  }, [profiles, role, user]);

  const start = useMemo(() => periodStart(period), [period]);
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const ownerMatches = (ownerId: string | null | undefined) => ownerFilter === "all" || ownerId === ownerFilter;
  const inPeriod = (value: string | null | undefined) => !start || (!!value && new Date(value) >= start);

  const filteredLeads = useMemo(() => leads.filter((lead) => ownerMatches(lead.owner_id) && inPeriod(lead.created_at)), [leads, ownerFilter, start]);
  const filteredActivities = useMemo(() => activities.filter((item) => ownerMatches(item.responsible_id)), [activities, ownerFilter]);
  const filteredClients = useMemo(() => clients.filter((item) => ownerMatches(item.owner_id) && inPeriod(item.data_conversao)), [clients, ownerFilter, start]);
  const filteredContacts = useMemo(() => contacts.filter((item) => ownerMatches(item.user_id) && inPeriod(item.completed_at)), [contacts, ownerFilter, start]);

  const pending = filteredActivities.filter((a) => a.status === "pendente");
  const todayActivities = pending.filter((a) => { const d = new Date(a.scheduled_at); return d >= today && d < tomorrow; });
  const overdueActivities = pending.filter((a) => new Date(a.scheduled_at) < today);
  const completedInPeriod = filteredActivities.filter((a) => a.status === "concluida" && inPeriod(a.completed_at));
  const onTimeContacts = filteredContacts.filter((c) => c.on_time === true).length;

  const wonStageIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
  const lostStageIds = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));
  const wonLeads = filteredLeads.filter((l) => l.stage_id && wonStageIds.has(l.stage_id));
  const lostLeads = filteredLeads.filter((l) => l.stage_id && lostStageIds.has(l.stage_id));
  const activeLeads = filteredLeads.filter((l) => !l.stage_id || (!wonStageIds.has(l.stage_id) && !lostStageIds.has(l.stage_id)));
  const conversionBase = filteredLeads.length;
  const conversionCount = filteredClients.length || wonLeads.length;
  const conversionRate = percent(conversionCount, conversionBase);
  const onTimeRate = percent(onTimeContacts, filteredContacts.length);

  const pipelineBreakdown = useMemo(() => stages.map((stage) => ({
    ...stage,
    count: filteredLeads.filter((lead) => lead.stage_id === stage.id).length,
  })).filter((stage) => stage.count > 0), [stages, filteredLeads]);

  const periodLabel = period === "all" ? "Todo o período" : `Últimos ${period} dias`;

  return (
    <div className="p-6 space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard Comercial</h1>
          <p className="text-sm text-muted-foreground">Visão rápida de carteira, conversão e execução do follow-up.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          {(role === "admin" || role === "lider") && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda a equipe visível</SelectItem>
                {people.map((person) => <SelectItem key={person.id} value={person.id}>{person.display_name || "Usuário"}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button asChild><Link to="/admin/leads/novo"><Plus className="h-4 w-4 mr-2" />Cadastrar lead</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Leads no período" value={filteredLeads.length} detail={periodLabel} icon={Users} />
        <KpiCard title="Em andamento" value={activeLeads.length} detail={`${wonLeads.length} ganhos · ${lostLeads.length} perdidos`} icon={KanbanSquare} />
        <KpiCard title="Clientes convertidos" value={conversionCount} detail={`${conversionRate}% de conversão no período`} icon={UserCheck} />
        <KpiCard title="Execução no prazo" value={`${onTimeRate}%`} detail={`${onTimeContacts} de ${filteredContacts.length} contatos concluídos no prazo`} icon={Target} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Follow-ups de hoje" value={todayActivities.length} detail="Pendentes para hoje" icon={Clock3} />
        <KpiCard title="Follow-ups atrasados" value={overdueActivities.length} detail="Precisam de atenção" icon={AlertTriangle} />
        <KpiCard title="Atividades concluídas" value={completedInPeriod.length} detail={periodLabel} icon={CheckCircle2} />
        <KpiCard title="Contatos executados" value={filteredContacts.length} detail={periodLabel} icon={CalendarCheck2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Funil atual</CardTitle></CardHeader>
          <CardContent>
            {pipelineBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Ainda não há leads nas etapas do pipeline para o filtro selecionado.</p>
            ) : (
              <div className="space-y-3">
                {pipelineBreakdown.map((stage) => {
                  const share = percent(stage.count, filteredLeads.length);
                  return (
                    <div key={stage.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2"><span className="font-medium">{stage.nome}</span>{stage.is_won && <Badge variant="secondary">Ganho</Badge>}{stage.is_lost && <Badge variant="destructive">Perdido</Badge>}</div>
                        <span className="font-semibold">{stage.count} <span className="font-normal text-muted-foreground">({share}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, 2)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Prioridades de hoje</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/atividades" className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
              <div><p className="font-medium">Follow-ups atrasados</p><p className="text-xs text-muted-foreground">Resolver pendências antes de novas tarefas</p></div><Badge variant={overdueActivities.length ? "destructive" : "secondary"}>{overdueActivities.length}</Badge>
            </Link>
            <Link to="/admin/atividades" className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
              <div><p className="font-medium">A fazer hoje</p><p className="text-xs text-muted-foreground">Atividades programadas para hoje</p></div><Badge variant="secondary">{todayActivities.length}</Badge>
            </Link>
            <Link to="/admin/kanban" className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
              <div><p className="font-medium">Leads em andamento</p><p className="text-xs text-muted-foreground">Carteira comercial ativa</p></div><Badge variant="secondary">{activeLeads.length}</Badge>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Leads recentes ({filteredLeads.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <LeadsTable leads={filteredLeads.slice(0, 20)} isLoading={leadsLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
