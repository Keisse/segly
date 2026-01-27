import { motion } from "framer-motion";
import RatingScale from "./RatingScale";
import type { Question } from "@/data/diagnosticQuestions";

interface QuestionCardProps {
  question: Question;
  index: number;
  value: number | undefined;
  onChange: (questionId: number, value: number) => void;
}

const QuestionCard = ({ question, index, value, onChange }: QuestionCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-6"
    >
      <p className="text-foreground mb-4 leading-relaxed">{question.text}</p>
      <RatingScale
        questionId={question.id}
        value={value}
        onChange={onChange}
      />
    </motion.div>
  );
};

export default QuestionCard;
