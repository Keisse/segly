import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw, BookOpen, ArrowRight, CheckCircle2, Target, Lightbulb } from "lucide-react";
import StageCard from "./StageCard";
import { maturityStages, type MaturityStage } from "@/data/diagnosticQuestions";
import { coursesByPillarAndStage, getCourseForPillar, type AllevoCourse } from "@/data/allevoCourses";
import { getPillarInterpretation, getStageKeyFromPercentage, type PillarInterpretation } from "@/data/pillarInterpretations";
import type { LeadData } from "./LeadCaptureForm";

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
    case "fundamentacao": return "Fundamentação";
    case "consolidacao": return "Consolidação";
    case "estrategico": return "Estratégico";
    default: return stageKey;
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
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 + index * 0.1 }}
    className="glass-card p-6 space-y-4"
  >
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
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          stageKey === "fundamentacao" ? "bg-amber-500/20 text-amber-400" :
          stageKey === "consolidacao" ? "bg-blue-500/20 text-blue-400" :
          "bg-emerald-500/20 text-emerald-400"
        }`}>
          {getStageName(stageKey)}
        </span>
      </div>
    </div>

    {/* Progress bar */}
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pillar.percentage}%` }}
        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
        className={`h-full rounded-full ${
          stageKey === "fundamentacao" ? "bg-amber-500" :
          stageKey === "consolidacao" ? "bg-blue-500" :
          "bg-emerald-500"
        }`}
      />
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
        {interpretation.actions.slice(0, 3).map((action, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Course Recommendation */}
    {course && (
      <div className="border-t border-border pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Próximo passo lógico de evolução</p>
            <h5 className="font-semibold text-foreground text-sm">{course.name}</h5>
            <p className="text-xs text-foreground/70 mt-1">{course.description}</p>
            <p className="text-xs text-primary mt-2">
              Pilar Allevo: {course.pillarAllevo}
            </p>
          </div>
        </div>
      </div>
    )}
  </motion.div>
);

const DiagnosticResult = ({
  totalScore,
  maxScore,
  percentage,
  stage,
  pillarScores,
  leadData,
  onRestart,
}: DiagnosticResultProps) => {
  // Processar cada pilar individualmente
  const pillarDetails = pillarScores.map((pillar) => {
    const stageKey = getStageKeyFromPercentage(pillar.percentage);
    const interpretation = getPillarInterpretation(pillar.pillarId, stageKey, leadData);
    const course = getCourseForPillar(pillar.pillarId, stageKey);
    return { pillar, stageKey, interpretation, course };
  });

  // Agrupar cursos únicos recomendados
  const uniqueCourses = pillarDetails
    .filter(p => p.course)
    .reduce((acc, p) => {
      if (p.course && !acc.find(c => c.id === p.course!.id)) {
        acc.push(p.course);
      }
      return acc;
    }, [] as AllevoCourse[]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen py-12 px-4"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Seu Resultado, {leadData.nome.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Diagnóstico de Execução de Alta Performance
          </p>
        </motion.div>

        {/* Stage Cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {maturityStages.map((s, index) => (
            <StageCard
              key={s.id}
              stage={s}
              isActive={s.id === stage.id}
              index={index}
            />
          ))}
        </div>

        {/* Main Result Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 mb-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
              Nível Geral de Maturidade:{" "}
              <span className="text-primary">{stage.name}</span>
            </h2>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{Math.round(percentage)}%</p>
                <p className="text-sm text-muted-foreground">pontuação geral</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">{totalScore}</p>
                <p className="text-sm text-muted-foreground">de {maxScore} pontos</p>
              </div>
            </div>

            <p className="text-foreground/80 leading-relaxed max-w-2xl mx-auto">
              {stage.description}
            </p>
          </div>
        </motion.div>

        {/* Individual Pillar Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-2">
            📊 Análise Detalhada por Pilar
          </h3>
          <div className="grid gap-6">
            {pillarDetails.map((detail, index) => (
              <PillarDetailCard
                key={detail.pillar.pillarId}
                pillar={detail.pillar}
                interpretation={detail.interpretation}
                course={detail.course}
                stageKey={detail.stageKey}
                index={index}
              />
            ))}
          </div>
        </motion.div>

        {/* Summary of Recommended Courses */}
        {uniqueCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6 mb-8"
          >
            <h3 className="text-xl font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Sua Trilha de Desenvolvimento
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Baseado no seu diagnóstico, recomendamos os seguintes cursos para evoluir sua maturidade em execução:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {uniqueCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-start gap-3 bg-secondary/50 rounded-lg p-4"
                >
                  <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground text-sm">{course.name}</h5>
                    <p className="text-xs text-muted-foreground mt-1">{course.pillarAllevo}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center space-y-4"
        >
          <Button
            size="lg"
            className="w-full max-w-md text-lg py-6 font-semibold"
          >
            Falar com Especialista
          </Button>
          
          <Button
            variant="ghost"
            onClick={onRestart}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refazer Diagnóstico
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DiagnosticResult;
