import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pillars as defaultPillars, type Pillar } from "@/data/diagnosticQuestions";

/**
 * Carrega o conjunto de perguntas ATIVO do banco. Faz fallback para
 * as perguntas padrão definidas em código quando não há nenhum ativo.
 */
export function useActivePillars() {
  return useQuery({
    queryKey: ["active-question-set"],
    queryFn: async (): Promise<Pillar[]> => {
      const { data } = await supabase
        .from("question_sets")
        .select("pillars")
        .eq("is_active", true)
        .maybeSingle();
      if (data?.pillars && Array.isArray(data.pillars)) {
        return data.pillars as unknown as Pillar[];
      }
      return defaultPillars;
    },
    staleTime: 1000 * 60 * 5,
  });
}
