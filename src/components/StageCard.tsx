import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MaturityStage } from "@/data/diagnosticQuestions";

interface StageCardProps {
  stage: MaturityStage;
  isActive: boolean;
  index: number;
}

const StageCard = ({ stage, isActive, index }: StageCardProps) => {
  const stageIcons = ["🌱", "🌿", "🌳"];
  const stageColors = [
    "from-amber-500/20 to-orange-500/20 border-amber-500/50",
    "from-blue-500/20 to-cyan-500/20 border-blue-500/50", 
    "from-emerald-500/20 to-green-500/20 border-emerald-500/50",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "stage-card text-center",
        isActive && `stage-card-active bg-gradient-to-br ${stageColors[index]}`
      )}
    >
      <div className="text-3xl mb-2">{stageIcons[index]}</div>
      <h3 className={cn(
        "font-display font-semibold text-lg",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {stage.name}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        {stage.minPercentage}% - {stage.maxPercentage}%
      </p>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex justify-center gap-1 mt-3"
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i <= index ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StageCard;
