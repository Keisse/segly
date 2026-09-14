import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { completeActivity } from "@/lib/activityCompletion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function AgendaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDateString());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const { start, end } = useMemo(todayBounds, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agenda-today", user?.id, localDateString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, title, type, kind, scheduled_at, notes, status, lead:leads(id,nome,empresa)")
        .eq("responsible_id", user.id)
        .eq("status", "pendente")
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AgendaItem[];
    },
    enabled: !!user,
  });

  const createItem = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não encontrado.");
      if (!title.trim()) throw new Error("Informe o que você precisa fazer.");
      const scheduled = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduled.getTime())) throw new Error("Data ou horário inválido.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
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
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      setOpen(false);
      setTitle("");
      setDate(localDateString());
      setTime("09:00");
      setNotes("");
      toast.success("Item adicionado à agenda.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeItem = useMutation({
    mutationFn: completeActivity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      qc.invalidateQueries({ queryKey: ["lead-activities"] });
      qc.invalidateQueries({ queryKey: ["productivity-activities"] });
      qc.invalidateQueries({ queryKey: ["productivity-contact-log"] });
      toast.success("Atividade concluída.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Agenda</h1>
        <p className="text-sm text-muted-foreground">Tudo o que você precisa executar hoje, em ordem de horário.</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Adicionar item à agenda</p>
            <p className="text-sm text-muted-foreground">Crie uma tarefa livre. Ela ficará vinculada somente a você.</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Adicionar item
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          <h2 className="font-semibold">Atividades de hoje</h2>
          <span className="text-sm text-muted-foreground">({items.length})</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando agenda...</p>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sua agenda de hoje está livre.</CardContent></Card>
        ) : (
          items.map((item, index) => {
            const content = (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold">{index + 1}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold"><Clock3 className="h-4 w-4" />{formatTime(item.scheduled_at)}</span>
                </div>
                <p className="mt-2 font-semibold truncate">{item.title || item.type}</p>
                {item.lead && <p className="text-sm text-muted-foreground truncate">{item.lead.empresa || item.lead.nome}</p>}
                {item.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>}
              </div>
            );

            return (
              <Card key={item.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  {item.lead_id ? (
                    <Link to={`/admin/lead/${item.lead_id}`} className="flex-1 min-w-0">{content}</Link>
                  ) : (
                    <Link to={`/admin/agenda/item/${item.id}`} className="flex-1 min-w-0">{content}</Link>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeItem.mutate(item)}
                    disabled={completeItem.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo item da agenda</DialogTitle>
            <DialogDescription>Adicione qualquer tarefa pessoal de trabalho à sua agenda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agenda-title">O que precisa ser feito?</Label>
              <Input id="agenda-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar proposta da empresa X" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label htmlFor="agenda-date">Data</Label><Input id="agenda-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="agenda-time">Horário</Label><Input id="agenda-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-notes">Observações</Label>
              <Textarea id="agenda-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createItem.mutate()} disabled={createItem.isPending}>Adicionar à agenda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
