// Cursos da Allevo mapeados por pilar do teste e estágio de maturidade
// Seguindo o mapeamento fixo entre Pilar do Teste e Pilar Allevo

export interface AllevoCourse {
  id: string;
  name: string;
  description: string;
  pillarAllevo: string;
  stage: "fundamentacao" | "consolidacao" | "estrategico";
  url?: string;
}

// Mapeamento Pilar do Teste → Pilar Allevo:
// Pilar 1 – Pensamento Estratégico → Pilar 1 Allevo – Direção, Estratégia Operacional e Modelo de Negócio
// Pilar 2 – Execução e Disciplina → Pilar 2 Allevo – Operações, Processos e Eficiência Produtiva
// Pilar 3 – Execução e Cultura Corporativa → Pilares 2 e 3 Allevo
// Pilar 4 – Gestão de Projetos → Pilar 2 Allevo – Operações, Processos e Eficiência Produtiva
// Pilar 5 – Liderança e Influência → Pilar 3 Allevo – Pessoas, Liderança e Cultura de Dono
// Pilar 6 – Inovação e Criatividade → Pilar 4 Allevo – Tecnologia, Inovação e Melhoria Contínua

export const coursesByPillarAndStage: Record<number, Record<string, AllevoCourse>> = {
  // Pilar 1 – Pensamento Estratégico
  1: {
    fundamentacao: {
      id: "p1-fund",
      name: "Curso Fundamentos de Estratégia",
      description: "Aprenda os conceitos essenciais de estratégia empresarial, como definir propósito, analisar cenários e alinhar ações com objetivos organizacionais.",
      pillarAllevo: "Direção, Estratégia Operacional e Modelo de Negócio",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p1-cons",
      name: "Curso Execução Estratégica",
      description: "Desenvolva a capacidade de traduzir estratégia em ação, criando planos executáveis e garantindo alinhamento entre equipes e objetivos.",
      pillarAllevo: "Direção, Estratégia Operacional e Modelo de Negócio",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p1-estr",
      name: "Curso Governança e Estrutura Organizacional",
      description: "Domine práticas avançadas de governança corporativa, desenho organizacional e gestão de portfólio estratégico para escalar resultados.",
      pillarAllevo: "Direção, Estratégia Operacional e Modelo de Negócio",
      stage: "estrategico",
    },
  },
  // Pilar 2 – Execução e Disciplina
  2: {
    fundamentacao: {
      id: "p2-fund",
      name: "Curso Fundamentos da Excelência Operacional",
      description: "Construa as bases da excelência operacional com técnicas de planejamento, priorização e execução disciplinada.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p2-cons",
      name: "Curso Fundamentos de Gestão de Projetos",
      description: "Aprenda metodologias comprovadas de gestão de projetos para garantir entregas consistentes com escopo, prazo e qualidade.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p2-estr",
      name: "Curso PMO e Gestão de Portfólio",
      description: "Desenvolva competências para estruturar um PMO, priorizar portfólio de projetos e garantir governança na execução organizacional.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "estrategico",
    },
  },
  // Pilar 3 – Execução e Cultura Corporativa
  3: {
    fundamentacao: {
      id: "p3-fund",
      name: "Curso Mapeamento e Melhoria de Processos (BPM)",
      description: "Aprenda a mapear, analisar e otimizar processos organizacionais para criar uma base sólida de execução corporativa.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p3-cons",
      name: "Curso Cultura Organizacional e Engajamento",
      description: "Entenda como construir e fortalecer uma cultura que valoriza compromisso, disciplina e engajamento das equipes.",
      pillarAllevo: "Pessoas, Liderança e Cultura de Dono",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p3-estr",
      name: "Curso Desenvolvimento de Lideranças",
      description: "Forme líderes que sejam exemplo de coerência entre discurso e prática, capazes de transformar a cultura organizacional.",
      pillarAllevo: "Pessoas, Liderança e Cultura de Dono",
      stage: "estrategico",
    },
  },
  // Pilar 4 – Gestão de Projetos
  4: {
    fundamentacao: {
      id: "p4-fund",
      name: "Curso Fundamentos de Gestão de Projetos",
      description: "Domine os fundamentos para transformar ideias em projetos estruturados com escopo, prazo e orçamento definidos.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p4-cons",
      name: "Curso Fundamentos da Gestão Ágil",
      description: "Aprenda metodologias ágeis para gerenciar projetos com mais flexibilidade, visibilidade e engajamento da equipe.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p4-estr",
      name: "Curso PMO e Gestão de Portfólio",
      description: "Estruture a gestão de múltiplos projetos, priorize iniciativas estratégicas e crie governança para garantir resultados.",
      pillarAllevo: "Operações, Processos e Eficiência Produtiva",
      stage: "estrategico",
    },
  },
  // Pilar 5 – Liderança e Influência
  5: {
    fundamentacao: {
      id: "p5-fund",
      name: "Curso Fundamentos da Liderança",
      description: "Desenvolva as competências essenciais de liderança: inspirar confiança, dar feedback e criar ambientes seguros para a equipe.",
      pillarAllevo: "Pessoas, Liderança e Cultura de Dono",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p5-cons",
      name: "Curso Desenvolvimento de Lideranças",
      description: "Aprofunde suas habilidades de liderança para influenciar, desenvolver pessoas e criar times de alta performance.",
      pillarAllevo: "Pessoas, Liderança e Cultura de Dono",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p5-estr",
      name: "Curso Cultura Organizacional e Engajamento",
      description: "Lidere a transformação cultural da organização, criando ambientes de alto engajamento e performance sustentável.",
      pillarAllevo: "Pessoas, Liderança e Cultura de Dono",
      stage: "estrategico",
    },
  },
  // Pilar 6 – Inovação e Criatividade
  6: {
    fundamentacao: {
      id: "p6-fund",
      name: "Curso Transformação Digital",
      description: "Entenda os fundamentos da transformação digital e como a tecnologia pode otimizar seu trabalho e processos.",
      pillarAllevo: "Tecnologia, Inovação e Melhoria Contínua",
      stage: "fundamentacao",
    },
    consolidacao: {
      id: "p6-cons",
      name: "Curso Metodologias Ágeis e Inovação",
      description: "Aprenda a aplicar metodologias ágeis para experimentar, inovar e adaptar-se rapidamente às mudanças do mercado.",
      pillarAllevo: "Tecnologia, Inovação e Melhoria Contínua",
      stage: "consolidacao",
    },
    estrategico: {
      id: "p6-estr",
      name: "Curso Inteligência Artificial e Automação",
      description: "Domine as tecnologias de ponta para automatizar processos, escalar inovação e liderar a transformação tecnológica.",
      pillarAllevo: "Tecnologia, Inovação e Melhoria Contínua",
      stage: "estrategico",
    },
  },
};

export const getCourseForPillar = (pillarId: number, stageKey: string): AllevoCourse | null => {
  return coursesByPillarAndStage[pillarId]?.[stageKey] || null;
};
