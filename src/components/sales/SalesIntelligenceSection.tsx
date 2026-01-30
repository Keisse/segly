import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisCard } from "./AnalysisCard";
import { 
  Factory, 
  Building2, 
  Users, 
  UserCircle,
  MessageSquareText,
  Target,
  Rocket,
  Zap,
  Shield
} from "lucide-react";
import type { Lead } from "@/types/lead";

interface SalesIntelligenceSectionProps {
  lead: Lead;
}

export function SalesIntelligenceSection({ lead }: SalesIntelligenceSectionProps) {
  const leadContext = {
    nome: lead.nome,
    empresa: lead.empresa,
    porte_empresa: lead.porte_empresa,
    departamento: lead.departamento,
    cargo: lead.cargo,
    score: lead.resultado_diagnostico?.percentage ?? 0,
    pillarScores: lead.resultado_diagnostico?.pillarScores?.map(p => ({
      pillarName: p.pillarName,
      percentage: p.percentage,
    })) || [],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Inteligência Comercial com IA
      </h2>

      <Tabs defaultValue="analises" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="analises">Análises Enriquecidas</TabsTrigger>
          <TabsTrigger value="scripts">Scripts de Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="analises" className="space-y-3">
          <AnalysisCard
            title="Análise da Indústria"
            description="Desafios, tendências, oportunidades e ameaças do setor"
            icon={<Factory className="w-4 h-4" />}
            type="industria"
            lead={leadContext}
          />
          <AnalysisCard
            title="Análise do Porte"
            description="Desafios financeiros, ciclo de compra e abordagem recomendada"
            icon={<Building2 className="w-4 h-4" />}
            type="porte"
            lead={leadContext}
          />
          <AnalysisCard
            title="Análise do Departamento"
            description="Expectativas, dores, motivadores e influenciadores"
            icon={<Users className="w-4 h-4" />}
            type="departamento"
            lead={leadContext}
          />
          <AnalysisCard
            title="Análise do Cargo"
            description="Desafios, evolução de carreira e SWOT pessoal"
            icon={<UserCircle className="w-4 h-4" />}
            type="cargo"
            lead={leadContext}
          />
        </TabsContent>

        <TabsContent value="scripts" className="space-y-3">
          <AnalysisCard
            title="SPIN Selling"
            description="Situação, Problema, Implicação e Necessidade"
            icon={<MessageSquareText className="w-4 h-4" />}
            type="spin"
            lead={leadContext}
          />
          <AnalysisCard
            title="BANT"
            description="Budget, Authority, Need e Timeline"
            icon={<Target className="w-4 h-4" />}
            type="bant"
            lead={leadContext}
          />
          <AnalysisCard
            title="GPCT"
            description="Goals, Plans, Challenges e Timeline"
            icon={<Rocket className="w-4 h-4" />}
            type="gpct"
            lead={leadContext}
          />
          <AnalysisCard
            title="Challenger Sale"
            description="Reframe, Rational Drowning e Emotional Impact"
            icon={<Zap className="w-4 h-4" />}
            type="challenger"
            lead={leadContext}
          />
          <AnalysisCard
            title="Sandler Selling System"
            description="Pain de 3 níveis e Up-Front Contract"
            icon={<Shield className="w-4 h-4" />}
            type="sandler"
            lead={leadContext}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
