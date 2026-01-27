import { motion } from "framer-motion";
import QuestionCard from "./QuestionCard";
import type { Pillar } from "@/data/diagnosticQuestions";

interface PillarSectionProps {
  pillar: Pillar;
  answers: Record<number, number>;
  onChange: (questionId: number, value: number) => void;
}

const PillarSection = ({ pillar, answers, onChange }: PillarSectionProps) => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{pillar.icon}</span>
        <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
          {pillar.name}
        </h2>
      </div>
      
      <div className="space-y-4">
        {pillar.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            value={answers[question.id]}
            onChange={onChange}
          />
        ))}
      </div>
    </motion.section>
  );
};

export default PillarSection;
