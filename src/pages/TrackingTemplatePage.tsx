import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  FileSpreadsheet,
  Target,
  Clock,
  TrendingUp,
  GraduationCap,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { stages, pillars, planosDeAcao, StageKey } from "@/data/planosDeAcao";
import alevoLogo from "@/assets/allevo-logo.png";

type TaskStatus = "not_started" | "in_progress" | "completed";

interface SubTask {
  id: string;
  text: string;
  status: TaskStatus;
}

interface TaskState {
  status: TaskStatus;
  subtasks: SubTask[];
}

const TrackingTemplatePage = () => {
  const [selectedStage, setSelectedStage] = useState<StageKey | "">("");
  const [selectedPillar, setSelectedPillar] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [individualTask, setIndividualTask] = useState<TaskState>({
    status: "not_started",
    subtasks: [],
  });
  const [collectiveTask, setCollectiveTask] = useState<TaskState>({
    status: "not_started",
    subtasks: [],
  });
  const [successEvaluation, setSuccessEvaluation] = useState<"achieved" | "partial" | "not_achieved" | null>(null);
  const [newSubtaskIndividual, setNewSubtaskIndividual] = useState("");
  const [newSubtaskCollective, setNewSubtaskCollective] = useState("");

  const templateData = useMemo(() => {
    if (!selectedStage || !selectedPillar) return null;
    return planosDeAcao[selectedPillar]?.[selectedStage] || null;
  }, [selectedStage, selectedPillar]);

  const calculatedDates = useMemo(() => {
    if (!templateData) return null;
    const reviewDate = addDays(startDate, templateData.prazo_revisao);
    const completionDate = addDays(startDate, templateData.prazo_sugerido);
    return { reviewDate, completionDate };
  }, [startDate, templateData]);

  const selectedPillarData = useMemo(() => {
    return pillars.find(p => p.id === selectedPillar);
  }, [selectedPillar]);

  const selectedStageData = useMemo(() => {
    return stages.find(s => s.key === selectedStage);
  }, [selectedStage]);

  const handleGenerate = () => {
    if (!selectedStage || !selectedPillar) return;
    setIsGenerated(true);
    setIndividualTask({ status: "not_started", subtasks: [] });
    setCollectiveTask({ status: "not_started", subtasks: [] });
    setSuccessEvaluation(null);
  };

  const handleReset = () => {
    setIsGenerated(false);
    setSelectedStage("");
    setSelectedPillar(null);
    setStartDate(new Date());
  };

  const handleExportExcel = () => {
    if (!templateData || !calculatedDates || !selectedPillarData || !selectedStageData) return;

    setIsGeneratingPDF(true);
    
    try {
      const getStatusText = (status: TaskStatus): string => {
        switch (status) {
          case "completed": return "✓ Concluído";
          case "in_progress": return "↻ Em andamento";
          default: return "○ Não iniciado";
        }
      };

      const getEvaluationText = (): string => {
        switch (successEvaluation) {
          case "achieved": return "✓ Atingido";
          case "partial": return "~ Parcialmente atingido";
          case "not_achieved": return "✗ Não atingido";
          default: return "(Pendente)";
        }
      };

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Main data for the sheet
      const mainData = [
        ["TEMPLATE DE ACOMPANHAMENTO DA EXECUÇÃO"],
        [""],
        ["Pilar", selectedPillarData.name],
        ["Nível de Maturidade", `${selectedStageData.label} (${selectedStageData.range})`],
        [""],
        ["LINHA DO TEMPO"],
        ["Data de Início", format(startDate, "dd/MM/yyyy", { locale: ptBR })],
        ["Data de Revisão", `${format(calculatedDates.reviewDate, "dd/MM/yyyy", { locale: ptBR })} (${templateData.prazo_revisao} dias)`],
        ["Data de Conclusão", `${format(calculatedDates.completionDate, "dd/MM/yyyy", { locale: ptBR })} (${templateData.prazo_sugerido} dias)`],
        [""],
        ["OBJETIVO"],
        ["", templateData.acao_geral],
        [""],
        ["FASE 1 — AÇÕES INDIVIDUAIS"],
        ["Prazo", `Até ${format(calculatedDates.reviewDate, "dd/MM/yyyy", { locale: ptBR })} (${templateData.prazo_revisao} dias)`],
        ["Status", getStatusText(individualTask.status)],
        ["Ação Principal", templateData.acao_individual],
        [""],
        ["Subtarefas Individuais", "Status"],
        ...individualTask.subtasks.map(st => [st.text, getStatusText(st.status)]),
        ...(individualTask.subtasks.length === 0 ? [["(Nenhuma subtarefa adicionada)", ""]] : []),
        [""],
        ["FASE 2 — AÇÕES COLETIVAS"],
        ["Prazo", `De ${format(calculatedDates.reviewDate, "dd/MM/yyyy", { locale: ptBR })} até ${format(calculatedDates.completionDate, "dd/MM/yyyy", { locale: ptBR })}`],
        ["Status", getStatusText(collectiveTask.status)],
        ["Ação Principal", templateData.acao_coletiva],
        [""],
        ["Subtarefas Coletivas", "Status"],
        ...collectiveTask.subtasks.map(st => [st.text, getStatusText(st.status)]),
        ...(collectiveTask.subtasks.length === 0 ? [["(Nenhuma subtarefa adicionada)", ""]] : []),
        [""],
        ["INDICADOR DE SUCESSO"],
        ["", templateData.indicador_sucesso],
        ["Autoavaliação", getEvaluationText()],
        [""],
        ["TRILHA RECOMENDADA"],
        ["Curso", `${templateData.curso_codigo}: ${templateData.curso_nome}`],
        [""],
        [""],
        ["Gerado pelo Diagnóstico de Alta Performance — Allevo For Business", format(new Date(), "dd/MM/yyyy", { locale: ptBR })],
      ];

      const ws = XLSX.utils.aoa_to_sheet(mainData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 },
        { wch: 80 },
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Acompanhamento");

      // Generate filename
      const fileName = `Acompanhamento - ${selectedPillarData.name} - ${selectedStageData.label}.xls`;

      // Download the file
      XLSX.writeFile(wb, fileName);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const addSubtask = (type: "individual" | "collective") => {
    const text = type === "individual" ? newSubtaskIndividual : newSubtaskCollective;
    if (!text.trim()) return;

    const newSubtask: SubTask = {
      id: Date.now().toString(),
      text: text.trim(),
      status: "not_started",
    };

    if (type === "individual") {
      setIndividualTask(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, newSubtask],
      }));
      setNewSubtaskIndividual("");
    } else {
      setCollectiveTask(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, newSubtask],
      }));
      setNewSubtaskCollective("");
    }
  };

  const updateSubtaskStatus = (type: "individual" | "collective", subtaskId: string, status: TaskStatus) => {
    const setter = type === "individual" ? setIndividualTask : setCollectiveTask;
    setter(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st =>
        st.id === subtaskId ? { ...st, status } : st
      ),
    }));
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluído</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Em andamento</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-border">Não iniciado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={alevoLogo} alt="Allevo" className="h-10 mx-auto mb-6" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Template de <span className="text-primary">Acompanhamento</span>
          </h1>
          <p className="text-muted-foreground">
            Gere seu checklist dinâmico com prazos calculados automaticamente
          </p>
        </div>

        {!isGenerated ? (
          /* Form Section */
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Configure seu Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nível de Maturidade */}
              <div className="space-y-2">
                <Label>Nível de Maturidade</Label>
                <Select value={selectedStage} onValueChange={(value) => setSelectedStage(value as StageKey)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.key} value={stage.key}>
                        {stage.label} ({stage.range})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pilar */}
              <div className="space-y-2">
                <Label>Pilar</Label>
                <Select 
                  value={selectedPillar?.toString() || ""} 
                  onValueChange={(value) => setSelectedPillar(Number(value))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione o pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.id.toString()}>
                        {pillar.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data de Início */}
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background/50",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                onClick={handleGenerate} 
                className="w-full"
                disabled={!selectedStage || !selectedPillar}
              >
                Gerar Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : templateData && calculatedDates && selectedPillarData && selectedStageData ? (
          /* Generated Template */
          <div className="space-y-6">
            {/* Template Header */}
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                    <selectedPillarData.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedPillarData.name}</h2>
                    <p className="text-muted-foreground text-sm">{selectedStageData.label}</p>
                  </div>
                  <Badge className="ml-auto bg-primary/20 text-primary border-primary/30">
                    {selectedStageData.range}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="flex items-center justify-between gap-2 mt-6 p-4 bg-background/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Início</div>
                    <div className="font-semibold text-sm">{format(startDate, "dd/MM/yyyy")}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Revisão</div>
                    <div className="font-semibold text-sm text-amber-400">
                      {format(calculatedDates.reviewDate, "dd/MM/yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">{templateData.prazo_revisao} dias</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Conclusão</div>
                    <div className="font-semibold text-sm text-emerald-400">
                      {format(calculatedDates.completionDate, "dd/MM/yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">{templateData.prazo_sugerido} dias</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Objetivo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium">Objetivo</span>
                  </div>
                  <p className="text-muted-foreground bg-primary/5 rounded-lg p-4 border border-primary/20">
                    {templateData.acao_geral}
                  </p>
                </div>

                {/* Fase 1: Ações Individuais */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-primary" />
                      <span className="font-medium">Fase 1 — Ações Individuais</span>
                    </div>
                    {getStatusBadge(individualTask.status)}
                  </div>
                  
                  <div className="bg-card/80 rounded-lg p-4 border border-border/50 space-y-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Até {format(calculatedDates.reviewDate, "dd/MM/yyyy")} ({templateData.prazo_revisao} dias)
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={individualTask.status === "completed"}
                        onCheckedChange={(checked) => 
                          setIndividualTask(prev => ({ 
                            ...prev, 
                            status: checked ? "completed" : prev.subtasks.length > 0 ? "in_progress" : "not_started" 
                          }))
                        }
                      />
                      <span className="text-sm">{templateData.acao_individual}</span>
                    </div>

                    {/* Subtasks */}
                    <div className="pl-6 space-y-2">
                      <div className="text-xs text-muted-foreground">Subtarefas:</div>
                      {individualTask.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          <span className={cn("text-sm flex-1", subtask.status === "completed" && "line-through text-muted-foreground")}>
                            {subtask.text}
                          </span>
                          <Select 
                            value={subtask.status} 
                            onValueChange={(value) => updateSubtaskStatus("individual", subtask.id, value as TaskStatus)}
                          >
                            <SelectTrigger className="w-36 h-7 text-xs bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Não iniciado</SelectItem>
                              <SelectItem value="in_progress">Em andamento</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Adicionar subtarefa..."
                          value={newSubtaskIndividual}
                          onChange={(e) => setNewSubtaskIndividual(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addSubtask("individual")}
                          className="flex-1 bg-background/50 border border-border rounded px-2 py-1 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={() => addSubtask("individual")}>
                          +
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Fase 2: Ações Coletivas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">Fase 2 — Ações Coletivas</span>
                    </div>
                    {getStatusBadge(collectiveTask.status)}
                  </div>
                  
                  <div className="bg-card/80 rounded-lg p-4 border border-border/50 space-y-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      De {format(calculatedDates.reviewDate, "dd/MM/yyyy")} até {format(calculatedDates.completionDate, "dd/MM/yyyy")}
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={collectiveTask.status === "completed"}
                        onCheckedChange={(checked) => 
                          setCollectiveTask(prev => ({ 
                            ...prev, 
                            status: checked ? "completed" : prev.subtasks.length > 0 ? "in_progress" : "not_started" 
                          }))
                        }
                      />
                      <span className="text-sm">{templateData.acao_coletiva}</span>
                    </div>

                    {/* Subtasks */}
                    <div className="pl-6 space-y-2">
                      <div className="text-xs text-muted-foreground">Subtarefas:</div>
                      {collectiveTask.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          <span className={cn("text-sm flex-1", subtask.status === "completed" && "line-through text-muted-foreground")}>
                            {subtask.text}
                          </span>
                          <Select 
                            value={subtask.status} 
                            onValueChange={(value) => updateSubtaskStatus("collective", subtask.id, value as TaskStatus)}
                          >
                            <SelectTrigger className="w-36 h-7 text-xs bg-background/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Não iniciado</SelectItem>
                              <SelectItem value="in_progress">Em andamento</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Adicionar subtarefa..."
                          value={newSubtaskCollective}
                          onChange={(e) => setNewSubtaskCollective(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addSubtask("collective")}
                          className="flex-1 bg-background/50 border border-border rounded px-2 py-1 text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={() => addSubtask("collective")}>
                          +
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Indicador de Sucesso */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-medium">Indicador de Sucesso</span>
                  </div>
                  
                  <div className="bg-card/80 rounded-lg p-4 border border-border/50 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {templateData.indicador_sucesso}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Autoavaliação:</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={successEvaluation === "achieved" ? "default" : "outline"}
                          onClick={() => setSuccessEvaluation("achieved")}
                          className={cn(
                            successEvaluation === "achieved" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          ✅ Atingido
                        </Button>
                        <Button
                          size="sm"
                          variant={successEvaluation === "partial" ? "default" : "outline"}
                          onClick={() => setSuccessEvaluation("partial")}
                          className={cn(
                            successEvaluation === "partial" && "bg-amber-600 hover:bg-amber-700 text-white"
                          )}
                        >
                          ⚠️ Parcialmente
                        </Button>
                        <Button
                          size="sm"
                          variant={successEvaluation === "not_achieved" ? "default" : "outline"}
                          onClick={() => setSuccessEvaluation("not_achieved")}
                          className={cn(
                            successEvaluation === "not_achieved" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          )}
                        >
                          ❌ Não atingido
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trilha Recomendada */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="font-medium">Trilha Recomendada</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                    Curso {templateData.curso_codigo}: {templateData.curso_nome}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleExportExcel} variant="outline" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                Baixar em .xls
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Ver outro pilar
              </Button>
            </div>

            {/* Back Link */}
            <div className="text-center">
              <Link to="/plano-acao" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Gerador de Plano de Ação
              </Link>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-border/30">
          <img src={alevoLogo} alt="Allevo" className="h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Allevo For Business. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrackingTemplatePage;
