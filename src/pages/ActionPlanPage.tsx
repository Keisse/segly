import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Target, Sparkles, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { getCourseForPillar } from "@/data/allevoCourses";
import allevoLogo from "@/assets/allevo-logo.png";
import { Link } from "react-router-dom";

type StageKey = "fundamentacao" | "consolidacao" | "estrategico";

const stages: { key: StageKey; label: string; description: string }[] = [
  { key: "fundamentacao", label: "Fundamentação", description: "Construindo bases sólidas e rotinas consistentes" },
  { key: "consolidacao", label: "Consolidação", description: "Padronizando métodos e ganhando consistência" },
  { key: "estrategico", label: "Estratégico", description: "Domínio, visão sistêmica e influência" },
];

const pillars = [
  { id: 1, name: "Pensamento Estratégico", description: "Capacidade de pensar a longo prazo e alinhar ações com objetivos" },
  { id: 2, name: "Execução e Disciplina", description: "Transformar planos em ações concretas com consistência" },
  { id: 3, name: "Cultura Corporativa", description: "Construir ambiente de alta performance e engajamento" },
  { id: 4, name: "Gestão de Projetos", description: "Planejar, executar e entregar projetos com excelência" },
  { id: 5, name: "Liderança e Influência", description: "Inspirar e desenvolver pessoas para resultados" },
  { id: 6, name: "Inovação e Criatividade", description: "Promover mudanças e novas formas de trabalho" },
];

// Ações sugeridas por pilar e estágio (baseadas nas interpretações)
const actionsByPillarAndStage: Record<number, Record<StageKey, string[]>> = {
  1: {
    fundamentacao: [
      "Defina claramente o propósito do seu trabalho e comunique-o",
      "Reserve tempo semanal para pensar estrategicamente",
      "Mapeie os fatores mais críticos para seu sucesso",
      "Crie o hábito de analisar dados antes de decisões importantes",
      "Busque entender como seu trabalho se conecta com a estratégia maior",
    ],
    consolidacao: [
      "Formalize seu processo de planejamento estratégico",
      "Crie rituais mensais de revisão estratégica",
      "Desenvolva indicadores para monitorar execução da estratégia",
      "Alinhe suas prioridades regularmente com lideranças",
      "Use dados e análises para embasar suas propostas",
    ],
    estrategico: [
      "Documente e compartilhe seu processo de análise estratégica",
      "Desenvolva e mentore outros profissionais em pensamento estratégico",
      "Crie governança para sustentar a excelência estratégica",
      "Busque inspiração externa através de networking e mentorias",
      "Lidere transformações estratégicas de impacto",
    ],
  },
  2: {
    fundamentacao: [
      "Estabeleça um ritual semanal de planejamento e revisão",
      "Defina poucas prioridades e mantenha foco absoluto nelas",
      "Crie um sistema simples de acompanhamento de metas",
      "Aprenda a dizer 'não' para proteger o que é prioritário",
      "Organize suas tarefas em blocos de foco profundo",
    ],
    consolidacao: [
      "Padronize seus processos de execução",
      "Desenvolva métricas de produtividade pessoal",
      "Crie rotinas que garantam consistência nas entregas",
      "Implemente revisões regulares de progresso",
      "Elimine distrações e interrupções desnecessárias",
    ],
    estrategico: [
      "Automatize tarefas repetitivas para focar no estratégico",
      "Desenvolva sistemas de accountability para sua equipe",
      "Crie cultura de execução disciplinada ao seu redor",
      "Mentore outros em gestão de tempo e prioridades",
      "Estruture processos escaláveis de alta performance",
    ],
  },
  3: {
    fundamentacao: [
      "Mapeie e documente seus processos de trabalho",
      "Identifique gargalos e ineficiências nos fluxos atuais",
      "Crie padrões básicos de qualidade para suas entregas",
      "Desenvolva consciência sobre a cultura da organização",
      "Busque entender como suas ações impactam o ambiente",
    ],
    consolidacao: [
      "Promova alinhamento entre discurso e prática",
      "Desenvolva rituais que fortaleçam a cultura desejada",
      "Crie mecanismos de feedback contínuo",
      "Engaje-se ativamente na construção de um ambiente positivo",
      "Padronize boas práticas e compartilhe com a equipe",
    ],
    estrategico: [
      "Lidere iniciativas de transformação cultural",
      "Desenvolva e forme outros líderes culturais",
      "Crie sistemas de reconhecimento alinhados aos valores",
      "Estruture governança cultural na organização",
      "Seja referência de coerência entre valores e ações",
    ],
  },
  4: {
    fundamentacao: [
      "Aprenda metodologias básicas de gestão de projetos",
      "Crie o hábito de definir escopo, prazo e recursos antes de iniciar",
      "Desenvolva checklists para acompanhamento de projetos",
      "Pratique a comunicação clara de status e riscos",
      "Documente lições aprendidas de cada projeto",
    ],
    consolidacao: [
      "Domine ferramentas de gestão de projetos",
      "Implemente metodologias ágeis onde apropriado",
      "Desenvolva habilidades de gestão de stakeholders",
      "Crie dashboards de acompanhamento de projetos",
      "Aprimore suas técnicas de mitigação de riscos",
    ],
    estrategico: [
      "Estruture um PMO ou portfólio de projetos",
      "Desenvolva governance para múltiplos projetos",
      "Mentore gerentes de projeto menos experientes",
      "Crie metodologias adaptadas à sua organização",
      "Lidere programas de transformação complexos",
    ],
  },
  5: {
    fundamentacao: [
      "Desenvolva habilidades de comunicação clara e assertiva",
      "Pratique dar e receber feedback construtivo",
      "Crie relações de confiança com pares e lideranças",
      "Busque entender as motivações das pessoas ao redor",
      "Assuma responsabilidade por suas entregas e erros",
    ],
    consolidacao: [
      "Desenvolva seu estilo de liderança autêntico",
      "Pratique delegação efetiva com acompanhamento",
      "Crie ambiente seguro para inovação e erros",
      "Invista no desenvolvimento das pessoas",
      "Amplie sua rede de influência na organização",
    ],
    estrategico: [
      "Forme e desenvolva novos líderes",
      "Crie cultura de alta performance e accountability",
      "Desenvolva visão inspiradora e comunique-a",
      "Lidere através de outros líderes",
      "Seja mentor de talentos de alto potencial",
    ],
  },
  6: {
    fundamentacao: [
      "Desenvolva curiosidade por novas formas de trabalho",
      "Experimente ferramentas e tecnologias novas regularmente",
      "Crie espaço para questionamentos e ideias diferentes",
      "Aprenda com erros e fracassos sem medo",
      "Busque inspiração fora da sua área de atuação",
    ],
    consolidacao: [
      "Estruture processos para captura e teste de ideias",
      "Desenvolva habilidades de design thinking",
      "Crie protótipos rápidos antes de grandes investimentos",
      "Promova colaboração cross-funcional para inovação",
      "Aprenda metodologias ágeis de experimentação",
    ],
    estrategico: [
      "Lidere a transformação digital na sua área",
      "Crie ecossistema de inovação e parcerias",
      "Desenvolva cultura de experimentação contínua",
      "Implemente IA e automação de forma estratégica",
      "Seja referência em adoção de novas tecnologias",
    ],
  },
};

const ActionPlanPage = () => {
  const [selectedStage, setSelectedStage] = useState<StageKey | "">("");
  const [selectedPillar, setSelectedPillar] = useState<number | "">("");
  const [showPlan, setShowPlan] = useState(false);

  const handleGeneratePlan = () => {
    if (selectedStage && selectedPillar) {
      setShowPlan(true);
    }
  };

  const handleReset = () => {
    setShowPlan(false);
    setSelectedStage("");
    setSelectedPillar("");
  };

  const selectedPillarData = pillars.find(p => p.id === selectedPillar);
  const selectedStageData = stages.find(s => s.key === selectedStage);
  const actions = selectedStage && selectedPillar ? actionsByPillarAndStage[selectedPillar]?.[selectedStage] || [] : [];
  const course = selectedStage && selectedPillar ? getCourseForPillar(selectedPillar as number, selectedStage) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={allevoLogo} alt="Allevo" className="h-8" />
          </Link>
          <div className="text-sm text-muted-foreground">
            Gerador de Plano de Ação
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {!showPlan ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
                >
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Plano Personalizado</span>
                </motion.div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Gerador de Plano de Ação
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Selecione seu nível de maturidade e o pilar que deseja desenvolver para receber um plano de ação personalizado com iniciativas práticas.
                </p>
              </div>

              {/* Selection Form */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Configure seu Plano
                  </CardTitle>
                  <CardDescription>
                    Preencha as informações abaixo para gerar seu plano de desenvolvimento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stage Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="stage" className="text-base font-medium">
                      Qual é seu nível de maturidade?
                    </Label>
                    <Select value={selectedStage} onValueChange={(value) => setSelectedStage(value as StageKey)}>
                      <SelectTrigger id="stage" className="w-full">
                        <SelectValue placeholder="Selecione seu estágio de maturidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.key} value={stage.key}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{stage.label}</span>
                              <span className="text-xs text-muted-foreground">{stage.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pillar Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="pillar" className="text-base font-medium">
                      Qual pilar você quer desenvolver?
                    </Label>
                    <Select value={selectedPillar.toString()} onValueChange={(value) => setSelectedPillar(parseInt(value))}>
                      <SelectTrigger id="pillar" className="w-full">
                        <SelectValue placeholder="Selecione o pilar de desenvolvimento" />
                      </SelectTrigger>
                      <SelectContent>
                        {pillars.map((pillar) => (
                          <SelectItem key={pillar.id} value={pillar.id.toString()}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Pilar {pillar.id} - {pillar.name}</span>
                              <span className="text-xs text-muted-foreground">{pillar.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={!selectedStage || !selectedPillar}
                    className="w-full mt-4"
                    size="lg"
                  >
                    Gerar Plano de Ação
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Info Cards */}
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <Card className="bg-card/30 border-border/30">
                  <CardContent className="pt-6">
                    <Target className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Ações Práticas</h3>
                    <p className="text-sm text-muted-foreground">
                      Iniciativas específicas para seu nível atual
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card/30 border-border/30">
                  <CardContent className="pt-6">
                    <GraduationCap className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Cursos Recomendados</h3>
                    <p className="text-sm text-muted-foreground">
                      Trilha de desenvolvimento alinhada
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card/30 border-border/30">
                  <CardContent className="pt-6">
                    <Sparkles className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Personalizado</h3>
                    <p className="text-sm text-muted-foreground">
                      Baseado no seu estágio e foco
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Result Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4"
                >
                  <CheckCircle2 className="w-8 h-8" />
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  Seu Plano de Ação
                </h1>
                <p className="text-muted-foreground">
                  {selectedStageData?.label} • {selectedPillarData?.name}
                </p>
              </div>

              {/* Stage and Pillar Summary */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nível de Maturidade</p>
                        <p className="font-semibold text-lg">{selectedStageData?.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{selectedStageData?.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pilar em Desenvolvimento</p>
                        <p className="font-semibold text-lg">Pilar {selectedPillar} - {selectedPillarData?.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{selectedPillarData?.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions List */}
              <Card className="bg-card/50 border-border/50 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Iniciativas Recomendadas
                  </CardTitle>
                  <CardDescription>
                    Ações práticas para desenvolver {selectedPillarData?.name.toLowerCase()} no estágio de {selectedStageData?.label.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {actions.map((action, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="text-foreground">{action}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Course Recommendation */}
              {course && (
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Trilha de Desenvolvimento Recomendada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Pilar Allevo: {course.pillarAllevo}
                        </p>
                        <h3 className="text-xl font-semibold text-foreground">{course.name}</h3>
                      </div>
                      <p className="text-muted-foreground">{course.description}</p>
                      {course.url && (
                        <Button variant="outline" className="mt-2" asChild>
                          <a href={course.url} target="_blank" rel="noopener noreferrer">
                            Conhecer Curso
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={handleReset}>
                  Gerar Novo Plano
                </Button>
                <Button asChild>
                  <Link to="/">
                    Fazer Diagnóstico Completo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16 py-8 bg-card/30">
        <div className="container mx-auto px-4 text-center">
          <img src={allevoLogo} alt="Allevo" className="h-6 mx-auto mb-3 opacity-70" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Allevo. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ActionPlanPage;
