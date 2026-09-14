import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { completeActivity } from "@/lib/activityCompletion";
import { rescheduleActivityForTomorrow, resumeStandbyLead } from "@/lib/activityQuickActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AgendaView = "todo" | "calendar";

type AgendaItem = {
  id: string;
  lead_id: string | null;
  responsible_id: string;
  title: string | null;
  type: string;
  kind: string;
  scheduled_at: string;
  notes: string | null;
  status: "pendente" | "concluida" | "cancelada";
  lead?: { id: string; nome: string; empresa: string | null } | null;
};

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthBounds(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 1);
  return { start, end };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function monthLabel(value: Date) {
  const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<AgendaView>("todo");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateString());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const { start, end } = useMemo(todayBounds, []);
  const calendarRange = useMemo(() => monthBounds(calendarMonth), [calendarMonth]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agenda-today", user?.id, localDateString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, title, type, kind, scheduled_at, notes, status, lead:leads(id,nome,empresa)")
        .eq("responsible_id", user.id)
        .eq("status", "pendente")
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AgendaItem[];
    },
    enabled: !!user,
  });

  const { data: monthItems = [], isLoading: isCalendarLoading } = useQuery({
    queryKey: ["agenda-calendar", user?.id, calendarRange.start.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, title, type, kind, scheduled_at, notes, status, lead:leads(id,nome,empresa)")
        .eq("responsible_id", user.id)
        .neq("status", "cancelada")
        .gte("scheduled_at", calendarRange.start.toISOString())
        .lt("scheduled_at", calendarRange.end.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AgendaItem[];
    },
    enabled: !!user && view === "calendar",
  });

  const overdueItems = useMemo(() => items.filter((item) => new Date(item.scheduled_at) < start), [items, start]);
  const todayItems = useMemo(() => items.filter((item) => {
    const when = new Date(item.scheduled_at);
    return when >= start && when < end;
  }), [items, start, end]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    monthItems.forEach((item) => {
      const key = localDateString(new Date(item.scheduled_at));
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });
    return map;
  }, [monthItems]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agenda-today"] });
    qc.invalidateQueries({ queryKey: ["agenda-calendar"] });
    qc.invalidateQueries({ queryKey: ["activities-page"] });
    qc.invalidateQueries({ queryKey: ["pending-activities"] });
    qc.invalidateQueries({ queryKey: ["lead-activities"] });
    qc.invalidateQueries({ queryKey: ["productivity-activities"] });
    qc.invalidateQueries({ queryKey: ["productivity-contact-executions"] });
    qc.invalidateQueries({ queryKey: ["leads-by-pipeline"] });
  };

  const createItem = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não encontrado.");
      if (!title.trim()) throw new Error("Informe o que você precisa fazer.");
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
      setOpen(false);
      setTitle("");
      setDate(localDateString());
      setTime("09:00");
      setNotes("");
      toast.success("Item adicionado à agenda.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeItem = useMutation({ mutationFn: completeActivity, onSuccess: () => { invalidate(); toast.success("Atividade concluída."); }, onError: (e: Error) => toast.error(e.message) });
  const reschedule = useMutation({ mutationFn: (item: AgendaItem) => rescheduleActivityForTomorrow(item.id, item.scheduled_at), onSuccess: () => { invalidate(); toast.success("Atividade reagendada para amanhã."); }, onError: (e: Error) => toast.error(e.message) });
  const resume = useMutation({ mutationFn: (item: AgendaItem) => resumeStandbyLead(item.lead_id!, item.id), onSuccess: () => { invalidate(); toast.success("Lead retomado e movido para Em Contato."); }, onError: (e: Error) => toast.error(e.message) });

  const renderItem = (item: AgendaItem, index: number, overdue = false) => {
    const content = (
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold">{index + 1}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold"><Clock3 className="h-4 w-4" />{overdue ? formatDateTime(item.scheduled_at) : formatTime(item.scheduled_at)}</span>
          {overdue && <Badge variant="destructive">Atrasada</Badge>}
        </div>
        <p className="mt-2 font-semibold truncate">{item.title || item.type}</p>
        {item.lead && <p className="text-sm text-muted-foreground truncate">{item.lead.empresa || item.lead.nome}</p>}
        {item.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>}
      </div>
    );

    return (
      <Card key={item.id} className={overdue ? "border-red-500/40 bg-red-500/5" : "hover:border-primary/40 transition-colors"}>
        <CardContent className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center">
          {item.lead_id ? <Link to={`/admin/lead/${item.lead_id}`} className="flex-1 min-w-0">{content}</Link> : <Link to={`/admin/agenda/item/${item.id}`} className="flex-1 min-w-0">{content}</Link>}
          <div className="flex flex-wrap gap-2 shrink-0">
            {overdue && <Button size="sm" variant="outline" onClick={() => reschedule.mutate(item)} disabled={reschedule.isPending}><RefreshCcw className="h-4 w-4 mr-2" />Amanhã</Button>}
            {overdue && item.type === "retorno_standby" && item.lead_id && <Button size="sm" variant="outline" onClick={() => resume.mutate(item)} disabled={resume.isPending}><RotateCcw className="h-4 w-4 mr-2" />Retomar lead</Button>}
            <Button size="sm" variant="outline" onClick={() => completeItem.mutate(item)} disabled={completeItem.isPending}><CheckCircle2 className="h-4 w-4 mr-2" />Concluir</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const moveMonth = (direction: -1 | 1) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Organize sua execução em formato de lista ou calendário.</p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/30 p-1 self-start">
          <Button size="sm" variant={view === "todo" ? "default" : "ghost"} onClick={() => setView("todo")}>
            <ListTodo className="h-4 w-4 mr-2" />Todo
          </Button>
          <Button size="sm" variant={view === "calendar" ? "default" : "ghost"} onClick={() => setView("calendar")}>
            <CalendarDays className="h-4 w-4 mr-2" />Calendário
          </Button>
        </div>
      </div>

      <Card className="border-dashed"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Adicionar item à agenda</p><p className="text-sm text-muted-foreground">Crie uma tarefa livre. Ela ficará vinculada somente a você.</p></div><Button onClick={() => setOpen(true)}><CalendarPlus className="h-4 w-4 mr-2" />Adicionar item</Button></CardContent></Card>

      {view === "todo" ? (
        <>
          {overdueItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /><h2 className="font-semibold">Pendências vencidas</h2><span className="text-sm">({overdueItems.length})</span></div>
              {overdueItems.map((item, index) => renderItem(item, index, true))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2"><ListTodo className="h-5 w-5" /><h2 className="font-semibold">Atividades de hoje</h2><span className="text-sm text-muted-foreground">({todayItems.length})</span></div>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando agenda...</p> : todayItems.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sua agenda de hoje está livre.</CardContent></Card> : todayItems.map((item, index) => renderItem(item, index))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <Button variant="outline" size="icon" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-center">
                <p className="font-semibold">{monthLabel(calendarMonth)}</p>
                <button className="text-xs text-primary hover:underline" onClick={() => setCalendarMonth(new Date())}>Voltar para hoje</button>
              </div>
              <Button variant="outline" size="icon" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day} className="p-2">{day}</div>)}
            </div>

            {isCalendarLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Carregando calendário...</div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = localDateString(day);
                  const dayItems = itemsByDay.get(key) || [];
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                  const isToday = key === localDateString();
                  return (
                    <div key={key} className={`min-h-[125px] border-b border-r p-2 ${isCurrentMonth ? "bg-background" : "bg-muted/15 text-muted-foreground"}`}>
                      <div className="flex justify-end mb-1">
                        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground font-semibold" : ""}`}>{day.getDate()}</span>
                      </div>
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((item) => {
                          const href = item.lead_id ? `/admin/lead/${item.lead_id}` : `/admin/agenda/item/${item.id}`;
                          return (
                            <Link key={item.id} to={href} className={`block rounded border px-1.5 py-1 text-[11px] leading-tight hover:border-primary/60 ${item.status === "concluida" ? "opacity-60 line-through" : "bg-primary/5"}`} title={item.title || item.type}>
                              <span className="font-medium">{formatTime(item.scheduled_at)}</span> {item.title || item.type}
                            </Link>
                          );
                        })}
                        {dayItems.length > 3 && <p className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} itens</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo item da agenda</DialogTitle><DialogDescription>Adicione qualquer tarefa pessoal de trabalho à sua agenda.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="agenda-title">O que precisa ser feito?</Label><Input id="agenda-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar proposta da empresa X" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="agenda-date">Data</Label><Input id="agenda-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="agenda-time">Horário</Label><Input id="agenda-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div></div>
            <div className="space-y-2"><Label htmlFor="agenda-notes">Observações</Label><Textarea id="agenda-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={4} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => createItem.mutate()} disabled={createItem.isPending}>Adicionar à agenda</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
