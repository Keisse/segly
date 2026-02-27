import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProgressBar from "@/components/ProgressBar";
import PillarSection from "@/components/PillarSection";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import DiagnosticResult from "@/components/DiagnosticResult";
import { pillars, allQuestions, calculateScore } from "@/data/diagnosticQuestions";
import { useInsertLead } from "@/hooks/useLeads";
import { useSendWebhook } from "@/hooks/useWebhook";
import type { Json } from "@/integrations/supabase/types";
import type { LeadData } from "@/components/LeadCaptureForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type View = "questions" | "optin" | "result";

const DiagnosticoDiretoPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("questions");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const insertLead = useInsertLead();
  const sendWebhook = useSendWebhook();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = allQuestions.length;
  const allAnswered = answeredCount === totalQuestions;

  const result = useMemo(() => {
    if (!allAnswered) return null;
    return calculateScore(answers);
  }, [answers, allAnswered]);

  const handleAnswerChange = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleShowResult = () => {
    if (!allAnswered || !result) return;
    setView("optin");
  };

  const handleOptinSubmit = async (data: LeadData) => {
    if (!result) return;
    setLeadData(data);
    setIsSubmitting(true);

    try {
      await insertLead.mutateAsync({
        nome: data.nome,
        telefone: data.telefone,
        email: data.email,
        empresa: data.empresa,
        porte_empresa: data.porte,
        departamento: data.departamento,
        cargo: data.cargo,
        resultado_diagnostico: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers,
        } as unknown as Json,
        fonte: "diagnostico-direto",
      });

      const utmParams = Object.fromEntries(
        new URLSearchParams(window.location.search)
      );

      sendWebhook.mutate({
        type: "diagnostic_complete",
        lead: {
          ...data,
          porte_empresa: data.porte,
        },
        diagnostic: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers,
        },
        utm: utmParams,
      });

      setView("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error saving lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setLeadData(null);
    setView("questions");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  if (view === "result" && result && leadData) {
    return (
      <div className="min-h-screen">
        <DiagnosticResult
          totalScore={result.totalScore}
          maxScore={result.maxScore}
          percentage={result.percentage}
          stage={result.stage}
          pillarScores={result.pillarScores}
          leadData={leadData}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ProgressBar current={answeredCount} total={totalQuestions} />

        <div className="max-w-3xl mx-auto px-4 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-lg md:text-xl text-muted-foreground mb-2">
              Descubra em que estágio você e sua empresa estão na
            </p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">
              Maturidade de Execução
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Realize gratuitamente o <strong>Teste de Maturidade em Execução de Alta Performance</strong> e receba uma análise com recomendações práticas para você e seu time avançarem com sucesso em todos os projetos.
            </p>
          </motion.div>

          {pillars.map((pillar) => (
            <PillarSection
              key={pillar.id}
              pillar={pillar}
              answers={answers}
              onChange={handleAnswerChange}
            />
          ))}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
            <div className="max-w-3xl mx-auto">
              <Button
                size="lg"
                onClick={handleShowResult}
                disabled={!allAnswered}
                className="w-full py-6 text-lg font-semibold"
              >
                {allAnswered
                  ? "Ver Resultado"
                  : `Responda todas as perguntas (${answeredCount}/${totalQuestions})`}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Opt-in modal after completing all questions */}
      <Dialog open={view === "optin"} onOpenChange={(open) => !open && !isSubmitting && setView("questions")}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-center">
              Falta pouco para ver seu resultado 🎯
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Preencha seus dados para que o sistema relacione todas as respostas para gerar o melhor resultado.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <LeadCaptureForm
              onSubmit={handleOptinSubmit}
            />
            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticoDiretoPage;
