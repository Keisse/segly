import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

 type ActivityRow = {
  id: string;
  lead_id: string;
  responsible_id: string;
  type: string;
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
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const AtividadesPage = () => {
  const qc = useQueryClient();
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, type, scheduled_at, notes, status, completed_at, lead:leads(id,nome,empresa)")
        .eq("status", "pendente")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("activities" as never)
        .update({ status: "concluida", completed_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      qc.invalidateQueries({ queryKey: ["pending-activities"] });
      toast.success("Atividade concluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = useMemo(() => {
    const today = startOfToday();
    const tomorrow = startOfTomorrow();
    return {
      atrasadas: activities.filter((a) => new Date(a.scheduled_at) < today),
      hoje: activities.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d >= today && d < tomorrow;
      }),
      futuras: activities.filter((a) => new Date(a.scheduled_at) >= tomorrow),
    };
  }, [activities]);

  const renderList = (items: ActivityRow[], empty: string) => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Carregando atividades...</p>;
    if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

    return (
      <div className="space-y-3">
        {items.map((activity) => (
          <Card key={activity.id}>
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{activity.type}</Badge>
                  <span className="text-sm font-medium">{formatDateTime(activity.scheduled_at)}</span>
                </div>
                <Link to={`/admin/lead/${activity.lead_id}`} className="font-semibold hover:text-primary">
                  {activity.lead?.empresa || activity.lead?.nome || "Abrir lead"}
                </Link>
                {activity.lead?.empresa && activity.lead?.nome && (
                  <p className="text-xs text-muted-foreground">Contato: {activity.lead.nome}</p>
                )}
                {activity.notes && <p className="text-sm text-muted-foreground">{activity.notes}</p>}
              </div>
              <Button size="sm" onClick={() => complete.mutate(activity.id)} disabled={complete.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Atividades</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas atividades atrasadas, de hoje e futuras.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.atrasadas.length}</p><p className="text-xs text-muted-foreground">Atrasadas</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock3 className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.hoje.length}</p><p className="text-xs text-muted-foreground">Hoje</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CalendarDays className="h-5 w-5" /><div><p className="text-2xl font-bold">{groups.futuras.length}</p><p className="text-xs text-muted-foreground">Futuras</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="atrasadas">Atrasadas ({groups.atrasadas.length})</TabsTrigger>
          <TabsTrigger value="hoje">Hoje ({groups.hoje.length})</TabsTrigger>
          <TabsTrigger value="futuras">Futuras ({groups.futuras.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="atrasadas" className="mt-4">{renderList(groups.atrasadas, "Nenhuma atividade atrasada.")}</TabsContent>
        <TabsContent value="hoje" className="mt-4">{renderList(groups.hoje, "Nenhuma atividade para hoje.")}</TabsContent>
        <TabsContent value="futuras" className="mt-4">{renderList(groups.futuras, "Nenhuma atividade futura.")}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AtividadesPage;
