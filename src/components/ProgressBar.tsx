import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar = ({ current, total }: ProgressBarProps) => {
  const percentage = (current / total) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 py-4 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Progresso do diagnóstico
          </span>
          <span className="text-sm font-medium text-foreground">
            {current}/{total} perguntas
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ boxShadow: "var(--glow-primary)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
