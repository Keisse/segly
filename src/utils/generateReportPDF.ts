import { jsPDF } from "jspdf";
import type { MaturityStage } from "@/data/diagnosticQuestions";
import type { LeadData } from "@/components/LeadCaptureForm";
import { getPillarInterpretation, getStageKeyFromPercentage } from "@/data/pillarInterpretations";
import { getCourseForPillar } from "@/data/allevoCourses";

interface PillarScore {
  pillarId: number;
  pillarName: string;
  icon: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface ReportData {
  totalScore: number;
  maxScore: number;
  percentage: number;
  stage: MaturityStage;
  pillarScores: PillarScore[];
  leadData: LeadData;
}

const getStageName = (stageKey: string): string => {
  switch (stageKey) {
    case "fundamentacao": return "Fundamentação";
    case "consolidacao": return "Consolidação";
    case "estrategico": return "Estratégico";
    default: return stageKey;
  }
};

export const generateReportPDF = (data: ReportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [236, 72, 153]; // Pink/magenta
  const darkColor: [number, number, number] = [30, 41, 59]; // Dark navy
  const grayColor: [number, number, number] = [100, 116, 139];

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnóstico de Execução", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("de Alta Performance", pageWidth / 2, 28, { align: "center" });
  
  // Allevo branding
  doc.setFontSize(10);
  doc.text("Powered by Allevo for Business", pageWidth / 2, 36, { align: "center" });

  yPos = 55;

  // Date and user info
  doc.setTextColor(...grayColor);
  doc.setFontSize(10);
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  doc.text(`Data: ${currentDate}`, margin, yPos);
  yPos += 8;

  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Participante: ${data.leadData.nome}`, margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Empresa: ${data.leadData.empresa}`, margin, yPos);
  yPos += 5;
  doc.text(`Cargo: ${data.leadData.cargo} | Departamento: ${data.leadData.departamento}`, margin, yPos);
  yPos += 5;
  doc.text(`Porte: ${data.leadData.porte}`, margin, yPos);
  yPos += 15;

  // Overall Score Section
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, "F");
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resultado Geral", margin + 10, yPos + 12);
  
  doc.setFontSize(28);
  doc.text(`${Math.round(data.percentage)}%`, pageWidth - margin - 10, yPos + 20, { align: "right" });
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.totalScore} de ${data.maxScore} pontos`, margin + 10, yPos + 22);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Estágio: ${data.stage.name}`, margin + 10, yPos + 30);
  
  yPos += 45;

  // Pillar Results
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Análise por Pilar", margin, yPos);
  yPos += 10;

  data.pillarScores.forEach((pillar) => {
    checkPageBreak(45);
    
    const stageKey = getStageKeyFromPercentage(pillar.percentage);
    const interpretation = getPillarInterpretation(pillar.pillarId, stageKey, data.leadData);
    const course = getCourseForPillar(pillar.pillarId, stageKey);

    // Pillar header
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 40, 2, 2, "F");
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${pillar.icon} ${pillar.pillarName}`, margin + 5, yPos + 8);
    
    doc.setTextColor(...grayColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${pillar.score}/${pillar.maxScore} pontos (${Math.round(pillar.percentage)}%) - ${getStageName(stageKey)}`, margin + 5, yPos + 16);

    // Progress bar
    const barWidth = contentWidth - 10;
    const barHeight = 4;
    const barY = yPos + 20;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 5, barY, barWidth, barHeight, 1, 1, "F");
    
    const progressWidth = (pillar.percentage / 100) * barWidth;
    if (stageKey === "fundamentacao") {
      doc.setFillColor(245, 158, 11); // Amber
    } else if (stageKey === "consolidacao") {
      doc.setFillColor(59, 130, 246); // Blue
    } else {
      doc.setFillColor(16, 185, 129); // Emerald
    }
    doc.roundedRect(margin + 5, barY, progressWidth, barHeight, 1, 1, "F");

    // Interpretation (truncated)
    doc.setTextColor(...darkColor);
    doc.setFontSize(8);
    const interpretationText = interpretation.interpretation.substring(0, 150) + (interpretation.interpretation.length > 150 ? "..." : "");
    const splitInterpretation = doc.splitTextToSize(interpretationText, contentWidth - 10);
    doc.text(splitInterpretation, margin + 5, yPos + 30);

    yPos += 48;
  });

  // Development Track
  checkPageBreak(60);
  yPos += 5;
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Trilha de Desenvolvimento Recomendada", margin, yPos);
  yPos += 10;

  const uniqueCourses = data.pillarScores
    .map(pillar => {
      const stageKey = getStageKeyFromPercentage(pillar.percentage);
      return getCourseForPillar(pillar.pillarId, stageKey);
    })
    .filter((course, index, self) => 
      course && self.findIndex(c => c?.id === course.id) === index
    );

  uniqueCourses.forEach((course, index) => {
    if (course) {
      checkPageBreak(15);
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${course.name}`, margin + 5, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text(`Estágio: ${getStageName(course.stage)}`, margin + 10, yPos);
      yPos += 8;
    }
  });

  // Footer CTA
  checkPageBreak(30);
  yPos += 10;
  
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Quer acelerar sua evolução?", pageWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Acesse allevoforbusiness.com e fale com um especialista", pageWidth / 2, yPos + 18, { align: "center" });

  // Save the PDF
  const fileName = `diagnostico-allevo-${data.leadData.nome.split(" ")[0].toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
