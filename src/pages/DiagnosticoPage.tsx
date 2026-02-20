import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import ProgressBar from "@/components/ProgressBar";
import PillarSection from "@/components/PillarSection";
import { pillars, allQuestions, calculateScore } from "@/data/diagnosticQuestions";
import { useInsertLead } from "@/hooks/useLeads";
import { useSendWebhook } from "@/hooks/useWebhook";
import type { Json } from "@/integrations/supabase/types";
import type { LeadData } from "@/components/LeadCaptureForm";

interface LocationState {
  leadData: LeadData;
  utmParams: {
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_term?: string;
    utm_content?: string;
  };
  fonte?: string;
}

const DiagnosticoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const insertLead = useInsertLead();
  const sendWebhook = useSendWebhook();

  // Redirect to home if no lead data (only in production, not in preview/dev)
  useEffect(() => {
    if (!state?.leadData && !window.location.search.includes("__lovable_token")) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Meta Pixel for questions stage
  useEffect(() => {
    const PIXEL_ID = "1162724298777679";
    const SCRIPT_ID = "meta-pixel-script";
    const NOSCRIPT_ID = "meta-pixel-noscript";

    document.getElementById(SCRIPT_ID)?.remove();
    document.getElementById(NOSCRIPT_ID)?.remove();

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
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.id = NOSCRIPT_ID;
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + PIXEL_ID + '&ev=PageView&noscript=1" />';
    document.head.appendChild(noscript);

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById(NOSCRIPT_ID)?.remove();
    };
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

  const handleSubmit = async () => {
    if (!allAnswered || !state?.leadData || !result) return;
    setIsSubmitting(true);
    try {
      const fonte = state.fonte || "organico";
      await insertLead.mutateAsync({
        nome: state.leadData.nome,
        telefone: state.leadData.telefone,
        email: state.leadData.email,
        empresa: state.leadData.empresa,
        porte_empresa: state.leadData.porte,
        departamento: state.leadData.departamento,
        cargo: state.leadData.cargo,
        resultado_diagnostico: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers,
        } as unknown as Json,
        fonte,
      });

      sendWebhook.mutate({
        type: "diagnostic_complete",
        lead: {
          ...state.leadData,
          porte_empresa: state.leadData.porte,
        },
        diagnostic: {
          totalScore: result.totalScore,
          maxScore: result.maxScore,
          percentage: result.percentage,
          stage: result.stage,
          pillarScores: result.pillarScores,
          answers: answers,
        },
        utm: state.utmParams,
      });

      // Navigate to result page (back on Index with result state)
      navigate("/", {
        state: {
          view: "result",
          result,
          leadData: state.leadData,
        },
      });
    } catch (error) {
      console.error("Error saving lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!state?.leadData && !window.location.search.includes("__lovable_token")) return null;

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
            className="text-center mb-10"
          >
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Responda as perguntas
            </h1>
            <p className="text-muted-foreground">
              Avalie cada afirmação de 1 (discordo totalmente) a 5 (concordo
              totalmente)
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
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className="w-full py-6 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : allAnswered ? (
                  "Ver Resultado"
                ) : (
                  `Responda todas as perguntas (${answeredCount}/${totalQuestions})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DiagnosticoPage;
