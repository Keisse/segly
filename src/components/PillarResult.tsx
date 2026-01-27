import { motion } from "framer-motion";

interface PillarResultProps {
  pillarName: string;
  icon: string;
  percentage: number;
  score: number;
  maxScore: number;
  index: number;
}

const PillarResult = ({ pillarName, icon, percentage, score, maxScore, index }: PillarResultProps) => {
  const getBarColor = (pct: number) => {
    if (pct >= 67) return "bg-emerald-500";
    if (pct >= 34) return "bg-primary";
    return "bg-amber-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-sm text-foreground">{pillarName}</span>
        </div>
        <span className="text-sm font-semibold text-primary">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getBarColor(percentage)}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-right">
        {score}/{maxScore} pontos
      </p>
    </motion.div>
  );
};

export default PillarResult;
