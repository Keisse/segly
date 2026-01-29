import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import PillarSection from "@/components/PillarSection";
import DiagnosticResult from "@/components/DiagnosticResult";
import LeadCaptureForm, { LeadData } from "@/components/LeadCaptureForm";
import { pillars, allQuestions, calculateScore } from "@/data/diagnosticQuestions";
import allevoLogo from "@/assets/allevo-logo.png";

type View = "intro" | "questions" | "result";

const Index = () => {
  const [view, setView] = useState<View>("intro");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [leadData, setLeadData] = useState<LeadData | null>(null);

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

  const handleStart = (data: LeadData) => {
    setLeadData(data);
    setView("questions");
  };

  const handleSubmit = () => {
    if (allAnswered) {
      setView("result");
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setLeadData(null);
    setView("intro");
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4 py-12"
          >
            <div className="max-w-2xl w-full flex flex-col items-center">
              <motion.img
                src={allevoLogo}
                alt="Allevo for Business"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="h-12 md:h-14 mb-8"
              />
              
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center"
              >
                Diagnóstico de Execução de{" "}
                <span className="text-primary">Alta Performance</span>
              </motion.h1>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-base text-muted-foreground mb-8 leading-relaxed text-center max-w-lg"
              >
                Preencha seus dados para iniciar o diagnóstico e descobrir seu nível de maturidade em execução.
              </motion.p>

              <LeadCaptureForm onSubmit={handleStart} />
            </div>
          </motion.div>
        )}

        {view === "questions" && (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProgressBar current={answeredCount} total={totalQuestions} />
            
            <div className="max-w-3xl mx-auto px-4 pt-24 pb-32">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                  Responda as perguntas
                </h1>
                <p className="text-muted-foreground">
                  Avalie cada afirmação de 1 (discordo totalmente) a 5 (concordo totalmente)
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

              {/* Fixed bottom button */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
                <div className="max-w-3xl mx-auto">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
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
        )}

        {view === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DiagnosticResult
              totalScore={result.totalScore}
              maxScore={result.maxScore}
              percentage={result.percentage}
              stage={result.stage}
              pillarScores={result.pillarScores}
              leadData={leadData!}
              onRestart={handleRestart}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
