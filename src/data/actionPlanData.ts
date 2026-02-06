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
  acaoIndividual: string;
  acaoColetiva: string;
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
      acaoIndividual: "Estudar o planejamento estratégico da empresa e mapear como suas entregas contribuem para os objetivos organizacionais.",
      acaoColetiva: "Promover reuniões de alinhamento estratégico com a equipe para compartilhar a visão do negócio e conectar tarefas diárias aos objetivos maiores.",
      curso: "Fundamentos de Estratégia",
      cursoCode: "1.1",
      prazo: "30 dias",
      indicador: "Propor à liderança um workshop para alinhar as entregas individuais da equipe aos objetivos estratégicos da área",
    },
    consolidacao: {
      interpretacao: "Você já compreende a estratégia e usa dados para decidir, mas precisa fortalecer visão de longo prazo e conexão entre áreas.",
      acao: "Participar de fóruns estratégicos e desenvolver pensamento crítico.",
      acaoIndividual: "Criar um dashboard pessoal com indicadores-chave e revisar semanalmente o progresso em relação às metas estratégicas.",
      acaoColetiva: "Organizar encontros cross-funcionais para discutir desafios estratégicos e alinhar prioridades entre departamentos.",
      curso: "Execução Estratégica",
      cursoCode: "1.2",
      prazo: "45 dias",
      indicador: "Propor à gestão uma iniciativa de alinhamento estratégico envolvendo múltiplas equipes e liderar sua implementação",
    },
    estrategico: {
      interpretacao: "Você atua com visão de futuro, clareza de impacto e decisões orientadas à estratégia. Inspira outros com sua leitura do cenário.",
      acao: "Assumir papéis de cocriação estratégica e mentoria.",
      acaoIndividual: "Documentar e compartilhar seu processo de análise estratégica como referência para outros profissionais.",
      acaoColetiva: "Liderar ciclos de planejamento estratégico participativo e criar programas de mentoria em pensamento estratégico.",
      curso: "Governança e Estrutura Organizacional",
      cursoCode: "1.7",
      prazo: "60 dias",
      indicador: "Propor à diretoria um programa de capacitação em pensamento estratégico para transformar toda a organização",
    },
  },
  // Pilar 2: Execução e Disciplina
  2: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em planejar, manter foco e concluir o que começa. Execution gap frequente.",
      acao: "Criar rotina de organização, foco em metas e rituais de execução simples.",
      acaoIndividual: "Implementar um sistema de planejamento semanal com no máximo 3 prioridades diárias e revisão ao fim de cada dia.",
      acaoColetiva: "Estabelecer rituais de check-in diário ou semanal com a equipe para acompanhamento de tarefas e remoção de impedimentos.",
      curso: "Fundamentos da Excelência Operacional",
      cursoCode: "2.1",
      prazo: "21 dias",
      indicador: "Propor à liderança a implementação de rotinas de planejamento estruturado para toda a equipe",
    },
    consolidacao: {
      interpretacao: "Você planeja e executa com regularidade, mas ainda alterna entre disciplina e dispersão.",
      acao: "Aprimorar consistência e capacidade de ajuste durante a execução.",
      acaoIndividual: "Criar métricas pessoais de produtividade e fazer retrospectivas quinzenais sobre sua execução.",
      acaoColetiva: "Implementar metodologias ágeis com sprints curtos e revisões regulares de progresso da equipe.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
      prazo: "30 dias",
      indicador: "Propor à gestão metodologias compartilhadas de produtividade para elevar a taxa de conclusão de toda a equipe",
    },
    estrategico: {
      interpretacao: "Você é referência em execução disciplinada e adaptável. Entrega com consistência e ajuda outros a performar.",
      acao: "Atuar como multiplicador da cultura de execução e mentor de performance.",
      acaoIndividual: "Documentar suas práticas de alta performance e criar um guia de execução para compartilhar.",
      acaoColetiva: "Estruturar um programa de accountability cruzada e capacitar a equipe em metodologias de execução.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "45 dias",
      indicador: "Propor à diretoria a replicação dos rituais de execução que você desenvolveu para outras áreas da organização",
    },
  },
  // Pilar 3: Execução e Cultura Corporativa
  3: {
    fundamentacao: {
      interpretacao: "A empresa ainda não possui processos claros nem uma cultura bem definida. A execução é reativa, desorganizada ou desconectada.",
      acao: "Mapear processos, comunicar prioridades, promover alinhamento cultural.",
      acaoIndividual: "Documentar seus próprios processos de trabalho e identificar gargalos e ineficiências.",
      acaoColetiva: "Realizar workshops de mapeamento de processos com a equipe e definir padrões mínimos de qualidade.",
      curso: "Mapeamento e Melhoria de Processos (BPM)",
      cursoCode: "2.2",
      prazo: "30 dias",
      indicador: "Propor à liderança um mapeamento colaborativo de processos envolvendo toda a equipe",
    },
    consolidacao: {
      interpretacao: "A empresa já tem rotinas e cultura mais consistentes, mas com variações entre áreas ou fragilidades em comunicação e coerência.",
      acao: "Reforçar disciplina na liderança, institucionalizar práticas.",
      acaoIndividual: "Ser exemplo de coerência entre discurso e prática, documentando e seguindo os valores da empresa.",
      acaoColetiva: "Criar rituais de reconhecimento alinhados aos valores e promover sessões de feedback cultural.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "45 dias",
      indicador: "Propor à gestão um programa de alinhamento cultural para transformar a cultura de execução da equipe",
    },
    estrategico: {
      interpretacao: "A organização opera com excelência na execução e possui uma cultura forte, alinhada e disseminada pelos líderes.",
      acao: "Escalar boas práticas, tornar-se benchmark, desenvolver cultura de melhoria contínua.",
      acaoIndividual: "Tornar-se embaixador da cultura, participando de iniciativas de transformação e compartilhando cases de sucesso.",
      acaoColetiva: "Criar programas de formação de líderes culturais e sistemas de governança para sustentar a excelência.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "60 dias",
      indicador: "Propor à alta liderança um programa de formação para escalar a cultura de excelência para toda a organização",
    },
  },
  // Pilar 4: Gestão de Projetos
  4: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em estruturar projetos ou acompanhar sua execução. Atua de forma improvisada.",
      acao: "Aprender conceitos básicos de escopo, prazo, risco e status.",
      acaoIndividual: "Utilizar templates simples de gestão de projetos e criar checklists para suas entregas.",
      acaoColetiva: "Estabelecer reuniões de status semanais e criar um quadro visual de acompanhamento de projetos da equipe.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
      prazo: "30 dias",
      indicador: "Propor aos stakeholders a adoção de práticas estruturadas de gestão de projetos para toda a equipe",
    },
    consolidacao: {
      interpretacao: "Você conduz projetos com método, mas ainda precisa amadurecer rituais, ferramentas e influência.",
      acao: "Aprofundar técnicas e ferramentas ágeis, ampliar comunicação.",
      acaoIndividual: "Dominar uma ferramenta de gestão de projetos e criar dashboards de acompanhamento.",
      acaoColetiva: "Implementar cerimônias ágeis (daily, planning, review, retro) e capacitar a equipe nas metodologias.",
      curso: "Fundamentos da Gestão Ágil",
      cursoCode: "2.3",
      prazo: "45 dias",
      indicador: "Propor à liderança um plano de capacitação para elevar a maturidade em gestão de projetos de toda a equipe",
    },
    estrategico: {
      interpretacao: "Você atua com visão sistêmica, conecta projetos à estratégia e mobiliza stakeholders com eficácia.",
      acao: "Liderar portfólios e disseminar melhores práticas de gestão.",
      acaoIndividual: "Criar frameworks de gestão adaptados à realidade da organização e documentar lições aprendidas.",
      acaoColetiva: "Estruturar um PMO ou escritório de projetos e formar novos gestores de projeto.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "60 dias",
      indicador: "Propor à alta gestão a estruturação de um PMO ou modelo de gestão de portfólio para múltiplas áreas",
    },
  },
  // Pilar 5: Liderança e Influência
  5: {
    fundamentacao: {
      interpretacao: "Você atua de forma isolada, tem dificuldade em inspirar ou engajar pessoas.",
      acao: "Desenvolver escuta, dar feedbacks e criar ambiente de segurança.",
      acaoIndividual: "Praticar escuta ativa em todas as interações e solicitar feedback sobre seu estilo de comunicação.",
      acaoColetiva: "Criar espaços seguros para diálogo aberto e implementar 1:1s regulares com membros da equipe.",
      curso: "Fundamentos da Liderança",
      cursoCode: "3.1",
      prazo: "30 dias",
      indicador: "Propor à liderança iniciativas para melhorar o clima de comunicação e colaboração da equipe",
    },
    consolidacao: {
      interpretacao: "Você exercita influência e liderança, mas com impacto ainda limitado ou inconsistente.",
      acao: "Consolidar estilo próprio, praticar reconhecimento e influência lateral.",
      acaoIndividual: "Mapear stakeholders-chave e desenvolver estratégias de influência para cada perfil.",
      acaoColetiva: "Criar programas de reconhecimento na equipe e liderar iniciativas que envolvam outras áreas.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "45 dias",
      indicador: "Propor à gestão uma iniciativa cross-funcional que mobilize equipes de diferentes áreas",
    },
    estrategico: {
      interpretacao: "Você lidera com propósito, engaja naturalmente, influencia além da equipe e gera alto desempenho.",
      acao: "Ser mentor de líderes, influenciar cultura e multiplicar boas práticas.",
      acaoIndividual: "Criar um programa pessoal de mentoria e documentar seu framework de liderança.",
      acaoColetiva: "Desenvolver a próxima geração de líderes e criar sistemas de multiplicação de boas práticas.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "60 dias",
      indicador: "Propor à diretoria um programa institucional de mentoria para formar a próxima geração de líderes",
    },
  },
  // Pilar 6: Inovação e Criatividade
  6: {
    fundamentacao: {
      interpretacao: "Você é pouco criativo, evita mudanças e raramente explora novas ideias ou ferramentas.",
      acao: "Estimular curiosidade, aprender novas abordagens, experimentar sem medo.",
      acaoIndividual: "Dedicar tempo semanal para explorar novas ferramentas, tecnologias ou metodologias.",
      acaoColetiva: "Criar sessões de brainstorming e experimentação com a equipe, celebrando aprendizados de erros.",
      curso: "Transformação Digital",
      cursoCode: "4.1",
      prazo: "30 dias",
      indicador: "Propor à liderança a criação de uma cultura de experimentação envolvendo toda a equipe",
    },
    consolidacao: {
      interpretacao: "Você traz ideias e soluções, mas ainda hesita em inovar com regularidade ou impacto.",
      acao: "Praticar prototipagem, buscar benchmarks e diversidade de inspiração.",
      acaoIndividual: "Criar protótipos rápidos antes de investir em soluções completas e buscar inspiração fora da sua área.",
      acaoColetiva: "Implementar sprints de inovação e criar um banco de ideias colaborativo com a equipe.",
      curso: "Metodologias Ágeis e Inovação",
      cursoCode: "4.2",
      prazo: "45 dias",
      indicador: "Propor aos stakeholders um processo de inovação colaborativo envolvendo múltiplas equipes",
    },
    estrategico: {
      interpretacao: "Você inova de forma contínua, traz soluções fora da curva e influencia transformação no ambiente.",
      acao: "Liderar laboratórios de inovação, fomentar cultura experimental.",
      acaoIndividual: "Tornar-se referência em adoção de novas tecnologias e compartilhar conhecimento através de talks e workshops.",
      acaoColetiva: "Criar laboratórios de inovação, parcerias com startups e programas de intraempreendedorismo.",
      curso: "Inteligência Artificial e Automação",
      cursoCode: "4.4",
      prazo: "60 dias",
      indicador: "Propor à alta gestão a criação de um laboratório de inovação para transformar a cultura organizacional",
    },
  },
};
