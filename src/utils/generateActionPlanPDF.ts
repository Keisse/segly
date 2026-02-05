import { jsPDF } from "jspdf";
import type { Stage, Pillar, ActionPlanRecommendation } from "@/data/actionPlanData";

interface ActionPlanPDFData {
  stage: Stage;
  pillar: Pillar;
  recommendation: ActionPlanRecommendation;
}

export const generateActionPlanPDF = (data: ActionPlanPDFData) => {
  const { stage, pillar, recommendation } = data;
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [233, 30, 99]; // #e91e63
  const darkColor: [number, number, number] = [10, 22, 40]; // #0a1628
  const grayColor: [number, number, number] = [100, 100, 100];
  
  let yPosition = 20;
  const leftMargin = 20;
  const rightMargin = 190;
  const contentWidth = rightMargin - leftMargin;
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text("Plano de Ação", leftMargin, yPosition);
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
  
  // Stage and Pillar Info
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
  
  // Section: Onde você está
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Onde você está", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  const interpretacaoLines = doc.splitTextToSize(recommendation.interpretacao, contentWidth);
  doc.text(interpretacaoLines, leftMargin, yPosition);
  yPosition += interpretacaoLines.length * 5 + 10;
  
  // Section: O que fazer
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("O que fazer", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  const acaoLines = doc.splitTextToSize(recommendation.acao, contentWidth);
  doc.text(acaoLines, leftMargin, yPosition);
  yPosition += acaoLines.length * 5 + 10;
  
  // Section: Prazo sugerido
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Prazo sugerido", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(recommendation.prazo, leftMargin, yPosition);
  yPosition += 12;
  
  // Section: Indicador de sucesso
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Indicador de sucesso", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  const indicadorLines = doc.splitTextToSize(recommendation.indicador, contentWidth);
  doc.text(indicadorLines, leftMargin, yPosition);
  yPosition += indicadorLines.length * 5 + 10;
  
  // Section: Leitura recomendada
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Leitura recomendada", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`${recommendation.livro.titulo}, de ${recommendation.livro.autor}`, leftMargin, yPosition);
  yPosition += 12;
  
  // Section: Curso recomendado
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Trilha de desenvolvimento recomendada", leftMargin, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`Curso ${recommendation.cursoCode}: ${recommendation.curso}`, leftMargin, yPosition);
  yPosition += 20;
  
  // Footer divider
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
  const fileName = `Plano de Ação - ${pillar.name} - ${stage.label}.pdf`;
  doc.save(fileName);
};
