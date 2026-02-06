import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import PillarSection from "@/components/PillarSection";
import DiagnosticResult from "@/components/DiagnosticResult";
import LeadCaptureForm, { LeadData } from "@/components/LeadCaptureForm";
import { pillars, allQuestions, calculateScore } from "@/data/diagnosticQuestions";
import { useInsertLead } from "@/hooks/useLeads";
import { useSendWebhook } from "@/hooks/useWebhook";
import allevoLogo from "@/assets/allevo-logo.png";
import type { Json } from "@/integrations/supabase/types";
type View = "intro" | "questions" | "result";
const Index = () => {
  const [view, setView] = useState<View>("intro");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insertLead = useInsertLead();
  const sendWebhook = useSendWebhook();

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }, [view]);

  // Meta Pixel - different tracking per view
  useEffect(() => {
    const PIXEL_ID = "1162724298777679";
    const SCRIPT_ID = "meta-pixel-script";
    const NOSCRIPT_ID = "meta-pixel-noscript";

    // Always clean up previous pixel first
    document.getElementById(SCRIPT_ID)?.remove();
    document.getElementById(NOSCRIPT_ID)?.remove();

    const trackLead = view === "result";

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${PIXEL_ID}');
      fbq('track', 'PageView');
      ${trackLead ? "fbq('track', 'Lead');" : ""}
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.id = NOSCRIPT_ID;
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + PIXEL_ID + '&ev=PageView&noscript=1" />';
    document.head.appendChild(noscript);
  }, [view]);
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = allQuestions.length;
  const allAnswered = answeredCount === totalQuestions;
  const result = useMemo(() => {
    if (!allAnswered) return null;
    return calculateScore(answers);
  }, [answers, allAnswered]);
  const handleAnswerChange = (questionId: number, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  const handleStart = async (data: LeadData) => {
    setLeadData(data);

    // Send first webhook on lead capture (fire and forget)
    sendWebhook.mutate({
      type: "lead_capture",
      lead: {
        ...data,
        porte_empresa: data.porte
      }
    });
    setView("questions");
  };
  const handleSubmit = async () => {
    if (!allAnswered || !leadData || !result) return;
    setIsSubmitting(true);
    try {
      // Save lead to database
      await insertLead.mutateAsync({
        nome: leadData.nome,
        telefone: leadData.telefone,
        email: leadData.email,
        empresa: leadData.empresa,
        porte_empresa: leadData.porte,
        departamento: leadData.departamento,
        cargo: leadData.cargo,
        resultado_diagnostico: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers
        } as unknown as Json
      });

      // Send second webhook with complete diagnostic (fire and forget)
      sendWebhook.mutate({
        type: "diagnostic_complete",
        lead: {
          ...leadData,
          porte_empresa: leadData.porte
        },
        diagnostic: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers
        }
      });
      setView("result");
    } catch (error) {
      console.error("Error saving lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRestart = () => {
    setAnswers({});
    setLeadData(null);
    setView("intro");
  };
  return <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === "intro" && <motion.div key="intro" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full flex flex-col items-center">
              <motion.img src={allevoLogo} alt="Allevo for Business" initial={{
            scale: 0.8,
            opacity: 0
          }} animate={{
            scale: 1,
            opacity: 1
          }} transition={{
            delay: 0.1
          }} className="h-12 md:h-14 mb-8" />
              
              <motion.h1 initial={{
            y: 20,
            opacity: 0
          }} animate={{
            y: 0,
            opacity: 1
          }} transition={{
            delay: 0.2
          }} className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Diagnóstico de Execução de{" "}
                <span className="text-primary">Alta Performance</span>
              </motion.h1>
              
              <motion.p initial={{
            y: 20,
            opacity: 0
          }} animate={{
            y: 0,
            opacity: 1
          }} transition={{
            delay: 0.25
          }} className="text-base text-muted-foreground mb-8 leading-relaxed text-center max-w-lg">Falta pouco para medir sua maturidade e descobrir seu score de execução. Preencha seus dados e clique em "Iniciar Diagnóstico".</motion.p>

              <LeadCaptureForm onSubmit={handleStart} />
            </div>
          </motion.div>}

        {view === "questions" && <motion.div key="questions" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }}>
            <ProgressBar current={answeredCount} total={totalQuestions} />
            
            <div className="max-w-3xl mx-auto px-4 pt-24 pb-32">
              <motion.div initial={{
            opacity: 0,
            y: -20
          }} animate={{
            opacity: 1,
            y: 0
          }} className="text-center mb-10">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                  Responda as perguntas
                </h1>
                <p className="text-muted-foreground">
                  Avalie cada afirmação de 1 (discordo totalmente) a 5 (concordo totalmente)
                </p>
              </motion.div>

              {pillars.map(pillar => <PillarSection key={pillar.id} pillar={pillar} answers={answers} onChange={handleAnswerChange} />)}

              {/* Fixed bottom button */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
                <div className="max-w-3xl mx-auto">
                  <Button size="lg" onClick={handleSubmit} disabled={!allAnswered || isSubmitting} className="w-full py-6 text-lg font-semibold">
                    {isSubmitting ? <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Salvando...
                      </> : allAnswered ? "Ver Resultado" : `Responda todas as perguntas (${answeredCount}/${totalQuestions})`}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>}

        {view === "result" && result && <motion.div key="result" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }}>
            <DiagnosticResult totalScore={result.totalScore} maxScore={result.maxScore} percentage={result.percentage} stage={result.stage} pillarScores={result.pillarScores} leadData={leadData!} onRestart={handleRestart} />
          </motion.div>}
      </AnimatePresence>
    </div>;
};
export default Index;