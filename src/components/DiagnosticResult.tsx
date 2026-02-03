import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw, BookOpen, CheckCircle2, Target, Lightbulb, ArrowRight, Download } from "lucide-react";
import MaturityGauge from "./MaturityGauge";
import { maturityStages, type MaturityStage } from "@/data/diagnosticQuestions";
import { coursesByPillarAndStage, getCourseForPillar, type AllevoCourse } from "@/data/allevoCourses";
import { getPillarInterpretation, getStageKeyFromPercentage, type PillarInterpretation } from "@/data/pillarInterpretations";
import type { LeadData } from "./LeadCaptureForm";
import allevoLogo from "@/assets/allevo-logo.png";
import { generateReportPDF } from "@/utils/generateReportPDF";
interface PillarScore {
  pillarId: number;
  pillarName: string;
  icon: string;
  score: number;
  maxScore: number;
  percentage: number;
}
interface DiagnosticResultProps {
  totalScore: number;
  maxScore: number;
  percentage: number;
  stage: MaturityStage;
  pillarScores: PillarScore[];
  leadData: LeadData;
  onRestart: () => void;
}
const getStageName = (stageKey: string): string => {
  switch (stageKey) {
    case "fundamentacao":
      return "Fundamentação";
    case "consolidacao":
      return "Consolidação";
    case "estrategico":
      return "Estratégico";
    default:
      return stageKey;
  }
};
const PillarDetailCard = ({
  pillar,
  interpretation,
  course,
  stageKey,
  index
}: {
  pillar: PillarScore;
  interpretation: PillarInterpretation;
  course: AllevoCourse | null;
  stageKey: string;
  index: number;
}) => <motion.div initial={{
  opacity: 0,
  y: 20
}} animate={{
  opacity: 1,
  y: 0
}} transition={{
  delay: 0.3 + index * 0.1
}} className="glass-card p-6 space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{pillar.icon}</span>
        <div>
          <h4 className="font-semibold text-foreground">{pillar.pillarName}</h4>
          <p className="text-sm text-muted-foreground">
            {pillar.score} de {pillar.maxScore} pontos ({Math.round(pillar.percentage)}%)
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageKey === "fundamentacao" ? "bg-amber-500/20 text-amber-400" : stageKey === "consolidacao" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
          {getStageName(stageKey)}
        </span>
      </div>
    </div>

    {/* Progress bar */}
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <motion.div initial={{
      width: 0
    }} animate={{
      width: `${pillar.percentage}%`
    }} transition={{
      delay: 0.5 + index * 0.1,
      duration: 0.8
    }} className={`h-full rounded-full ${stageKey === "fundamentacao" ? "bg-amber-500" : stageKey === "consolidacao" ? "bg-blue-500" : "bg-emerald-500"}`} />
    </div>

    {/* Interpretation */}
    <div className="bg-secondary/30 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span className="text-sm font-medium text-primary">Diagnóstico</span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">
        {interpretation.interpretation}
      </p>
    </div>

    {/* Actions */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">Ações Recomendadas</span>
      </div>
      <ul className="space-y-2">
        {interpretation.actions.slice(0, 3).map((action, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>{action}</span>
          </li>)}
      </ul>
    </div>

    {/* Course Recommendation */}
    {course && <div className="border-t border-border pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Próximo passo lógico de evolução</p>
            <h5 className="font-semibold text-foreground text-sm">{course.name}</h5>
            <p className="text-xs text-foreground/70 mt-1">{course.description}</p>
          </div>
        </div>
      </div>}
  </motion.div>;
const DiagnosticResult = ({
  totalScore,
  maxScore,
  percentage,
  stage,
  pillarScores,
  leadData,
  onRestart
}: DiagnosticResultProps) => {
  // Processar cada pilar individualmente
  const pillarDetails = pillarScores.map(pillar => {
    const stageKey = getStageKeyFromPercentage(pillar.percentage);
    const interpretation = getPillarInterpretation(pillar.pillarId, stageKey, leadData);
    const course = getCourseForPillar(pillar.pillarId, stageKey);
    return {
      pillar,
      stageKey,
      interpretation,
      course
    };
  });

  // Agrupar cursos únicos recomendados com informação do pilar
  const uniqueCoursesWithPillar = pillarDetails.filter(p => p.course).reduce((acc, p) => {
    if (p.course && !acc.find(c => c.course.id === p.course!.id)) {
      acc.push({
        course: p.course,
        pillarId: p.pillar.pillarId,
        pillarName: p.pillar.pillarName,
      });
    }
    return acc;
  }, [] as { course: AllevoCourse; pillarId: number; pillarName: string }[]);
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center mb-10">
          <img src={allevoLogo} alt="Allevo for Business" className="h-10 md:h-12 mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Seu Resultado, {leadData.nome.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Diagnóstico de Execução de Alta Performance
          </p>
        </motion.div>

        {/* Maturity Gauge */}
        <MaturityGauge percentage={percentage} stage={stage} />

        {/* Allevo Score */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.4
      }} className="text-center mt-6 mb-8">
          <p className="text-sm text-muted-foreground mb-2">Allevo Score</p>
          <p className="text-3xl font-bold text-primary">{totalScore}</p>
          <p className="text-xs text-muted-foreground">de {maxScore} pontos</p>
        </motion.div>

        {/* Individual Pillar Results */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.4
      }} className="mb-8">
          <h3 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-2">
            📊 Análise Detalhada por Pilar
          </h3>
          <div className="grid gap-6">
            {pillarDetails.map((detail, index) => <PillarDetailCard key={detail.pillar.pillarId} pillar={detail.pillar} interpretation={detail.interpretation} course={detail.course} stageKey={detail.stageKey} index={index} />)}
          </div>
        </motion.div>

        {/* Summary of Recommended Courses */}
        {uniqueCoursesWithPillar.length > 0 && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.6
      }} className="glass-card p-6 mb-8">
            <h3 className="text-xl font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Sua Trilha de Desenvolvimento
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Baseado no seu diagnóstico, recomendamos os seguintes cursos para evoluir sua maturidade em execução:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {uniqueCoursesWithPillar.map((item, index) => <motion.div key={item.course.id} initial={{
            opacity: 0,
            x: -10
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: 0.7 + index * 0.1
          }} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-4">
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground text-sm">{item.course.name}</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pilar {item.pillarId} - {item.pillarName}
                    </p>
                    <p className="text-xs text-foreground/60 mt-0.5">Estágio: {getStageName(item.course.stage)}</p>
                  </div>
                </motion.div>)}
            </div>
          </motion.div>}

        {/* CTA */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.7
      }} className="text-center space-y-6">
          <div className="glass-card p-6 md:p-8">
            <img src={allevoLogo} alt="Allevo for Business" className="h-8 mx-auto mb-4" />
            <p className="text-foreground/80 mb-6">
              Quer acelerar sua evolução? Fale com um especialista da Allevo e descubra como podemos ajudar você e sua empresa.
            </p>
            <a href="https://wa.me/5511917510567?text=Ol%C3%A1!%20Vim%20do%20diagn%C3%B3stico%20e%20quero%20saber%20mais%20sobre%20a%20Allevo%20For%20Business." target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full max-w-md text-lg py-6 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-full shadow-lg hover:shadow-primary/30 hover:shadow-xl transition-all duration-300 group">
                Falar com Especialista
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" onClick={() => generateReportPDF({
            totalScore,
            maxScore,
            percentage,
            stage,
            pillarScores,
            leadData
          })} className="text-muted-foreground hover:text-foreground">
              <Download className="w-4 h-4 mr-2" />
              Baixar Relatório
            </Button>
            
            <Button variant="ghost" onClick={onRestart} className="text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refazer Diagnóstico
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>;
};
export default DiagnosticResult;