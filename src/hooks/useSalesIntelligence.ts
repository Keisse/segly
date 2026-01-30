import { useState } from "react";
import { toast } from "sonner";

export type AnalysisType = 
  | "industria" 
  | "porte" 
  | "departamento" 
  | "cargo"
  | "spin"
  | "bant"
  | "gpct"
  | "challenger"
  | "sandler";

interface LeadContext {
  nome: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
  score: number;
  pillarScores: Array<{
    pillarName: string;
    percentage: number;
  }>;
}

interface UseSalesIntelligenceReturn {
  content: string | null;
  isLoading: boolean;
  error: string | null;
  generate: (type: AnalysisType, lead: LeadContext) => Promise<void>;
  reset: () => void;
  setContent: (content: string | null) => void;
}

export function useSalesIntelligence(): UseSalesIntelligenceReturn {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (type: AnalysisType, lead: LeadContext) => {
    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/sales-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, lead }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Erro ao gerar análise";
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setContent(data.content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast.error("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setContent(null);
    setError(null);
  };

  return { content, isLoading, error, generate, reset, setContent };
}
