export interface Question {
  id: number;
  text: string;
  pillar: number;
}

export interface Pillar {
  id: number;
  name: string;
  icon: string;
  questions: Question[];
}

export const pillars: Pillar[] = [
  {
    id: 1,
    name: "Pensamento Estratégico",
    icon: "🎯",
    questions: [
      { id: 1, text: "Consigo explicar claramente o propósito do meu trabalho e como ele contribui para algo maior.", pillar: 1 },
      { id: 2, text: "Consigo identificar os fatores-chave que impactam o sucesso da minha área.", pillar: 1 },
      { id: 3, text: "Penso nos cenários futuros e me preparo para diferentes possibilidades.", pillar: 1 },
      { id: 4, text: "Consigo conectar minhas ações diárias com a estratégia maior da organização.", pillar: 1 },
      { id: 5, text: "Analiso dados e informações antes de tomar decisões importantes.", pillar: 1 },
    ],
  },
  {
    id: 2,
    name: "Execução e Disciplina Pessoal",
    icon: "⚡",
    questions: [
      { id: 6, text: "Estabeleço planos claros com metas, prazos e responsáveis bem definidos.", pillar: 2 },
      { id: 7, text: "Acompanho regularmente o progresso das minhas iniciativas e ajusto quando necessário.", pillar: 2 },
      { id: 8, text: "Mantenho a disciplina para executar o que foi planejado, mesmo quando surgem distrações.", pillar: 2 },
      { id: 9, text: "Consigo priorizar o que é realmente importante e digo \"não\" ao que não agrega.", pillar: 2 },
      { id: 10, text: "Celebro pequenas vitórias e aprendo com os desvios do plano.", pillar: 2 },
    ],
  },
  {
    id: 3,
    name: "Execução e Eficiência Corporativa",
    icon: "🏢",
    questions: [
      { id: 11, text: "A maioria dos projetos entrega no prazo prometido (ou replaneja cedo, sem \"surpresa\" no final).", pillar: 3 },
      { id: 12, text: "As entregas do projeto acontecem em cadência (semanal/quinzenal) e não ficam longos períodos sem avanço visível.", pillar: 3 },
      { id: 13, text: "Impedimentos são registrados, têm dono e são removidos rapidamente (em dias, não em semanas).", pillar: 3 },
      { id: 14, text: "Existe cobrança e prestação de contas real: cada entrega tem responsável, data e evidência do que foi concluído.", pillar: 3 },
      { id: 15, text: "O time consegue manter foco: projetos raramente travam por mudanças constantes de prioridade ou novas urgências.", pillar: 3 },
    ],
  },
  {
    id: 4,
    name: "Gestão de Projetos",
    icon: "📊",
    questions: [
      { id: 16, text: "Transformo ideias e objetivos em projetos com escopo, prazo e orçamento bem definidos.", pillar: 4 },
      { id: 17, text: "Consigo identificar e gerenciar os riscos de um projeto ou iniciativa para evitar impactos negativos.", pillar: 4 },
      { id: 18, text: "Utilizo ferramentas e rituais para acompanhar o progresso e garantir a visibilidade dos projetos e iniciativas que atuo.", pillar: 4 },
      { id: 19, text: "Sou eficaz em comunicar o status do projeto e em engajar a equipe e os stakeholders.", pillar: 4 },
      { id: 20, text: "Ao final de um projeto, celebro os resultados e documento as lições aprendidas para o futuro.", pillar: 4 },
    ],
  },
  {
    id: 5,
    name: "Liderança e Influência",
    icon: "👥",
    questions: [
      { id: 21, text: "Meu estilo de liderança inspira confiança e motiva as pessoas a darem o melhor de si.", pillar: 5 },
      { id: 22, text: "Consigo influenciar as pessoas a darem o melhor de si, mesmo sem autoridade formal.", pillar: 5 },
      { id: 23, text: "Reconheço e valorizo com elogios as contribuições das pessoas ao meu redor.", pillar: 5 },
      { id: 24, text: "Forneço feedback construtivo que ajuda no desenvolvimento de outros.", pillar: 5 },
      { id: 25, text: "Crio um ambiente onde as pessoas se sentem seguras para compartilhar ideias, errar e aprender.", pillar: 5 },
    ],
  },
  {
    id: 6,
    name: "Inovação e Criatividade",
    icon: "💡",
    questions: [
      { id: 26, text: "Busco constantemente aprender coisas novas e desenvolver novas habilidades.", pillar: 6 },
      { id: 27, text: "Consigo gerar ideias criativas e explorar possibilidades diferentes para executar o meu trabalho.", pillar: 6 },
      { id: 28, text: "Encorajo a experimentação e não tenho medo de tentar novas tecnologias e ferramentas.", pillar: 6 },
      { id: 29, text: "Adapto-me rapidamente a mudanças e vejo a tecnologia como uma aliada para otimizar meu trabalho.", pillar: 6 },
      { id: 30, text: "Busco inspiração em diferentes áreas e trago perspectivas inovadoras para meu trabalho.", pillar: 6 },
    ],
  },
];

export const allQuestions = pillars.flatMap((p) => p.questions);

export interface MaturityStage {
  id: number;
  name: string;
  minPercentage: number;
  maxPercentage: number;
  description: string;
  recommendation: string;
}

export const maturityStages: MaturityStage[] = [
  {
    id: 1,
    name: "Fundamentação",
    minPercentage: 0,
    maxPercentage: 33,
    description: "O profissional está construindo as bases da execução. As ações são muitas vezes reativas e inconsistentes.",
    recommendation: "Foque em desenvolver rotinas de planejamento e acompanhamento. Comece com pequenas metas diárias e crie o hábito de revisar seu progresso regularmente.",
  },
  {
    id: 2,
    name: "Consolidação",
    minPercentage: 34,
    maxPercentage: 66,
    description: "O profissional já aplica boas práticas de execução com consistência, mas ainda há espaço para aprofundar.",
    recommendation: "Busque refinar suas práticas atuais e desenvolver habilidades de liderança e influência. Invista em gestão de projetos e comunicação estratégica.",
  },
  {
    id: 3,
    name: "Estratégico",
    minPercentage: 67,
    maxPercentage: 100,
    description: "O profissional domina a execução e atua de forma proativa e estratégica, influenciando o ambiente.",
    recommendation: "Continue aprimorando sua visão estratégica e busque mentorear outros. Você está pronto para assumir desafios maiores e liderar transformações.",
  },
];

export const calculateScore = (answers: Record<number, number>) => {
  const totalQuestions = 30;
  const maxScore = totalQuestions * 5; // 150 points max
  
  let totalScore = 0;
  Object.values(answers).forEach((value) => {
    totalScore += value;
  });
  
  const percentage = (totalScore / maxScore) * 100;
  
  const stage = maturityStages.find(
    (s) => percentage >= s.minPercentage && percentage <= s.maxPercentage
  ) || maturityStages[0];
  
  // Calculate per-pillar scores
  const pillarScores = pillars.map((pillar) => {
    const pillarQuestions = pillar.questions;
    const pillarMaxScore = pillarQuestions.length * 5;
    let pillarScore = 0;
    
    pillarQuestions.forEach((q) => {
      if (answers[q.id]) {
        pillarScore += answers[q.id];
      }
    });
    
    return {
      pillarId: pillar.id,
      pillarName: pillar.name,
      icon: pillar.icon,
      score: pillarScore,
      maxScore: pillarMaxScore,
      percentage: (pillarScore / pillarMaxScore) * 100,
    };
  });
  
  return {
    totalScore,
    maxScore,
    percentage,
    stage,
    pillarScores,
  };
};
