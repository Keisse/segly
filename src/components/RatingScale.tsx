import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RatingScaleProps {
  questionId: number;
  value: number | undefined;
  onChange: (questionId: number, value: number) => void;
}

const RatingScale = ({ questionId, value, onChange }: RatingScaleProps) => {
  const options = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {options.map((option) => (
          <motion.button
            key={option}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(questionId, option)}
            className={cn(
              "rating-button",
              value === option && "rating-button-selected"
            )}
          >
            {option}
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Discordo totalmente</span>
        <span>Concordo totalmente</span>
      </div>
    </div>
  );
};

export default RatingScale;
