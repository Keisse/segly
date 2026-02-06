import { Compass, CheckCircle2, Building2, FolderKanban, Users, Lightbulb, LucideIcon } from "lucide-react";

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
  slug: string;
  icon: LucideIcon;
}

export interface PlanoDeAcao {
  interpretacao: string;
  acao_geral: string;
  acao_individual: string;
  acao_coletiva: string;
  prazo_sugerido: number;
  prazo_revisao: number;
  indicador_sucesso: string;
  curso_codigo: string;
  curso_nome: string;
}

export const stages: Stage[] = [
  { key: "fundamentacao", label: "Fundamentação", description: "Construindo bases sólidas e rotinas consistentes", range: "0-33%" },
  { key: "consolidacao", label: "Consolidação", description: "Padronizando métodos e ganhando consistência", range: "34-66%" },
  { key: "estrategico", label: "Estratégico", description: "Domínio, visão sistêmica e influência", range: "67-100%" },
];

export const pillars: Pillar[] = [
  { id: 1, name: "Pensamento Estratégico", slug: "pensamento-estrategico", icon: Compass },
  { id: 2, name: "Execução e Disciplina", slug: "execucao-e-disciplina", icon: CheckCircle2 },
  { id: 3, name: "Execução e Cultura Corporativa", slug: "execucao-e-cultura-corporativa", icon: Building2 },
  { id: 4, name: "Gestão de Projetos", slug: "gestao-de-projetos", icon: FolderKanban },
  { id: 5, name: "Liderança e Influência", slug: "lideranca-e-influencia", icon: Users },
  { id: 6, name: "Inovação e Criatividade", slug: "inovacao-e-criatividade", icon: Lightbulb },
];

export const planosDeAcao: Record<number, Record<StageKey, PlanoDeAcao>> = {
  // Pilar 1: Pensamento Estratégico
  1: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em compreender como seu trabalho se conecta à estratégia da empresa. Age de forma reativa e com pouca visão sistêmica.",
      acao_geral: "Trabalhar clareza de propósito, ampliar entendimento do negócio e uso de dados.",
      acao_individual: "Estudar o planejamento estratégico da empresa e mapear como suas entregas contribuem para os objetivos organizacionais.",
      acao_coletiva: "Promover reuniões de alinhamento estratégico com a equipe para compartilhar a visão do negócio e conectar tarefas diárias aos objetivos maiores.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Concluir seu mapeamento pessoal de contribuição estratégica. Em seguida, propor à liderança um workshop para alinhar as entregas individuais da equipe aos objetivos estratégicos da área.",
      curso_codigo: "1.1",
      curso_nome: "Fundamentos de Estratégia"
    },
    consolidacao: {
      interpretacao: "Você já compreende a estratégia e usa dados para decidir, mas precisa fortalecer visão de longo prazo e conexão entre áreas.",
      acao_geral: "Participar de fóruns estratégicos e desenvolver pensamento crítico.",
      acao_individual: "Analisar tendências de mercado e preparar um resumo executivo com insights para a liderança.",
      acao_coletiva: "Facilitar uma sessão de pensamento estratégico com áreas adjacentes para identificar sinergias e oportunidades.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Apresentar análise de tendências à liderança e conduzir pelo menos uma sessão cross-funcional de alinhamento estratégico.",
      curso_codigo: "1.2",
      curso_nome: "Execução Estratégica"
    },
    estrategico: {
      interpretacao: "Você atua com visão de futuro, clareza de impacto e decisões orientadas à estratégia. Inspira outros com sua leitura do cenário.",
      acao_geral: "Assumir papéis de cocriação estratégica e mentoria.",
      acao_individual: "Documentar seu modelo mental de análise estratégica e criar um framework replicável.",
      acao_coletiva: "Mentorar 2-3 profissionais em pensamento estratégico e participar ativamente de fóruns de decisão da empresa.",
      prazo_sugerido: 60,
      prazo_revisao: 30,
      indicador_sucesso: "Ter framework documentado e adotado pela área. Ter mentorados com evolução demonstrável em pensamento estratégico.",
      curso_codigo: "1.7",
      curso_nome: "Governança e Estrutura Organizacional"
    }
  },

  // Pilar 2: Execução e Disciplina
  2: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em planejar, manter foco e concluir o que começa. Execution gap frequente.",
      acao_geral: "Criar rotina de organização, foco em metas e rituais de execução simples.",
      acao_individual: "Implementar uma rotina diária de planejamento (15 min) e um sistema de acompanhamento de tarefas.",
      acao_coletiva: "Propor à equipe um ritual semanal de 30 min para revisar prioridades e remover impedimentos.",
      prazo_sugerido: 21,
      prazo_revisao: 10,
      indicador_sucesso: "Manter rotina de planejamento por 3 semanas consecutivas. Ter ritual de equipe funcionando com participação ativa.",
      curso_codigo: "2.1",
      curso_nome: "Fundamentos da Excelência Operacional"
    },
    consolidacao: {
      interpretacao: "Você planeja e executa com regularidade, mas ainda alterna entre disciplina e dispersão.",
      acao_geral: "Aprimorar consistência e capacidade de ajuste durante a execução.",
      acao_individual: "Implementar revisões semanais de progresso e criar sistema de métricas pessoais de execução.",
      acao_coletiva: "Estabelecer rituais de acompanhamento quinzenal com stakeholders para calibrar prioridades.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Ter dashboard pessoal de execução funcionando. Rituais de calibração com stakeholders estabelecidos.",
      curso_codigo: "2.3",
      curso_nome: "Fundamentos de Gestão de Projetos"
    },
    estrategico: {
      interpretacao: "Você é referência em execução disciplinada e adaptável. Entrega com consistência e ajuda outros a performar.",
      acao_geral: "Atuar como multiplicador da cultura de execução e mentor de performance.",
      acao_individual: "Sistematizar suas práticas de execução em um playbook replicável.",
      acao_coletiva: "Treinar a equipe nas práticas do playbook e criar sistema de reconhecimento por execução consistente.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Playbook documentado e em uso pela equipe. Pelo menos 3 pessoas aplicando as práticas com resultados mensuráveis.",
      curso_codigo: "2.4",
      curso_nome: "PMO e Gestão de Portfólio"
    }
  },

  // Pilar 3: Execução e Cultura Corporativa
  3: {
    fundamentacao: {
      interpretacao: "A empresa ainda não possui processos claros nem uma cultura bem definida. A execução é reativa, desorganizada ou desconectada.",
      acao_geral: "Mapear processos, comunicar prioridades, promover alinhamento cultural.",
      acao_individual: "Documentar os 3 processos mais críticos da sua área de atuação.",
      acao_coletiva: "Conduzir sessão de alinhamento com a equipe sobre valores e comportamentos esperados na execução.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Processos críticos documentados e compartilhados. Equipe alinhada em pelo menos 3 comportamentos-chave de execução.",
      curso_codigo: "2.2",
      curso_nome: "Mapeamento e Melhoria de Processos (BPM)"
    },
    consolidacao: {
      interpretacao: "A empresa já tem rotinas e cultura mais consistentes, mas com variações entre áreas ou fragilidades em comunicação e coerência.",
      acao_geral: "Reforçar disciplina na liderança, institucionalizar práticas.",
      acao_individual: "Criar checklist de boas práticas de execução para onboarding de novos membros.",
      acao_coletiva: "Implementar rituais mensais de reconhecimento de boas práticas de execução na equipe.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Checklist de onboarding em uso. Ritual de reconhecimento funcionando com engajamento da equipe.",
      curso_codigo: "3.3",
      curso_nome: "Cultura Organizacional e Engajamento"
    },
    estrategico: {
      interpretacao: "A organização opera com excelência na execução e possui uma cultura forte, alinhada e disseminada pelos líderes.",
      acao_geral: "Escalar boas práticas, tornar-se benchmark, desenvolver cultura de melhoria contínua.",
      acao_individual: "Documentar caso de sucesso da área para compartilhamento interno.",
      acao_coletiva: "Liderar iniciativa cross-funcional de disseminação de boas práticas de execução.",
      prazo_sugerido: 60,
      prazo_revisao: 30,
      indicador_sucesso: "Caso documentado e apresentado para outras áreas. Pelo menos 2 áreas adotando práticas originadas na sua equipe.",
      curso_codigo: "3.5",
      curso_nome: "Desenvolvimento de Lideranças"
    }
  },

  // Pilar 4: Gestão de Projetos
  4: {
    fundamentacao: {
      interpretacao: "Você tem dificuldade em estruturar projetos ou acompanhar sua execução. Atua de forma improvisada.",
      acao_geral: "Aprender conceitos básicos de escopo, prazo, risco e status.",
      acao_individual: "Estruturar um projeto atual usando template básico (escopo, prazo, responsáveis, riscos).",
      acao_coletiva: "Implementar reunião semanal de status de 15 min com stakeholders do projeto.",
      prazo_sugerido: 21,
      prazo_revisao: 10,
      indicador_sucesso: "Projeto estruturado em template. Reunião de status acontecendo semanalmente com ata documentada.",
      curso_codigo: "2.3",
      curso_nome: "Fundamentos de Gestão de Projetos"
    },
    consolidacao: {
      interpretacao: "Você conduz projetos com método, mas ainda precisa amadurecer rituais, ferramentas e influência.",
      acao_geral: "Aprofundar técnicas e ferramentas ágeis, ampliar comunicação.",
      acao_individual: "Implementar kanban ou board visual para gestão do projeto atual.",
      acao_coletiva: "Conduzir retrospectiva com a equipe ao final de cada sprint/fase do projeto.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Board visual em uso ativo pela equipe. Pelo menos 2 retrospectivas realizadas com ações implementadas.",
      curso_codigo: "2.3",
      curso_nome: "Fundamentos da Gestão Ágil"
    },
    estrategico: {
      interpretacao: "Você atua com visão sistêmica, conecta projetos à estratégia e mobiliza stakeholders com eficácia.",
      acao_geral: "Liderar portfólios e disseminar melhores práticas de gestão.",
      acao_individual: "Criar visão consolidada do portfólio de projetos da área com interdependências mapeadas.",
      acao_coletiva: "Estabelecer fórum mensal de gestão de portfólio com líderes de projeto.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Visão de portfólio documentada e atualizada. Fórum de portfólio funcionando com decisões de priorização registradas.",
      curso_codigo: "2.4",
      curso_nome: "PMO e Gestão de Portfólio"
    }
  },

  // Pilar 5: Liderança e Influência
  5: {
    fundamentacao: {
      interpretacao: "Você atua de forma isolada, tem dificuldade em inspirar ou engajar pessoas.",
      acao_geral: "Desenvolver escuta, dar feedbacks e criar ambiente de segurança.",
      acao_individual: "Praticar escuta ativa em todas as reuniões e dar pelo menos 2 feedbacks construtivos por semana.",
      acao_coletiva: "Criar momento semanal de 15 min para check-in emocional com a equipe.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Feedback se tornou prática regular. Check-in semanal acontecendo com participação engajada da equipe.",
      curso_codigo: "3.1",
      curso_nome: "Fundamentos da Liderança"
    },
    consolidacao: {
      interpretacao: "Você exercita influência e liderança, mas com impacto ainda limitado ou inconsistente.",
      acao_geral: "Consolidar estilo próprio, praticar reconhecimento e influência lateral.",
      acao_individual: "Mapear seu estilo de liderança e identificar 2 pontos de desenvolvimento.",
      acao_coletiva: "Implementar sistema de reconhecimento público de contribuições na equipe.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Autoavaliação de liderança documentada com plano de desenvolvimento. Sistema de reconhecimento funcionando.",
      curso_codigo: "3.5",
      curso_nome: "Desenvolvimento de Lideranças"
    },
    estrategico: {
      interpretacao: "Você lidera com propósito, engaja naturalmente, influencia além da equipe e gera alto desempenho.",
      acao_geral: "Ser mentor de líderes, influenciar cultura e multiplicar boas práticas.",
      acao_individual: "Estruturar programa de mentoria com encontros quinzenais.",
      acao_coletiva: "Criar comunidade de prática de liderança na organização.",
      prazo_sugerido: 60,
      prazo_revisao: 30,
      indicador_sucesso: "Mentorar ativamente 2-3 líderes. Comunidade de prática com encontros regulares e pauta definida.",
      curso_codigo: "3.3",
      curso_nome: "Cultura Organizacional e Engajamento"
    }
  },

  // Pilar 6: Inovação e Criatividade
  6: {
    fundamentacao: {
      interpretacao: "Você é pouco criativo, evita mudanças e raramente explora novas ideias ou ferramentas.",
      acao_geral: "Estimular curiosidade, aprender novas abordagens, experimentar sem medo.",
      acao_individual: "Dedicar 2h por semana para explorar uma ferramenta ou metodologia nova.",
      acao_coletiva: "Propor sessão mensal de 'Show & Tell' para compartilhar aprendizados com a equipe.",
      prazo_sugerido: 30,
      prazo_revisao: 15,
      indicador_sucesso: "Ter explorado pelo menos 2 ferramentas/metodologias novas. Sessão de Show & Tell realizada com participação da equipe.",
      curso_codigo: "4.1",
      curso_nome: "Transformação Digital"
    },
    consolidacao: {
      interpretacao: "Você traz ideias e soluções, mas ainda hesita em inovar com regularidade ou impacto.",
      acao_geral: "Praticar prototipagem, buscar benchmarks e diversidade de inspiração.",
      acao_individual: "Prototipar uma solução para um problema recorrente da área.",
      acao_coletiva: "Organizar visita técnica ou benchmark com empresa referência do setor.",
      prazo_sugerido: 45,
      prazo_revisao: 20,
      indicador_sucesso: "Protótipo testado e feedback coletado. Benchmark realizado com aprendizados documentados.",
      curso_codigo: "4.2",
      curso_nome: "Metodologias Ágeis e Inovação"
    },
    estrategico: {
      interpretacao: "Você inova de forma contínua, traz soluções fora da curva e influencia transformação no ambiente.",
      acao_geral: "Liderar laboratórios de inovação, fomentar cultura experimental.",
      acao_individual: "Criar framework de experimentação rápida para a área.",
      acao_coletiva: "Estabelecer 'Innovation Time' - tempo protegido para experimentação na equipe.",
      prazo_sugerido: 60,
      prazo_revisao: 30,
      indicador_sucesso: "Framework de experimentação documentado e em uso. Innovation Time acontecendo regularmente com experimentos concluídos.",
      curso_codigo: "4.4",
      curso_nome: "Inteligência Artificial e Automação"
    }
  }
};
