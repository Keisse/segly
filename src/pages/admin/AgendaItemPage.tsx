import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AgendaItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ["agenda-item", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, title, type, kind, scheduled_at, notes, status, lead_id, lead:leads(id,nome,empresa)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: string;
        title: string | null;
        type: string;
        kind: string;
        scheduled_at: string;
        notes: string | null;
        status: string;
        lead_id: string | null;
        lead?: { id: string; nome: string; empresa: string | null } | null;
      } | null;
    },
    enabled: !!id,
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase
        .from("activities" as never)
        .update({ status: "concluida", completed_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      qc.invalidateQueries({ queryKey: ["activities-page"] });
      toast.success("Atividade concluída.");
      navigate("/admin/agenda");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando atividade...</div>;
  if (!item) return <div className="p-6 text-sm text-muted-foreground">Atividade não encontrada.</div>;

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <Button variant="ghost" onClick={() => navigate("/admin/agenda")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar para Agenda
      </Button>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-display font-bold">{item.title || item.type}</h1>
          <Badge variant="secondary">{item.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(item.scheduled_at))}
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</p>
            <p className="font-medium">{item.type}</p>
          </div>
          {item.notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Observações</p>
              <p className="whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
          {item.lead_id && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead relacionado</p>
              <Link to={`/admin/lead/${item.lead_id}`} className="font-semibold text-primary hover:underline">
                {item.lead?.empresa || item.lead?.nome || "Abrir lead"}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {item.status === "pendente" && (
        <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
          <CheckCircle2 className="h-4 w-4 mr-2" />Concluir atividade
        </Button>
      )}
    </div>
  );
}
