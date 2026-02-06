import { Compass, CheckCircle2, Building2, FolderKanban, Users, Lightbulb } from "lucide-react";

export type StageKey = "fundamentacao" | "consolidacao" | "estrategico";

export interface Stage {
  key: StageKey;
  label: string;
  range: string;
}

export interface Pillar {
  id: number;
  name: string;
  icon: typeof Compass;
}

export interface TrackingTemplateData {
  acaoGeral: string;
  acaoIndividual: string;
  acaoColetiva: string;
  prazoSugerido: number;
  prazoRevisao: number;
  indicadorSucesso: string;
  curso: string;
  cursoCode: string;
}

export const stages: Stage[] = [
  { key: "fundamentacao", label: "Fundamentação", range: "0-33%" },
  { key: "consolidacao", label: "Consolidação", range: "34-66%" },
  { key: "estrategico", label: "Estratégico", range: "67-100%" },
];

export const pillars: Pillar[] = [
  { id: 1, name: "Pensamento Estratégico", icon: Compass },
  { id: 2, name: "Execução e Disciplina", icon: CheckCircle2 },
  { id: 3, name: "Execução e Cultura Corporativa", icon: Building2 },
  { id: 4, name: "Gestão de Projetos", icon: FolderKanban },
  { id: 5, name: "Liderança e Influência", icon: Users },
  { id: 6, name: "Inovação e Criatividade", icon: Lightbulb },
];

export const trackingData: Record<number, Record<StageKey, TrackingTemplateData>> = {
  // Pilar 1: Pensamento Estratégico
  1: {
    fundamentacao: {
      acaoGeral: "Trabalhar clareza de propósito, ampliar entendimento do negócio e uso de dados.",
      acaoIndividual: "Estudar o planejamento estratégico da empresa e mapear como suas entregas contribuem para os objetivos organizacionais.",
      acaoColetiva: "Promover reuniões de alinhamento estratégico com a equipe para compartilhar a visão do negócio e conectar tarefas diárias aos objetivos maiores.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Concluir seu mapeamento pessoal de contribuição estratégica. Em seguida, propor à liderança um workshop para alinhar as entregas individuais da equipe aos objetivos estratégicos da área.",
      curso: "Fundamentos de Estratégia",
      cursoCode: "1.1",
    },
    consolidacao: {
      acaoGeral: "Participar de fóruns estratégicos e desenvolver pensamento crítico.",
      acaoIndividual: "Analisar tendências de mercado e preparar um resumo executivo com insights para a liderança.",
      acaoColetiva: "Facilitar uma sessão de pensamento estratégico com áreas adjacentes para identificar sinergias e oportunidades.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Apresentar análise de tendências à liderança e conduzir pelo menos uma sessão cross-funcional de alinhamento estratégico.",
      curso: "Execução Estratégica",
      cursoCode: "1.2",
    },
    estrategico: {
      acaoGeral: "Assumir papéis de cocriação estratégica e mentoria.",
      acaoIndividual: "Documentar seu modelo mental de análise estratégica e criar um framework replicável.",
      acaoColetiva: "Mentorar 2-3 profissionais em pensamento estratégico e participar ativamente de fóruns de decisão da empresa.",
      prazoSugerido: 60,
      prazoRevisao: 30,
      indicadorSucesso: "Ter framework documentado e adotado pela área. Ter mentorados com evolução demonstrável em pensamento estratégico.",
      curso: "Governança e Estrutura Organizacional",
      cursoCode: "1.7",
    },
  },
  // Pilar 2: Execução e Disciplina
  2: {
    fundamentacao: {
      acaoGeral: "Criar rotina de organização, foco em metas e rituais de execução simples.",
      acaoIndividual: "Implementar uma rotina diária de planejamento (15 min) e um sistema de acompanhamento de tarefas.",
      acaoColetiva: "Propor à equipe um ritual semanal de 30 min para revisar prioridades e remover impedimentos.",
      prazoSugerido: 21,
      prazoRevisao: 10,
      indicadorSucesso: "Manter rotina de planejamento por 3 semanas consecutivas. Ter ritual de equipe funcionando com participação ativa.",
      curso: "Fundamentos da Excelência Operacional",
      cursoCode: "2.1",
    },
    consolidacao: {
      acaoGeral: "Aprimorar consistência e capacidade de ajuste durante a execução.",
      acaoIndividual: "Implementar revisões semanais de progresso e criar sistema de métricas pessoais de execução.",
      acaoColetiva: "Estabelecer rituais de acompanhamento quinzenal com stakeholders para calibrar prioridades.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Ter dashboard pessoal de execução funcionando. Rituais de calibração com stakeholders estabelecidos.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
    },
    estrategico: {
      acaoGeral: "Atuar como multiplicador da cultura de execução e mentor de performance.",
      acaoIndividual: "Sistematizar suas práticas de execução em um playbook replicável.",
      acaoColetiva: "Treinar a equipe nas práticas do playbook e criar sistema de reconhecimento por execução consistente.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Playbook documentado e em uso pela equipe. Pelo menos 3 pessoas aplicando as práticas com resultados mensuráveis.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
    },
  },
  // Pilar 3: Execução e Cultura Corporativa
  3: {
    fundamentacao: {
      acaoGeral: "Mapear processos, comunicar prioridades, promover alinhamento cultural.",
      acaoIndividual: "Documentar os 3 processos mais críticos da sua área de atuação.",
      acaoColetiva: "Conduzir sessão de alinhamento com a equipe sobre valores e comportamentos esperados na execução.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Processos críticos documentados e compartilhados. Equipe alinhada em pelo menos 3 comportamentos-chave de execução.",
      curso: "Mapeamento e Melhoria de Processos (BPM)",
      cursoCode: "2.2",
    },
    consolidacao: {
      acaoGeral: "Reforçar disciplina na liderança, institucionalizar práticas.",
      acaoIndividual: "Criar checklist de boas práticas de execução para onboarding de novos membros.",
      acaoColetiva: "Implementar rituais mensais de reconhecimento de boas práticas de execução na equipe.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Checklist de onboarding em uso. Ritual de reconhecimento funcionando com engajamento da equipe.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
    },
    estrategico: {
      acaoGeral: "Escalar boas práticas, tornar-se benchmark, desenvolver cultura de melhoria contínua.",
      acaoIndividual: "Documentar caso de sucesso da área para compartilhamento interno.",
      acaoColetiva: "Liderar iniciativa cross-funcional de disseminação de boas práticas de execução.",
      prazoSugerido: 60,
      prazoRevisao: 30,
      indicadorSucesso: "Caso documentado e apresentado para outras áreas. Pelo menos 2 áreas adotando práticas originadas na sua equipe.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
    },
  },
  // Pilar 4: Gestão de Projetos
  4: {
    fundamentacao: {
      acaoGeral: "Aprender conceitos básicos de escopo, prazo, risco e status.",
      acaoIndividual: "Estruturar um projeto atual usando template básico (escopo, prazo, responsáveis, riscos).",
      acaoColetiva: "Implementar reunião semanal de status de 15 min com stakeholders do projeto.",
      prazoSugerido: 21,
      prazoRevisao: 10,
      indicadorSucesso: "Projeto estruturado em template. Reunião de status acontecendo semanalmente com ata documentada.",
      curso: "Fundamentos de Gestão de Projetos",
      cursoCode: "2.3",
    },
    consolidacao: {
      acaoGeral: "Aprofundar técnicas e ferramentas ágeis, ampliar comunicação.",
      acaoIndividual: "Implementar kanban ou board visual para gestão do projeto atual.",
      acaoColetiva: "Conduzir retrospectiva com a equipe ao final de cada sprint/fase do projeto.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Board visual em uso ativo pela equipe. Pelo menos 2 retrospectivas realizadas com ações implementadas.",
      curso: "Fundamentos da Gestão Ágil",
      cursoCode: "2.3",
    },
    estrategico: {
      acaoGeral: "Liderar portfólios e disseminar melhores práticas de gestão.",
      acaoIndividual: "Criar visão consolidada do portfólio de projetos da área com interdependências mapeadas.",
      acaoColetiva: "Estabelecer fórum mensal de gestão de portfólio com líderes de projeto.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Visão de portfólio documentada e atualizada. Fórum de portfólio funcionando com decisões de priorização registradas.",
      curso: "PMO e Gestão de Portfólio",
      cursoCode: "2.4",
    },
  },
  // Pilar 5: Liderança e Influência
  5: {
    fundamentacao: {
      acaoGeral: "Desenvolver escuta, dar feedbacks e criar ambiente de segurança.",
      acaoIndividual: "Praticar escuta ativa em todas as reuniões e dar pelo menos 2 feedbacks construtivos por semana.",
      acaoColetiva: "Criar momento semanal de 15 min para check-in emocional com a equipe.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Feedback se tornou prática regular. Check-in semanal acontecendo com participação engajada da equipe.",
      curso: "Fundamentos da Liderança",
      cursoCode: "3.1",
    },
    consolidacao: {
      acaoGeral: "Consolidar estilo próprio, praticar reconhecimento e influência lateral.",
      acaoIndividual: "Mapear seu estilo de liderança e identificar 2 pontos de desenvolvimento.",
      acaoColetiva: "Implementar sistema de reconhecimento público de contribuições na equipe.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Autoavaliação de liderança documentada com plano de desenvolvimento. Sistema de reconhecimento funcionando.",
      curso: "Desenvolvimento de Lideranças",
      cursoCode: "3.5",
    },
    estrategico: {
      acaoGeral: "Ser mentor de líderes, influenciar cultura e multiplicar boas práticas.",
      acaoIndividual: "Estruturar programa de mentoria com encontros quinzenais.",
      acaoColetiva: "Criar comunidade de prática de liderança na organização.",
      prazoSugerido: 60,
      prazoRevisao: 30,
      indicadorSucesso: "Mentorar ativamente 2-3 líderes. Comunidade de prática com encontros regulares e pauta definida.",
      curso: "Cultura Organizacional e Engajamento",
      cursoCode: "3.3",
    },
  },
  // Pilar 6: Inovação e Criatividade
  6: {
    fundamentacao: {
      acaoGeral: "Estimular curiosidade, aprender novas abordagens, experimentar sem medo.",
      acaoIndividual: "Dedicar 2h por semana para explorar uma ferramenta ou metodologia nova.",
      acaoColetiva: "Propor sessão mensal de 'Show & Tell' para compartilhar aprendizados com a equipe.",
      prazoSugerido: 30,
      prazoRevisao: 15,
      indicadorSucesso: "Ter explorado pelo menos 2 ferramentas/metodologias novas. Sessão de Show & Tell realizada com participação da equipe.",
      curso: "Transformação Digital",
      cursoCode: "4.1",
    },
    consolidacao: {
      acaoGeral: "Praticar prototipagem, buscar benchmarks e diversidade de inspiração.",
      acaoIndividual: "Prototipar uma solução para um problema recorrente da área.",
      acaoColetiva: "Organizar visita técnica ou benchmark com empresa referência do setor.",
      prazoSugerido: 45,
      prazoRevisao: 20,
      indicadorSucesso: "Protótipo testado e feedback coletado. Benchmark realizado com aprendizados documentados.",
      curso: "Metodologias Ágeis e Inovação",
      cursoCode: "4.2",
    },
    estrategico: {
      acaoGeral: "Liderar laboratórios de inovação, fomentar cultura experimental.",
      acaoIndividual: "Criar framework de experimentação rápida para a área.",
      acaoColetiva: "Estabelecer 'Innovation Time' - tempo protegido para experimentação na equipe.",
      prazoSugerido: 60,
      prazoRevisao: 30,
      indicadorSucesso: "Framework de experimentação documentado e em uso. Innovation Time acontecendo regularmente com experimentos concluídos.",
      curso: "Inteligência Artificial e Automação",
      cursoCode: "4.4",
    },
  },
};
