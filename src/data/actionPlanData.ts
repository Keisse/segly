import { Compass, Target, CheckCircle2, Zap, Building2, Users, FolderKanban, Award, Lightbulb, Rocket } from "lucide-react";

export type StageKey = "fundamentacao" | "consolidacao" | "estrategico";

export interface Stage {
  key: StageKey;
  label: string;
  description: string;
  range: string;
}

export interface Pillar {
  id: number;
  name: string;
  icon: typeof Compass;
}

export interface ActionPlanRecommendation {
  interpretacao: string;
  acao: string;
  curso: string;
  cursoCode: string;
  prazo: string;
  indicador: string;
}

export const stages: Stage[] = [
  { key: "fundamentacao", label: "Fundamentação", description: "Construindo bases sólidas e rotinas consistentes", range: "0-33%" },
  { key: "consolidacao", label: "Consolidação", description: "Padronizando métodos e ganhando consistência", range: "34-66%" },
  { key: "estrategico", label: "Estratégico", description: "Domínio, visão sistêmica e influência", range: "67-100%" },
];

export const pillars: Pillar[] = [
  { id: 1, name: "Pensamento Estratégico", icon: Compass },
  { id: 2, name: "Execução e Disciplina", icon: CheckCircle2 },
  { id: 3, name: "Execução e Cultura Corporativa", icon: Building2 },
  { id: 4, name: "Gestão de Projetos", icon: FolderKanban },
  { id: 5, name: "Liderança e Influência", icon: Users },
  { id: 6, name: "Inovação e Criatividade", icon: Lightbulb },
];

export const recommendations: Record<number, Record<StageKey, ActionPlanRecommendation>> = {
  // Pilar 1: Pensamento Estratégico
  1: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em compreender como seu trabalho se conecta à estratégia da empresa. Age de forma reativa e com pouca visão sistêmica.",
      acao: "Trabalhar clareza de propósito, ampliar entendimento do negócio e uso de dados.",
      curso: "Fundamentos de Estratégia",
      cursoCode: "1.1",
      prazo: "30 dias",
      indicador: "Conseguir articular verbalmente como suas entregas contribuem para os objetivos estratégicos da área",
    },
    consolidacao: {
      interpretacao: "Você já compreende a estratégia e usa dados para decidir, mas precisa fortalecer visão de longo prazo e conexão entre áreas.",
      acao: "Participar de fóruns estratégicos e desenvolver pensamento crítico.",
      curso: "Execução Estratégica",
      cursoCode: "1.2",
      prazo: "45 dias",
      indicador: "Apresentar uma proposta de melhoria baseada em análise de dados e impacto estratégico",
    },
    estrategico: {
      interpretacao: "Você atua com visão de futuro, clareza de impacto e decisões orientadas à estratégia. Inspira outros com sua leitura do cenário.",
      acao: "Assumir papéis de cocriação estratégica e mentoria.",
      curso: "Governança e Estrutura Organizacional",
      cursoCode: "1.7",
      prazo: "60 dias",
      indicador: "Liderar um ciclo de planejamento estratégico ou mentorar pelo menos 2 profissionais em pensamento estratégico",
    },
  },
  // Pilar 2: Execução e Disciplina
  2: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em planejar, manter foco e concluir o que começa. Execution gap frequente.",
      acao: "Criar rotina de organização, foco em metas e rituais de execução simples.",
      curso: "Fundamentos da Excelência Operacional",
      cursoCode: "2.1",
      prazo: "21 dias",
      indicador: "Manter uma rotina de planejamento semanal por 3 semanas consecutivas",
    },
    consolidacao: {
      interpretacao: "Você planeja e executa com regularidade, mas ainda alterna entre disciplina e dispersão.",
      acao: "Aprimorar consistência e capacidade de ajuste durante a execução.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
      prazo: "30 dias",
      indicador: "Concluir 90% das tarefas planejadas na semana por 4 semanas seguidas",
    },
    estrategico: {
      interpretacao: "Você é referência em execução disciplinada e adaptável. Entrega com consistência e ajuda outros a performar.",
      acao: "Atuar como multiplicador da cultura de execução e mentor de performance.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "45 dias",
      indicador: "Implementar um ritual de acompanhamento de execução em sua equipe ou área",
    },
  },
  // Pilar 3: Execução e Cultura Corporativa
  3: {
    fundamentacao: {
      interpretacao: "A empresa ainda não possui processos claros nem uma cultura bem definida. A execução é reativa, desorganizada ou desconectada.",
      acao: "Mapear processos, comunicar prioridades, promover alinhamento cultural.",
      curso: "Mapeamento e Melhoria de Processos (BPM)",
      cursoCode: "2.2",
      prazo: "30 dias",
      indicador: "Documentar pelo menos 3 processos críticos da sua área de atuação",
    },
    consolidacao: {
      interpretacao: "A empresa já tem rotinas e cultura mais consistentes, mas com variações entre áreas ou fragilidades em comunicação e coerência.",
      acao: "Reforçar disciplina na liderança, institucionalizar práticas.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "45 dias",
      indicador: "Implementar um ritual de alinhamento cultural na equipe com frequência regular",
    },
    estrategico: {
      interpretacao: "A organização opera com excelência na execução e possui uma cultura forte, alinhada e disseminada pelos líderes.",
      acao: "Escalar boas práticas, tornar-se benchmark, desenvolver cultura de melhoria contínua.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "60 dias",
      indicador: "Criar um programa de disseminação de boas práticas para outras áreas",
    },
  },
  // Pilar 4: Gestão de Projetos
  4: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em estruturar projetos ou acompanhar sua execução. Atua de forma improvisada.",
      acao: "Aprender conceitos básicos de escopo, prazo, risco e status.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
      prazo: "30 dias",
      indicador: "Estruturar e acompanhar um projeto completo usando metodologia básica",
    },
    consolidacao: {
      interpretacao: "Você conduz projetos com método, mas ainda precisa amadurecer rituais, ferramentas e influência.",
      acao: "Aprofundar técnicas e ferramentas ágeis, ampliar comunicação.",
      curso: "Fundamentos da Gestão Ágil",
      cursoCode: "2.3",
      prazo: "45 dias",
      indicador: "Conduzir um projeto usando metodologia ágil com cerimônias regulares",
    },
    estrategico: {
      interpretacao: "Você atua com visão sistêmica, conecta projetos à estratégia e mobiliza stakeholders com eficácia.",
      acao: "Liderar portfólios e disseminar melhores práticas de gestão.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "60 dias",
      indicador: "Estruturar a gestão de portfólio da área ou formar outros gestores de projeto",
    },
  },
  // Pilar 5: Liderança e Influência
  5: {
    fundamentacao: {
      interpretacao: "Você atua de forma isolada, tem dificuldade em inspirar ou engajar pessoas.",
      acao: "Desenvolver escuta, dar feedbacks e criar ambiente de segurança.",
      curso: "Fundamentos da Liderança",
      cursoCode: "3.1",
      prazo: "30 dias",
      indicador: "Realizar pelo menos 5 conversas de feedback estruturado com colegas ou liderados",
    },
    consolidacao: {
      interpretacao: "Você exercita influência e liderança, mas com impacto ainda limitado ou inconsistente.",
      acao: "Consolidar estilo próprio, praticar reconhecimento e influência lateral.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "45 dias",
      indicador: "Liderar uma iniciativa cross-funcional mobilizando pessoas de outras áreas",
    },
    estrategico: {
      interpretacao: "Você lidera com propósito, engaja naturalmente, influencia além da equipe e gera alto desempenho.",
      acao: "Ser mentor de líderes, influenciar cultura e multiplicar boas práticas.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "60 dias",
      indicador: "Mentorar pelo menos 2 líderes emergentes e documentar o processo",
    },
  },
  // Pilar 6: Inovação e Criatividade
  6: {
    fundamentacao: {
      interpretacao: "Você é pouco criativo, evita mudanças e raramente explora novas ideias ou ferramentas.",
      acao: "Estimular curiosidade, aprender novas abordagens, experimentar sem medo.",
      curso: "Transformação Digital",
      cursoCode: "4.1",
      prazo: "30 dias",
      indicador: "Testar e implementar pelo menos 2 novas ferramentas ou abordagens no trabalho",
    },
    consolidacao: {
      interpretacao: "Você traz ideias e soluções, mas ainda hesita em inovar com regularidade ou impacto.",
      acao: "Praticar prototipagem, buscar benchmarks e diversidade de inspiração.",
      curso: "Metodologias Ágeis e Inovação",
      cursoCode: "4.2",
      prazo: "45 dias",
      indicador: "Prototipar e validar uma ideia inovadora com stakeholders relevantes",
    },
    estrategico: {
      interpretacao: "Você inova de forma contínua, traz soluções fora da curva e influencia transformação no ambiente.",
      acao: "Liderar laboratórios de inovação, fomentar cultura experimental.",
      curso: "Inteligência Artificial e Automação",
      cursoCode: "4.4",
      prazo: "60 dias",
      indicador: "Criar e liderar um programa de inovação ou experimentação na organização",
    },
  },
};
