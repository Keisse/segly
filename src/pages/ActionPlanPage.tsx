import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, Download, MessageCircle, Clock, TrendingUp, BookOpen, MapPin } from "lucide-react";
import { stages, pillars, planosDeAcao, type StageKey } from "@/data/planosDeAcao";
import { generateActionPlanPDF } from "@/utils/generateActionPlanPDF";
import allevoLogo from "@/assets/allevo-logo.png";
import { Link } from "react-router-dom";
const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511917510567&text=Ol%C3%A1,%20vim%20do%20plano%20de%20a%C3%A7%C3%A3o,%20e%20gostaria%20de%20falar%20com%20um%20consultor.";
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
  };
  const handleDownloadPDF = () => {
    if (!selectedStage || !selectedPillar) return;
    const stage = stages.find(s => s.key === selectedStage);
    const pillar = pillars.find(p => p.id === selectedPillar);
    const plano = planosDeAcao[selectedPillar]?.[selectedStage];
    if (stage && pillar && plano) {
      generateActionPlanPDF({
        stage,
        pillar,
        plano
      });
    }
  };
  const selectedPillarData = pillars.find(p => p.id === selectedPillar);
  const selectedStageData = stages.find(s => s.key === selectedStage);
  const plano = selectedStage && selectedPillar ? planosDeAcao[selectedPillar]?.[selectedStage] : null;
  const PillarIcon = selectedPillarData?.icon || Target;
  return <div className="min-h-screen bg-background">
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
          {!showPlan ? <motion.div key="form" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} transition={{
          duration: 0.3
        }}>
              {/* Hero Section */}
              <div className="text-center mb-12">
                <motion.div initial={{
              scale: 0.9,
              opacity: 0
            }} animate={{
              scale: 1,
              opacity: 1
            }} transition={{
              delay: 0.1
            }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Plano Personalizado</span>
                </motion.div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Gere seu Plano de Ação
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Selecione seu nível de maturidade e o pilar que deseja desenvolver
                </p>
              </div>

              {/* Selection Form */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    
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
                      Seu nível de maturidade
                    </Label>
                    <Select value={selectedStage} onValueChange={value => setSelectedStage(value as StageKey)}>
                      <SelectTrigger id="stage" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => <SelectItem key={stage.key} value={stage.key}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{stage.label} ({stage.range})</span>
                              <span className="text-xs text-muted-foreground">{stage.description}</span>
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pillar Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="pillar" className="text-base font-medium">
                      Pilar para desenvolver
                    </Label>
                    <Select value={selectedPillar.toString()} onValueChange={value => setSelectedPillar(parseInt(value))}>
                      <SelectTrigger id="pillar" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {pillars.map(pillar => {
                      const Icon = pillar.icon;
                      return <SelectItem key={pillar.id} value={pillar.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-primary" />
                                <span className="font-medium">{pillar.name}</span>
                              </div>
                            </SelectItem>;
                    })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <Button onClick={handleGeneratePlan} disabled={!selectedStage || !selectedPillar} className="w-full mt-4" size="lg">
                    Gerar Plano de Ação
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Info Cards */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    O que você vai receber?
                  </CardTitle>
                  <CardDescription>
                    Veja o que o plano de ação inclui
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-card/30 border-border/30">
                      <CardContent className="pt-6">
                        <MapPin className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">Diagnóstico Preciso</h3>
                        <p className="text-sm text-muted-foreground">
                          Entenda exatamente onde você está
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/30 border-border/30">
                      <CardContent className="pt-6">
                        <Target className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">Ações Claras</h3>
                        <p className="text-sm text-muted-foreground">
                          Saiba exatamente o que fazer
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/30 border-border/30">
                      <CardContent className="pt-6">
                        <BookOpen className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">Trilha Recomendada</h3>
                        <p className="text-sm text-muted-foreground">
                          Cursos alinhados ao seu momento
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </motion.div> : <motion.div key="result" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} transition={{
          duration: 0.3
        }}>
              {/* Result Header */}
              <div className="text-center mb-8">
                <motion.div initial={{
              scale: 0
            }} animate={{
              scale: 1
            }} transition={{
              type: "spring",
              delay: 0.2
            }} className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4">
                  <PillarIcon className="w-8 h-8" />
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {selectedPillarData?.name} — {selectedStageData?.label}
                </h1>
                <Badge variant="secondary" className="text-sm">
                  Nível de Maturidade: {selectedStageData?.range}
                </Badge>
              </div>

              {/* Main Result Card */}
              {plano && <Card className="bg-card/50 border-border/50 mb-6">
                  <CardContent className="pt-6 space-y-6">
                    {/* Onde você está */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg">Onde você está</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pl-7">
                        {plano.interpretacao}
                      </p>
                    </div>

                    {/* Ação sugerida */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg">Ação sugerida</h3>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-4 ml-7 space-y-4">
                        <p className="text-foreground font-medium">
                          {plano.acao_geral}
                        </p>
                        
                        {/* Na empresa */}
                        <div className="pt-3 border-t border-primary/20 space-y-3">
                          <p className="text-sm font-semibold text-primary">Na empresa:</p>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                              <p className="text-xs font-medium text-muted-foreground mb-1">A nível individual</p>
                              <p className="text-sm text-foreground">{plano.acao_individual}</p>
                            </div>
                            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                              <p className="text-xs font-medium text-muted-foreground mb-1">A nível coletivo</p>
                              <p className="text-sm text-foreground">{plano.acao_coletiva}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prazo e Prazo de Revisão */}
                    <div className="grid md:grid-cols-2 gap-4 pl-7">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Prazo sugerido</span>
                        </div>
                        <p className="text-foreground bg-card/80 rounded-lg px-4 py-2 border border-border/50">
                          {plano.prazo_sugerido} dias
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Prazo de revisão</span>
                        </div>
                        <p className="text-foreground bg-card/80 rounded-lg px-4 py-2 border border-border/50">
                          {plano.prazo_revisao} dias
                        </p>
                      </div>
                    </div>

                    {/* Indicador de sucesso */}
                    <div className="space-y-2 pl-7">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Indicador de sucesso</span>
                      </div>
                      <p className="text-muted-foreground text-sm bg-card/80 rounded-lg px-4 py-3 border border-border/50 leading-relaxed">
                        {plano.indicador_sucesso}
                      </p>
                    </div>
                  </CardContent>
                </Card>}

              {/* Course Recommendation */}
              {plano && <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Trilha de Desenvolvimento Recomendada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="text-sm px-3 py-1">
                        {plano.curso_codigo}
                      </Badge>
                      <span className="text-lg font-medium text-foreground">
                        Curso {plano.curso_nome}
                      </span>
                    </div>
                  </CardContent>
                </Card>}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar em PDF
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Ver outro pilar
                </Button>
                <Button asChild variant="default" className="bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,30%)]">
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar com um Consultor
                  </a>
                </Button>
              </div>

              {/* Link to full diagnostic */}
              <div className="text-center mt-8">
                <p className="text-muted-foreground text-sm mb-2">
                  Quer um diagnóstico completo da sua maturidade?
                </p>
                <Button variant="link" asChild className="text-primary">
                  <Link to="/">
                    Fazer Diagnóstico Completo
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>}
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
    </div>;
};
export default ActionPlanPage;