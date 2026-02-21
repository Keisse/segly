import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import DiagnosticResult from "@/components/DiagnosticResult";
import LeadCaptureForm, { LeadData } from "@/components/LeadCaptureForm";
import { useSendWebhook } from "@/hooks/useWebhook";
import type { MaturityStage } from "@/data/diagnosticQuestions";
import allevoLogo from "@/assets/allevo-logo.png";

type View = "intro" | "result";

interface ResultState {
  view: "result";
  result: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    stage: MaturityStage;
    pillarScores: Array<{pillarId: number;pillarName: string;icon: string;score: number;maxScore: number;percentage: number;}>;
  };
  leadData: LeadData;
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as ResultState | null;

  const [view, setView] = useState<View>(
    locationState?.view === "result" ? "result" : "intro"
  );
  const [leadData, setLeadData] = useState<LeadData | null>(
    locationState?.leadData || null
  );
  const [result, setResult] = useState(locationState?.result || null);

  const sendWebhook = useSendWebhook();

  // Capture UTM parameters from URL on mount
  const utmParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_term: params.get("utm_term") || undefined,
      utm_content: params.get("utm_content") || undefined
    };
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  // Meta Pixel
  useEffect(() => {
    const PIXEL_ID = "1162724298777679";
    const SCRIPT_ID = "meta-pixel-script";
    const NOSCRIPT_ID = "meta-pixel-noscript";

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

  const handleStart = (data: LeadData) => {
    setLeadData(data);

    sendWebhook.mutate({
      type: "lead_capture",
      lead: {
        ...data,
        porte_empresa: data.porte
      },
      utm: utmParams
    });

    navigate("/diagnostico", {
      state: { leadData: data, utmParams }
    });
  };

  const handleRestart = () => {
    setResult(null);
    setLeadData(null);
    setView("intro");
    // Clear location state
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === "intro" &&
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen flex items-center justify-center px-4 py-12">

            <div className="max-w-2xl w-full flex flex-col items-center">
              <motion.img
              src={allevoLogo}
              alt="Allevo for Business"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="h-12 md:h-14 mb-8" />


              <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">

                Diagnóstico de Execução de{" "}
                <span className="text-primary">Alta Performance</span>
              </motion.h1>

              <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-base text-muted-foreground mb-8 leading-relaxed max-w-lg font-sans text-center">Falta pouquinho para medir sua maturidade e descobrir seu score de execução. Preencha seus dados e clique em "Iniciar Diagnóstico".



            </motion.p>

              <LeadCaptureForm onSubmit={handleStart} />
            </div>
          </motion.div>
        }

        {view === "result" && result && leadData &&
        <motion.div
          key="result"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>

            <DiagnosticResult
            totalScore={result.totalScore}
            maxScore={result.maxScore}
            percentage={result.percentage}
            stage={result.stage}
            pillarScores={result.pillarScores}
            leadData={leadData}
            onRestart={handleRestart} />

          </motion.div>
        }
      </AnimatePresence>
    </div>);

};

export default Index;