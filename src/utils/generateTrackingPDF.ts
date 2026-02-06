import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Stage, Pillar, TrackingTemplateData } from "@/data/trackingTemplateData";

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

interface TrackingPDFData {
  pillar: Pillar;
  stage: Stage;
  template: TrackingTemplateData;
  startDate: Date;
  reviewDate: Date;
  completionDate: Date;
  individualTask: TaskState;
  collectiveTask: TaskState;
  successEvaluation: "achieved" | "partial" | "not_achieved" | null;
}

const getStatusText = (status: TaskStatus): string => {
  switch (status) {
    case "completed": return "Concluído";
    case "in_progress": return "Em andamento";
    default: return "Não iniciado";
  }
};

const getEvaluationText = (evaluation: "achieved" | "partial" | "not_achieved" | null): string => {
  switch (evaluation) {
    case "achieved": return "Atingido";
    case "partial": return "Parcialmente atingido";
    case "not_achieved": return "Não atingido";
    default: return "Pendente";
  }
};

export const generateTrackingPDF = async (data: TrackingPDFData): Promise<void> => {
  const { pillar, stage, template, startDate, reviewDate, completionDate, individualTask, collectiveTask, successEvaluation } = data;
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [233, 30, 99]; // #e91e63
  const darkColor: [number, number, number] = [10, 22, 40]; // #0a1628
  const grayColor: [number, number, number] = [100, 100, 100];
  const greenColor: [number, number, number] = [34, 197, 94];
  const yellowColor: [number, number, number] = [234, 179, 8];
  
  let yPosition = 20;
  const leftMargin = 20;
  const rightMargin = 190;
  const contentWidth = rightMargin - leftMargin;
  
  // Helper function to check page break
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > 270) {
      doc.addPage();
      yPosition = 20;
    }
  };
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text("Template de Acompanhamento", leftMargin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(...grayColor);
  doc.text("Allevo | Diagnóstico de Maturidade", leftMargin, yPosition);
  yPosition += 15;
  
  // Divider line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPosition, rightMargin, yPosition);
  yPosition += 15;
  
  // Pillar and Stage Info
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(`${pillar.name} — ${stage.label}`, leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`Nível de Maturidade: ${stage.range}`, leftMargin, yPosition);
  yPosition += 15;
  
  // Timeline
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Linha do Tempo", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Início: ${format(startDate, "dd/MM/yyyy", { locale: ptBR })}`, leftMargin, yPosition);
  yPosition += 6;
  doc.setTextColor(...yellowColor);
  doc.text(`Revisão: ${format(reviewDate, "dd/MM/yyyy", { locale: ptBR })} (${template.prazoRevisao} dias)`, leftMargin, yPosition);
  yPosition += 6;
  doc.setTextColor(...greenColor);
  doc.text(`Conclusão: ${format(completionDate, "dd/MM/yyyy", { locale: ptBR })} (${template.prazoSugerido} dias)`, leftMargin, yPosition);
  yPosition += 15;
  
  // Objective
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Objetivo", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  const objetivoLines = doc.splitTextToSize(template.acaoGeral, contentWidth);
  doc.text(objetivoLines, leftMargin, yPosition);
  yPosition += objetivoLines.length * 5 + 12;
  
  // Phase 1: Individual Actions
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Fase 1 — Ações Individuais", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Prazo: Até ${format(reviewDate, "dd/MM/yyyy", { locale: ptBR })} (${template.prazoRevisao} dias)`, leftMargin, yPosition);
  yPosition += 6;
  doc.text(`Status: ${getStatusText(individualTask.status)}`, leftMargin, yPosition);
  yPosition += 8;
  
  doc.setTextColor(...darkColor);
  const checkboxSymbol = individualTask.status === "completed" ? "[X]" : "[ ]";
  const individualLines = doc.splitTextToSize(`${checkboxSymbol} ${template.acaoIndividual}`, contentWidth);
  doc.text(individualLines, leftMargin, yPosition);
  yPosition += individualLines.length * 5 + 6;
  
  // Individual Subtasks
  if (individualTask.subtasks.length > 0) {
    doc.setFontSize(9);
    doc.text("Subtarefas:", leftMargin + 5, yPosition);
    yPosition += 5;
    individualTask.subtasks.forEach((subtask) => {
      checkPageBreak(10);
      const subtaskSymbol = subtask.status === "completed" ? "[X]" : subtask.status === "in_progress" ? "[~]" : "[ ]";
      const subtaskLines = doc.splitTextToSize(`${subtaskSymbol} ${subtask.text}`, contentWidth - 10);
      doc.text(subtaskLines, leftMargin + 10, yPosition);
      yPosition += subtaskLines.length * 4 + 2;
    });
  }
  yPosition += 8;
  
  // Phase 2: Collective Actions
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Fase 2 — Ações Coletivas", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Prazo: De ${format(reviewDate, "dd/MM/yyyy", { locale: ptBR })} até ${format(completionDate, "dd/MM/yyyy", { locale: ptBR })}`, leftMargin, yPosition);
  yPosition += 6;
  doc.text(`Status: ${getStatusText(collectiveTask.status)}`, leftMargin, yPosition);
  yPosition += 8;
  
  doc.setTextColor(...darkColor);
  const collectiveCheckbox = collectiveTask.status === "completed" ? "[X]" : "[ ]";
  const collectiveLines = doc.splitTextToSize(`${collectiveCheckbox} ${template.acaoColetiva}`, contentWidth);
  doc.text(collectiveLines, leftMargin, yPosition);
  yPosition += collectiveLines.length * 5 + 6;
  
  // Collective Subtasks
  if (collectiveTask.subtasks.length > 0) {
    doc.setFontSize(9);
    doc.text("Subtarefas:", leftMargin + 5, yPosition);
    yPosition += 5;
    collectiveTask.subtasks.forEach((subtask) => {
      checkPageBreak(10);
      const subtaskSymbol = subtask.status === "completed" ? "[X]" : subtask.status === "in_progress" ? "[~]" : "[ ]";
      const subtaskLines = doc.splitTextToSize(`${subtaskSymbol} ${subtask.text}`, contentWidth - 10);
      doc.text(subtaskLines, leftMargin + 10, yPosition);
      yPosition += subtaskLines.length * 4 + 2;
    });
  }
  yPosition += 8;
  
  // Success Indicator
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Indicador de Sucesso", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  const indicadorLines = doc.splitTextToSize(template.indicadorSucesso, contentWidth);
  doc.text(indicadorLines, leftMargin, yPosition);
  yPosition += indicadorLines.length * 5 + 6;
  
  doc.setTextColor(...grayColor);
  doc.text(`Autoavaliação: ${getEvaluationText(successEvaluation)}`, leftMargin, yPosition);
  yPosition += 12;
  
  // Recommended Course
  checkPageBreak(25);
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Trilha Recomendada", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Curso ${template.cursoCode}: ${template.curso}`, leftMargin, yPosition);
  yPosition += 20;
  
  // Footer divider
  checkPageBreak(30);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, yPosition, rightMargin, yPosition);
  yPosition += 10;
  
  // Footer message
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "italic");
  const footerText = "Quer acelerar seu desenvolvimento? Fale com um consultor Allevo e descubra como podemos ajudar você a alcançar a Alta Performance em Execução.";
  const footerLines = doc.splitTextToSize(footerText, contentWidth);
  doc.text(footerLines, leftMargin, yPosition);
  
  // Page footer
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("© Allevo - Todos os direitos reservados", leftMargin, 285);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, rightMargin - 40, 285);
  
  // Save the PDF
  const fileName = `Acompanhamento - ${pillar.name} - ${stage.label}.pdf`;
  doc.save(fileName);
};
