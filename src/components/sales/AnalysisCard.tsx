import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, ChevronDown, ChevronUp, RefreshCw, Check } from "lucide-react";
import { useSalesIntelligence, type AnalysisType } from "@/hooks/useSalesIntelligence";
import { useSaveAIContent } from "@/hooks/useLeadAIContent";
import ReactMarkdown from "react-markdown";

interface LeadContext {
  nome: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
  score: number;
  pillarScores: Array<{
    pillarName: string;
    percentage: number;
  }>;
}

interface AnalysisCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  type: AnalysisType;
  leadId: string;
  lead: LeadContext;
  savedContent: string | null;
}

export function AnalysisCard({ title, description, icon, type, leadId, lead, savedContent }: AnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { content: generatedContent, isLoading, error, generate, reset, setContent } = useSalesIntelligence();
  const saveContent = useSaveAIContent();

  // Use saved content if available
  const content = generatedContent || savedContent;

  // When content is generated, save it to the database
  useEffect(() => {
    if (generatedContent && leadId) {
      saveContent.mutate({
        leadId,
        analysisType: type,
        content: generatedContent,
      });
    }
  }, [generatedContent, leadId, type]);

  const handleGenerate = async () => {
    if (content) {
      setIsExpanded(!isExpanded);
      return;
    }
    await generate(type, lead);
    setIsExpanded(true);
  };

  const handleRegenerate = async () => {
    reset();
    await generate(type, lead);
    setIsExpanded(true);
  };

  return (
    <Card className="bg-card/50 border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : content ? (
              <>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Recolher" : "Expandir"}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-2 pb-4">
              <div className="bg-secondary/30 rounded-lg p-4 prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium text-foreground mt-3 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-muted-foreground mb-2">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-3">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mb-3">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-muted-foreground">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-primary">{children}</em>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerar
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && !content && (
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      )}
    </Card>
  );
}
