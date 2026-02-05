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
      indicador: "Apresentar para sua liderança como suas entregas se conectam aos objetivos estratégicos da área",
    },
    consolidacao: {
      interpretacao: "Você já compreende a estratégia e usa dados para decidir, mas precisa fortalecer visão de longo prazo e conexão entre áreas.",
      acao: "Participar de fóruns estratégicos e desenvolver pensamento crítico.",
      acaoIndividual: "Criar um dashboard pessoal com indicadores-chave e revisar semanalmente o progresso em relação às metas estratégicas.",
      acaoColetiva: "Organizar encontros cross-funcionais para discutir desafios estratégicos e alinhar prioridades entre departamentos.",
      curso: "Execução Estratégica",
      cursoCode: "1.2",
      prazo: "45 dias",
      indicador: "Submeter uma proposta de melhoria estratégica para aprovação da gestão, com análise de dados e impacto",
    },
    estrategico: {
      interpretacao: "Você atua com visão de futuro, clareza de impacto e decisões orientadas à estratégia. Inspira outros com sua leitura do cenário.",
      acao: "Assumir papéis de cocriação estratégica e mentoria.",
      acaoIndividual: "Documentar e compartilhar seu processo de análise estratégica como referência para outros profissionais.",
      acaoColetiva: "Liderar ciclos de planejamento estratégico participativo e criar programas de mentoria em pensamento estratégico.",
      curso: "Governança e Estrutura Organizacional",
      cursoCode: "1.7",
      prazo: "60 dias",
      indicador: "Conduzir uma sessão de planejamento estratégico com a alta liderança ou ser convidado para fóruns de decisão",
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
      indicador: "Reportar à liderança os resultados de 3 semanas consecutivas de planejamento estruturado",
    },
    consolidacao: {
      interpretacao: "Você planeja e executa com regularidade, mas ainda alterna entre disciplina e dispersão.",
      acao: "Aprimorar consistência e capacidade de ajuste durante a execução.",
      acaoIndividual: "Criar métricas pessoais de produtividade e fazer retrospectivas quinzenais sobre sua execução.",
      acaoColetiva: "Implementar metodologias ágeis com sprints curtos e revisões regulares de progresso da equipe.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
      prazo: "30 dias",
      indicador: "Apresentar para a gestão um relatório de produtividade mostrando 90% de conclusão por 4 semanas",
    },
    estrategico: {
      interpretacao: "Você é referência em execução disciplinada e adaptável. Entrega com consistência e ajuda outros a performar.",
      acao: "Atuar como multiplicador da cultura de execução e mentor de performance.",
      acaoIndividual: "Documentar suas práticas de alta performance e criar um guia de execução para compartilhar.",
      acaoColetiva: "Estruturar um programa de accountability cruzada e capacitar a equipe em metodologias de execução.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "45 dias",
      indicador: "Propor à diretoria a implementação de rituais de execução que você desenvolveu e testou na equipe",
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
      indicador: "Entregar à liderança a documentação de 3 processos críticos com sugestões de melhoria",
    },
    consolidacao: {
      interpretacao: "A empresa já tem rotinas e cultura mais consistentes, mas com variações entre áreas ou fragilidades em comunicação e coerência.",
      acao: "Reforçar disciplina na liderança, institucionalizar práticas.",
      acaoIndividual: "Ser exemplo de coerência entre discurso e prática, documentando e seguindo os valores da empresa.",
      acaoColetiva: "Criar rituais de reconhecimento alinhados aos valores e promover sessões de feedback cultural.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "45 dias",
      indicador: "Apresentar à gestão os resultados de um programa de alinhamento cultural implementado na equipe",
    },
    estrategico: {
      interpretacao: "A organização opera com excelência na execução e possui uma cultura forte, alinhada e disseminada pelos líderes.",
      acao: "Escalar boas práticas, tornar-se benchmark, desenvolver cultura de melhoria contínua.",
      acaoIndividual: "Tornar-se embaixador da cultura, participando de iniciativas de transformação e compartilhando cases de sucesso.",
      acaoColetiva: "Criar programas de formação de líderes culturais e sistemas de governança para sustentar a excelência.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "60 dias",
      indicador: "Ter seu programa de boas práticas aprovado pela diretoria para replicação em outras áreas",
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
      indicador: "Apresentar o status de um projeto completo para stakeholders usando metodologia estruturada",
    },
    consolidacao: {
      interpretacao: "Você conduz projetos com método, mas ainda precisa amadurecer rituais, ferramentas e influência.",
      acao: "Aprofundar técnicas e ferramentas ágeis, ampliar comunicação.",
      acaoIndividual: "Dominar uma ferramenta de gestão de projetos e criar dashboards de acompanhamento.",
      acaoColetiva: "Implementar cerimônias ágeis (daily, planning, review, retro) e capacitar a equipe nas metodologias.",
      curso: "Fundamentos da Gestão Ágil",
      cursoCode: "2.3",
      prazo: "45 dias",
      indicador: "Realizar uma apresentação de review de projeto para a liderança demonstrando resultados da metodologia ágil",
    },
    estrategico: {
      interpretacao: "Você atua com visão sistêmica, conecta projetos à estratégia e mobiliza stakeholders com eficácia.",
      acao: "Liderar portfólios e disseminar melhores práticas de gestão.",
      acaoIndividual: "Criar frameworks de gestão adaptados à realidade da organização e documentar lições aprendidas.",
      acaoColetiva: "Estruturar um PMO ou escritório de projetos e formar novos gestores de projeto.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
      prazo: "60 dias",
      indicador: "Apresentar à alta gestão uma proposta de estruturação de PMO ou gestão de portfólio para a organização",
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
      indicador: "Receber feedback positivo da liderança sobre melhoria nas suas habilidades de comunicação e relacionamento",
    },
    consolidacao: {
      interpretacao: "Você exercita influência e liderança, mas com impacto ainda limitado ou inconsistente.",
      acao: "Consolidar estilo próprio, praticar reconhecimento e influência lateral.",
      acaoIndividual: "Mapear stakeholders-chave e desenvolver estratégias de influência para cada perfil.",
      acaoColetiva: "Criar programas de reconhecimento na equipe e liderar iniciativas que envolvam outras áreas.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
      prazo: "45 dias",
      indicador: "Ser reconhecido pela gestão por liderar uma iniciativa que envolveu múltiplas áreas da empresa",
    },
    estrategico: {
      interpretacao: "Você lidera com propósito, engaja naturalmente, influencia além da equipe e gera alto desempenho.",
      acao: "Ser mentor de líderes, influenciar cultura e multiplicar boas práticas.",
      acaoIndividual: "Criar um programa pessoal de mentoria e documentar seu framework de liderança.",
      acaoColetiva: "Desenvolver a próxima geração de líderes e criar sistemas de multiplicação de boas práticas.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
      prazo: "60 dias",
      indicador: "Ter seu programa de mentoria endossado pela diretoria como modelo para desenvolvimento de líderes",
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
      indicador: "Apresentar à liderança os resultados de 2 novas ferramentas ou abordagens implementadas",
    },
    consolidacao: {
      interpretacao: "Você traz ideias e soluções, mas ainda hesita em inovar com regularidade ou impacto.",
      acao: "Praticar prototipagem, buscar benchmarks e diversidade de inspiração.",
      acaoIndividual: "Criar protótipos rápidos antes de investir em soluções completas e buscar inspiração fora da sua área.",
      acaoColetiva: "Implementar sprints de inovação e criar um banco de ideias colaborativo com a equipe.",
      curso: "Metodologias Ágeis e Inovação",
      cursoCode: "4.2",
      prazo: "45 dias",
      indicador: "Ter um protótipo de inovação aprovado por stakeholders-chave para desenvolvimento completo",
    },
    estrategico: {
      interpretacao: "Você inova de forma contínua, traz soluções fora da curva e influencia transformação no ambiente.",
      acao: "Liderar laboratórios de inovação, fomentar cultura experimental.",
      acaoIndividual: "Tornar-se referência em adoção de novas tecnologias e compartilhar conhecimento através de talks e workshops.",
      acaoColetiva: "Criar laboratórios de inovação, parcerias com startups e programas de intraempreendedorismo.",
      curso: "Inteligência Artificial e Automação",
      cursoCode: "4.4",
      prazo: "60 dias",
      indicador: "Ter um programa de inovação ou laboratório experimental aprovado e patrocinado pela alta gestão",
    },
  },
};
