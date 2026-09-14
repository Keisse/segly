import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { completeActivity } from "@/lib/activityCompletion";
import { rescheduleActivityForTomorrow, resumeStandbyLead } from "@/lib/activityQuickActions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, AlertTriangle, RefreshCcw, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type ActivityRow = {
  id: string;
  lead_id: string | null;
  responsible_id: string;
  type: string;
  title: string | null;
  kind: string;
  scheduled_at: string;
  notes: string | null;
  status: "pendente" | "concluida" | "cancelada";
  completed_at: string | null;
  lead?: { id: string; nome: string; empresa: string | null } | null;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(value: Date) {
  const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

const AtividadesPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [todoOpen, setTodoOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateString());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, type, title, kind, scheduled_at, notes, status, completed_at, lead:leads(id,nome,empresa)")
        .eq("status", "pendente")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["activities-page"] });
    qc.invalidateQueries({ queryKey: ["pending-activities"] });
    qc.invalidateQueries({ queryKey: ["lead-activities"] });
    qc.invalidateQueries({ queryKey: ["productivity-activities"] });
    qc.invalidateQueries({ queryKey: ["productivity-contact-executions"] });
    qc.invalidateQueries({ queryKey: ["leads-by-pipeline"] });
  };

  const complete = useMutation({ mutationFn: completeActivity, onSuccess: () => { invalidate(); toast.success("Atividade concluída."); }, onError: (e: Error) => toast.error(e.message) });
  const reschedule = useMutation({ mutationFn: (activity: ActivityRow) => rescheduleActivityForTomorrow(activity.id, activity.scheduled_at), onSuccess: () => { invalidate(); toast.success("Atividade reagendada para amanhã."); }, onError: (e: Error) => toast.error(e.message) });
  const resume = useMutation({ mutationFn: (activity: ActivityRow) => resumeStandbyLead(activity.lead_id!, activity.id), onSuccess: () => { invalidate(); toast.success("Lead retomado e movido para Em Contato."); }, onError: (e: Error) => toast.error(e.message) });

  const createActivity = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não encontrado.");
      if (!title.trim()) throw new Error("Informe o que precisa ser feito.");
      const scheduled = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduled.getTime())) throw new Error("Data ou horário inválido.");

      const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id;
      if (!organizationId) throw new Error("Organização não encontrada.");

      const { error } = await supabase.from("activities" as never).insert({
        organization_id: organizationId,
        lead_id: null,
        responsible_id: user.id,
        created_by: user.id,
        title: title.trim(),
        type: "tarefa",
        kind: "manual",
        scheduled_at: scheduled.toISOString(),
        notes: notes.trim() || null,
        status: "pendente",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setTitle("");
      setDate(localDateString());
      setTime("09:00");
      setNotes("");
      toast.success("Item adicionado ao Follow-up.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = useMemo(() => {
    const today = startOfToday();
    const tomorrow = startOfTomorrow();
    return {
      hoje: activities.filter((a) => { const d = new Date(a.scheduled_at); return d >= today && d < tomorrow; }),
      atrasadas: activities.filter((a) => new Date(a.scheduled_at) < today),
      futuras: activities.filter((a) => new Date(a.scheduled_at) >= tomorrow),
    };
  }, [activities]);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const itemsByDay = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    activities.forEach((item) => {
      const key = localDateString(new Date(item.scheduled_at));
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });
    return map;
  }, [activities]);

  const selectedItems = useMemo(() => selectedDate ? (itemsByDay.get(localDateString(selectedDate)) || []) : [], [selectedDate, itemsByDay]);

  const renderList = (items: ActivityRow[], empty: string, overdue = false) => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Carregando atividades...</p>;
    if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

    return (
      <div className="space-y-3">
        {items.map((activity) => (
          <Card key={activity.id} className={overdue ? "border-red-500/40 bg-red-500/5" : undefined}>
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={overdue ? "destructive" : "secondary"}>{activity.type}</Badge>
                  <span className="text-sm font-medium">{formatDateTime(activity.scheduled_at)}</span>
                </div>
                {activity.lead_id ? <Link to={`/admin/lead/${activity.lead_id}`} className="font-semibold hover:text-primary">{activity.lead?.empresa || activity.lead?.nome || "Abrir lead"}</Link> : <span className="font-semibold">{activity.title || "Atividade"}</span>}
                {activity.lead?.empresa && activity.lead?.nome && <p className="text-xs text-muted-foreground">Contato: {activity.lead.nome}</p>}
                {activity.notes && <p className="text-sm text-muted-foreground">{activity.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {overdue && <Button size="sm" variant="outline" onClick={() => reschedule.mutate(activity)} disabled={reschedule.isPending}><RefreshCcw className="h-4 w-4 mr-2" />Amanhã</Button>}
                {overdue && activity.type === "retorno_standby" && activity.lead_id && <Button size="sm" variant="outline" onClick={() => resume.mutate(activity)} disabled={resume.isPending}><RotateCcw className="h-4 w-4 mr-2" />Retomar lead</Button>}
                <Button size="sm" onClick={() => complete.mutate(activity)} disabled={complete.isPending}><CheckCircle2 className="h-4 w-4 mr-2" />Concluir</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const openDay = (day: Date) => {
    setSelectedDate(day);
    setTodoOpen(true);
  };

  const moveMonth = (direction: -1 | 1) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Follow-up</h1><p className="text-sm text-muted-foreground">Acompanhe o que precisa ser feito hoje, o que atrasou e o que está programado para o futuro.</p></div>
        <Button onClick={() => setCreateOpen(true)}><CalendarPlus className="h-4 w-4 mr-2" />Adicionar item</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <Button variant="outline" size="icon" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-center"><p className="font-semibold">{monthLabel(calendarMonth)}</p><button className="text-xs text-primary hover:underline" onClick={() => setCalendarMonth(new Date())}>Voltar para hoje</button></div>
            <Button variant="outline" size="icon" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day} className="p-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = localDateString(day);
              const count = (itemsByDay.get(key) || []).length;
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const isToday = key === localDateString();
              return (
                <div key={key} className={`relative min-h-[104px] border-b border-r p-2 ${isCurrentMonth ? "bg-background" : "bg-muted/15 text-muted-foreground"}`}>
                  <div className="flex justify-end">
                    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground font-semibold" : ""}`}>{day.getDate()}</span>
                  </div>
                  {count > 0 && (
                    <button
                      onClick={() => openDay(day)}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-amber-500 px-3 text-lg font-extrabold text-white shadow-sm transition hover:bg-amber-600 hover:scale-105"
                      title={`${count} atividades`}
                    >
                      {count}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock3 className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.hoje.length}</p><p className="text-xs text-muted-foreground">Hoje</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.atrasadas.length}</p><p className="text-xs text-muted-foreground">Atrasadas</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CalendarDays className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.futuras.length}</p><p className="text-xs text-muted-foreground">Futuras</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="hoje">Hoje ({groups.hoje.length})</TabsTrigger>
          <TabsTrigger value="atrasadas">Atrasadas ({groups.atrasadas.length})</TabsTrigger>
          <TabsTrigger value="futuras">Futuras ({groups.futuras.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="hoje" className="mt-4">{renderList(groups.hoje, "Nenhuma atividade para hoje.")}</TabsContent>
        <TabsContent value="atrasadas" className="mt-4">{renderList(groups.atrasadas, "Nenhuma atividade atrasada.", true)}</TabsContent>
        <TabsContent value="futuras" className="mt-4">{renderList(groups.futuras, "Nenhuma atividade futura.")}</TabsContent>
      </Tabs>

      <Dialog open={todoOpen} onOpenChange={setTodoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>A fazer</DialogTitle>
            <DialogDescription>{selectedDate ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(selectedDate) : "Atividades do dia"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {selectedItems.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma atividade para este dia.</p> : selectedItems.map((activity) => (
              <label key={activity.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={false} onChange={(event) => { if (event.target.checked) complete.mutate(activity); }} disabled={complete.isPending} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{activity.title || activity.type}</span><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(activity.scheduled_at))}</span></div>
                  {activity.lead && <p className="text-sm text-muted-foreground">{activity.lead.empresa || activity.lead.nome}</p>}
                  {activity.notes && <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>}
                </div>
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo item</DialogTitle><DialogDescription>Adicione uma atividade para hoje ou para uma data futura.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="followup-title">O que precisa ser feito?</Label><Input id="followup-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar proposta da empresa X" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="followup-date">Data</Label><Input id="followup-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={localDateString()} /></div><div className="space-y-2"><Label htmlFor="followup-time">Horário</Label><Input id="followup-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div></div>
            <div className="space-y-2"><Label htmlFor="followup-notes">Observações</Label><Textarea id="followup-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={4} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={() => createActivity.mutate()} disabled={createActivity.isPending}>Adicionar item</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtividadesPage;