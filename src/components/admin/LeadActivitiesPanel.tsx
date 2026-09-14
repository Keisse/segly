import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Clock3, Loader2, Pencil, Plus, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type LeadActivity = {
  id: string;
  lead_id: string | null;
  responsible_id: string;
  title: string | null;
  type: string;
  scheduled_at: string;
  notes: string | null;
  status: "pendente" | "concluida" | "cancelada";
  completed_at: string | null;
  created_by: string;
};

type Props = {
  leadId: string;
  ownerId?: string | null;
};

const typeOptions = [
  ["contato", "Contato"],
  ["whatsapp", "WhatsApp"],
  ["telefone", "Telefone"],
  ["email", "E-mail"],
  ["visita", "Visita presencial"],
  ["reuniao_online", "Reunião online"],
  ["retorno_cliente", "Retorno do cliente"],
  ["retorno_negociacao", "Retorno de negociação"],
  ["retorno_standby", "Retorno de stand-by"],
  ["nova_abordagem", "Nova abordagem"],
  ["outro", "Outro"],
] as const;

function splitDateTime(iso?: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

function toIso(date: string, time: string) {
  const d = new Date(`${date}T${time || "09:00"}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function statusInfo(activity: LeadActivity) {
  if (activity.status === "concluida") return { label: "Concluída", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  const when = new Date(activity.scheduled_at);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (when < now) return { label: "Atrasada", className: "bg-red-500/10 text-red-600 border-red-500/20" };
  if (when >= todayStart && when < tomorrow) return { label: "Hoje", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
  return { label: "Futura", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
}

export function LeadActivitiesPanel({ leadId, ownerId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeadActivity | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("contato");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, title, type, scheduled_at, notes, status, completed_at, created_by")
        .eq("lead_id", leadId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LeadActivity[];
    },
  });

  const pending = useMemo(() => activities.filter((a) => a.status === "pendente"), [activities]);
  const completed = useMemo(() => activities.filter((a) => a.status === "concluida").slice().reverse(), [activities]);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setType("contato");
    setDate("");
    setTime("");
    setNotes("");
  };

  const openCreate = () => {
    resetForm();
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 60 * 1000);
    const values = splitDateTime(next.toISOString());
    setDate(values.date);
    setTime(values.time);
    setOpen(true);
  };

  const openEdit = (activity: LeadActivity) => {
    const values = splitDateTime(activity.scheduled_at);
    setEditing(activity);
    setTitle(activity.title || "");
    setType(activity.type);
    setDate(values.date);
    setTime(values.time);
    setNotes(activity.notes || "");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não encontrado.");
      if (!title.trim()) throw new Error("Informe o título da atividade.");
      if (!date) throw new Error("Informe a data da atividade.");
      const scheduledAt = toIso(date, time);
      if (!scheduledAt) throw new Error("Data ou horário inválido.");

      if (editing) {
        const { error } = await supabase
          .from("activities" as never)
          .update({
            title: title.trim(),
            type,
            scheduled_at: scheduledAt,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", editing.id);
        if (error) throw error;
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      const organizationId = (profile as { organization_id?: string | null } | null)?.organization_id;
      if (!organizationId) throw new Error("Organização não encontrada.");

      const { error } = await supabase
        .from("activities" as never)
        .insert({
          organization_id: organizationId,
          lead_id: leadId,
          responsible_id: ownerId || user.id,
          created_by: user.id,
          title: title.trim(),
          type,
          scheduled_at: scheduledAt,
          notes: notes.trim() || null,
          status: "pendente",
          kind: "lead",
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
      toast.success(editing ? "Atividade atualizada." : "Atividade criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (activity: LeadActivity) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("activities" as never)
        .update({ status: "concluida", completed_at: now, updated_at: now } as never)
        .eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
      toast.success("Atividade concluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescheduleTomorrow = useMutation({
    mutationFn: async (activity: LeadActivity) => {
      const current = new Date(activity.scheduled_at);
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(current.getHours(), current.getMinutes(), 0, 0);
      const { error } = await supabase
        .from("activities" as never)
        .update({ scheduled_at: next.toISOString(), updated_at: new Date().toISOString() } as never)
        .eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
      toast.success("Atividade reagendada para amanhã.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderActivity = (activity: LeadActivity) => {
    const state = statusInfo(activity);
    const when = new Date(activity.scheduled_at);
    return (
      <div key={activity.id} className="rounded-lg border border-border/70 p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm">{activity.title || activity.type}</p>
              <Badge variant="outline" className={state.className}>{state.label}</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
            {activity.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{activity.notes}</p>}
          </div>
          {activity.status === "pendente" && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => openEdit(activity)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => rescheduleTomorrow.mutate(activity)} disabled={rescheduleTomorrow.isPending}>
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />Amanhã
              </Button>
              <Button size="sm" onClick={() => complete.mutate(activity)} disabled={complete.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Concluir
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" /> Atividades
          </h2>
          <p className="text-sm text-muted-foreground">Crie, edite, conclua ou reagende atividades deste lead.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Nova atividade
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Pendentes</p>
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
            <div className="space-y-2">
              {pending.length ? pending.map(renderActivity) : <p className="text-sm text-muted-foreground py-3">Nenhuma atividade pendente.</p>}
            </div>
          </div>

          {completed.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Concluídas recentemente</p>
              <div className="space-y-2 opacity-80">{completed.slice(0, 5).map(renderActivity)}</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar atividade" : "Nova atividade"}</DialogTitle>
            <DialogDescription>{editing ? "Altere os dados ou reagende esta atividade." : "Adicione uma nova atividade vinculada a este lead."}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para confirmar proposta" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Detalhes da atividade..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Salvar alterações" : "Adicionar atividade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
