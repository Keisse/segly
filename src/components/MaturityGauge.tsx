import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MaturityStage } from "@/data/diagnosticQuestions";

interface MaturityGaugeProps {
  percentage: number;
  stage: MaturityStage;
}

const MaturityGauge = ({ percentage, stage }: MaturityGaugeProps) => {
  // Determinar posição do indicador (0-100%)
  const indicatorPosition = Math.min(Math.max(percentage, 0), 100);
  
  // Cores por estágio
  const stageColors = {
    1: { bg: "bg-amber-500", glow: "shadow-amber-500/50", text: "text-amber-400" },
    2: { bg: "bg-blue-500", glow: "shadow-blue-500/50", text: "text-blue-400" },
    3: { bg: "bg-emerald-500", glow: "shadow-emerald-500/50", text: "text-emerald-400" },
  };
  
  const currentColor = stageColors[stage.id as keyof typeof stageColors] || stageColors[1];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 md:p-8"
    >
      {/* Header com pontuação */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="text-center md:text-left">
          <p className="text-sm text-muted-foreground mb-1">Seu nível de maturidade</p>
          <h2 className={cn("text-2xl md:text-3xl font-display font-bold", currentColor.text)}>
            {stage.name}
          </h2>
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className={cn(
            "flex items-center justify-center w-20 h-20 rounded-full",
            "bg-gradient-to-br from-secondary to-background",
            "border-4",
            stage.id === 1 ? "border-amber-500" : stage.id === 2 ? "border-blue-500" : "border-emerald-500"
          )}
        >
          <span className="text-2xl font-bold text-foreground">{Math.round(percentage)}%</span>
        </motion.div>
      </div>

      {/* Barra de progresso visual */}
      <div className="relative mb-4">
        {/* Fundo da barra com 3 seções */}
        <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
          <div className="flex-1 border-r border-background/20 bg-amber-500/20" />
          <div className="flex-1 border-r border-background/20 bg-blue-500/20" />
          <div className="flex-1 bg-emerald-500/20" />
        </div>
        
        {/* Barra de progresso preenchida */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${indicatorPosition}%` }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className={cn(
            "absolute top-0 left-0 h-4 rounded-full",
            currentColor.bg,
            "shadow-lg",
            currentColor.glow
          )}
        />
        
        {/* Indicador circular */}
        <motion.div
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: `${indicatorPosition}%`, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-6 h-6 rounded-full border-2 border-background",
            currentColor.bg,
            "shadow-lg",
            currentColor.glow
          )}
        />
      </div>

      {/* Labels dos estágios */}
      <div className="flex justify-between text-xs">
        <div className={cn(
          "text-center flex-1",
          stage.id === 1 ? "text-amber-400 font-medium" : "text-muted-foreground"
        )}>
          <span className="block">Fundamentação</span>
          <span className="text-[10px] opacity-70">0-33%</span>
        </div>
        <div className={cn(
          "text-center flex-1",
          stage.id === 2 ? "text-blue-400 font-medium" : "text-muted-foreground"
        )}>
          <span className="block">Consolidação</span>
          <span className="text-[10px] opacity-70">34-66%</span>
        </div>
        <div className={cn(
          "text-center flex-1",
          stage.id === 3 ? "text-emerald-400 font-medium" : "text-muted-foreground"
        )}>
          <span className="block">Estratégico</span>
          <span className="text-[10px] opacity-70">67-100%</span>
        </div>
      </div>

      {/* Descrição do estágio */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-sm text-foreground/80 text-center leading-relaxed"
      >
        {stage.description}
      </motion.p>
    </motion.div>
  );
};

export default MaturityGauge;
