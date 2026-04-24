import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface Pillar {
  id: number;
  name: string;
  icon: string;
  questions: { id: number; text: string; pillar: number }[];
}

interface QuestionSet {
  id: string;
  name: string;
  context: string | null;
  pillars: Pillar[];
  is_active: boolean;
  created_at: string;
}

const PerguntasPage = () => {
  const qc = useQueryClient();
  const [context, setContext] = useState("");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);

  const { data: sets, isLoading } = useQuery({
    queryKey: ["question-sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_sets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as QuestionSet[];
    },
  });

  const generate = async () => {
    if (!context.trim() || !name.trim()) {
      toast.error("Informe nome e contexto");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { context, name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Perguntas geradas! Revise e ative quando desejar.");
      setContext("");
      setName("");
      qc.invalidateQueries({ queryKey: ["question-sets"] });
      if (data?.set) setEditingSet(data.set);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar perguntas");
    } finally {
      setGenerating(false);
    }
  };

  const activate = useMutation({
    mutationFn: async (id: string) => {
      // Desativar todos
      await supabase.from("question_sets").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("question_sets").update({ is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conjunto ativado");
      qc.invalidateQueries({ queryKey: ["question-sets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["question-sets"] });
    },
  });

  const saveEdited = useMutation({
    mutationFn: async (set: QuestionSet) => {
      const { error } = await supabase
        .from("question_sets")
        .update({ name: set.name, pillars: set.pillars as any })
        .eq("id", set.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["question-sets"] });
      setEditingSet(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Editor de Perguntas</h1>
        <p className="text-sm text-muted-foreground">
          Modo autopiloto: a IA gera 30 perguntas (6 pilares x 5) usando seu contexto e a base de conhecimento.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Gerar novo conjunto</h2>
        </div>
        <Input
          placeholder="Nome do conjunto (ex: V2 - Foco Liderança)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          placeholder="Descreva o contexto, público-alvo, foco e objetivo do diagnóstico. Quanto mais detalhes, melhores as perguntas."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={6}
        />
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Gerar perguntas com IA
        </Button>
      </Card>

      <div className="space-y-4">
        <h2 className="font-semibold">Versões salvas</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {sets?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editingSet?.id === s.id ? (
                  <Input
                    value={editingSet.name}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    className="mb-2"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{s.name}</h3>
                    {s.is_active && <Badge className="bg-emerald-500/20 text-emerald-400">Ativo</Badge>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                {!s.is_active && (
                  <Button size="sm" variant="outline" onClick={() => activate.mutate(s.id)}>
                    <Check className="h-3 w-3 mr-1" /> Ativar
                  </Button>
                )}
                {editingSet?.id === s.id ? (
                  <>
                    <Button size="sm" onClick={() => saveEdited.mutate(editingSet)}>
                      <Save className="h-3 w-3 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSet(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setEditingSet(s)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(editingSet?.id === s.id ? editingSet.pillars : s.pillars)?.map((p, pi) => (
                <div key={p.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm font-medium">
                    {p.icon} Pilar {p.id}: {p.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {p.questions.map((q, qi) => (
                      <li key={q.id} className="text-xs text-muted-foreground flex gap-2">
                        <span>{q.id}.</span>
                        {editingSet?.id === s.id ? (
                          <Textarea
                            value={q.text}
                            onChange={(e) => {
                              const newPillars = [...editingSet.pillars];
                              newPillars[pi].questions[qi] = { ...q, text: e.target.value };
                              setEditingSet({ ...editingSet, pillars: newPillars });
                            }}
                            rows={2}
                            className="text-xs"
                          />
                        ) : (
                          <span>{q.text}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {sets?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum conjunto gerado ainda.</p>
        )}
      </div>
    </div>
  );
};

export default PerguntasPage;
