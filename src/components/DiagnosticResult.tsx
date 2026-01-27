import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import StageCard from "./StageCard";
import PillarResult from "./PillarResult";
import { maturityStages, type MaturityStage } from "@/data/diagnosticQuestions";

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
  onRestart: () => void;
}

const DiagnosticResult = ({
  totalScore,
  maxScore,
  percentage,
  stage,
  pillarScores,
  onRestart,
}: DiagnosticResultProps) => {
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
            Seu Resultado
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

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 mb-8 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
            Seu nível de maturidade:{" "}
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

          <p className="text-foreground/90 leading-relaxed max-w-2xl mx-auto mb-6">
            {stage.description}
          </p>

          <div className="bg-secondary/50 rounded-xl p-6 text-left">
            <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              👉 Para acelerar essa fase, recomendamos:
            </p>
            <p className="text-foreground/80 text-sm leading-relaxed">
              {stage.recommendation}
            </p>
          </div>
        </motion.div>

        {/* Pillar Breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h3 className="text-xl font-display font-semibold text-foreground mb-4">
            Resultados por Pilar
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pillarScores.map((pillar, index) => (
              <PillarResult
                key={pillar.pillarId}
                pillarName={pillar.pillarName}
                icon={pillar.icon}
                percentage={pillar.percentage}
                score={pillar.score}
                maxScore={pillar.maxScore}
                index={index}
              />
            ))}
          </div>
        </motion.div>

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
