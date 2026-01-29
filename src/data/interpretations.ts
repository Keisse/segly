import type { LeadData } from "@/components/LeadCaptureForm";
import type { MaturityStage } from "./diagnosticQuestions";

export interface Course {
  id: string;
  name: string;
  description: string;
  duration?: string;
  level?: string;
  url?: string;
}

export interface Interpretation {
  title: string;
  description: string;
  actions: string[];
  courses: Course[];
}

// Categorias de porte para simplificar a lógica
type PorteCategory = "pequeno" | "medio" | "grande";
type CargoCategory = "lideranca" | "gestao" | "operacional";

const getPorteCategory = (porte: string): PorteCategory => {
  const pequeno = ["Autônomo", "2 - 10 funcionários", "11 - 50 funcionários"];
  const medio = ["51 - 200 funcionários", "201 - 500 funcionários"];
  
  if (pequeno.includes(porte)) return "pequeno";
  if (medio.includes(porte)) return "medio";
  return "grande";
};

const getCargoCategory = (cargo: string): CargoCategory => {
  const lideranca = ["C-level", "Diretor(a)"];
  const gestao = ["Gerente", "Coordenador(a)/Supervisor(a)"];
  
  if (lideranca.includes(cargo)) return "lideranca";
  if (gestao.includes(cargo)) return "gestao";
  return "operacional";
};

// Cursos placeholder - SUBSTITUA PELA LISTA REAL
const coursesDatabase: Record<string, Course[]> = {
  fundamentacao_lideranca: [
    {
      id: "fund-lid-1",
      name: "Fundamentos de Execução para Líderes",
      description: "Desenvolva as bases da execução estratégica e aprenda a criar planos de ação eficazes.",
      duration: "8 horas",
      level: "Básico",
    },
    {
      id: "fund-lid-2",
      name: "Disciplina e Foco na Alta Gestão",
      description: "Técnicas para manter a consistência na execução mesmo em ambientes de alta pressão.",
      duration: "6 horas",
      level: "Básico",
    },
  ],
  fundamentacao_gestao: [
    {
      id: "fund-gest-1",
      name: "Gestão de Projetos Essencial",
      description: "Aprenda os fundamentos de gestão de projetos e como transformar ideias em resultados.",
      duration: "12 horas",
      level: "Básico",
    },
    {
      id: "fund-gest-2",
      name: "Produtividade para Gestores",
      description: "Ferramentas e técnicas para aumentar sua produtividade e da sua equipe.",
      duration: "8 horas",
      level: "Básico",
    },
  ],
  fundamentacao_operacional: [
    {
      id: "fund-op-1",
      name: "Autogestão e Produtividade Pessoal",
      description: "Desenvolva habilidades de organização, priorização e gestão do tempo.",
      duration: "6 horas",
      level: "Básico",
    },
    {
      id: "fund-op-2",
      name: "Pensamento Estratégico para Analistas",
      description: "Aprenda a conectar suas atividades com os objetivos maiores da organização.",
      duration: "4 horas",
      level: "Básico",
    },
  ],
  consolidacao_lideranca: [
    {
      id: "cons-lid-1",
      name: "Liderança de Alta Performance",
      description: "Desenvolva um estilo de liderança que inspire resultados excepcionais.",
      duration: "16 horas",
      level: "Intermediário",
    },
    {
      id: "cons-lid-2",
      name: "Cultura Organizacional e Execução",
      description: "Como criar e manter uma cultura de alta performance na sua organização.",
      duration: "12 horas",
      level: "Intermediário",
    },
  ],
  consolidacao_gestao: [
    {
      id: "cons-gest-1",
      name: "Gestão Avançada de Projetos",
      description: "Metodologias ágeis e tradicionais para gestão de projetos complexos.",
      duration: "20 horas",
      level: "Intermediário",
    },
    {
      id: "cons-gest-2",
      name: "Influência e Negociação",
      description: "Técnicas para influenciar stakeholders e negociar recursos para suas iniciativas.",
      duration: "10 horas",
      level: "Intermediário",
    },
  ],
  consolidacao_operacional: [
    {
      id: "cons-op-1",
      name: "De Analista a Líder",
      description: "Prepare-se para assumir posições de liderança desenvolvendo competências essenciais.",
      duration: "12 horas",
      level: "Intermediário",
    },
    {
      id: "cons-op-2",
      name: "Inovação e Criatividade na Prática",
      description: "Ferramentas para gerar ideias inovadoras e implementá-las no dia a dia.",
      duration: "8 horas",
      level: "Intermediário",
    },
  ],
  estrategico_lideranca: [
    {
      id: "estr-lid-1",
      name: "Transformação Organizacional",
      description: "Lidere mudanças em larga escala e transforme a cultura da sua organização.",
      duration: "24 horas",
      level: "Avançado",
    },
    {
      id: "estr-lid-2",
      name: "Mentoria para Executivos",
      description: "Desenvolva a próxima geração de líderes na sua organização.",
      duration: "16 horas",
      level: "Avançado",
    },
  ],
  estrategico_gestao: [
    {
      id: "estr-gest-1",
      name: "Programa de Gerentes de Portfólio",
      description: "Gerencie múltiplos projetos e priorize iniciativas estratégicas.",
      duration: "20 horas",
      level: "Avançado",
    },
    {
      id: "estr-gest-2",
      name: "Liderança Estratégica",
      description: "Desenvolva visão estratégica e prepare-se para posições de diretoria.",
      duration: "16 horas",
      level: "Avançado",
    },
  ],
  estrategico_operacional: [
    {
      id: "estr-op-1",
      name: "Especialização em Alta Performance",
      description: "Torne-se referência técnica e influencie decisões estratégicas.",
      duration: "14 horas",
      level: "Avançado",
    },
    {
      id: "estr-op-2",
      name: "Programa de Desenvolvimento de Líderes",
      description: "Prepare-se para assumir posições de gestão com confiança.",
      duration: "20 horas",
      level: "Avançado",
    },
  ],
};

// Interpretações por estágio, cargo e porte
const interpretationsData: Record<string, Record<CargoCategory, Record<PorteCategory, Interpretation>>> = {
  fundamentacao: {
    lideranca: {
      pequeno: {
        title: "Construindo as Bases da Liderança Executiva",
        description: "Como líder de uma empresa em crescimento, você está em um momento crucial para estabelecer as fundações de uma cultura de execução. Sua organização precisa de processos claros e uma visão bem definida para escalar de forma sustentável.",
        actions: [
          "Defina rituais de planejamento e revisão semanais com sua equipe",
          "Crie um sistema simples de acompanhamento de metas e OKRs",
          "Estabeleça uma rotina de feedback regular com seus líderes diretos",
          "Documente os processos críticos para garantir consistência",
        ],
        courses: [],
      },
      medio: {
        title: "Estruturando a Execução na Média Empresa",
        description: "Como executivo de uma empresa de médio porte, você enfrenta o desafio de profissionalizar a gestão enquanto mantém a agilidade. É hora de criar sistemas que permitam escalar a execução.",
        actions: [
          "Implemente um PMO ou estrutura de governança de projetos",
          "Desenvolva líderes intermediários para distribuir a execução",
          "Crie dashboards de acompanhamento para visibilidade executiva",
          "Estabeleça uma cadência de reuniões estratégicas mensais",
        ],
        courses: [],
      },
      grande: {
        title: "Alinhando a Execução Corporativa",
        description: "Em uma grande organização, garantir que a estratégia se traduza em execução consistente é um desafio complexo. É fundamental criar mecanismos de alinhamento e accountability em toda a estrutura.",
        actions: [
          "Revise o sistema de cascateamento de metas da organização",
          "Implemente programas de desenvolvimento de liderança",
          "Crie fóruns de alinhamento entre diferentes áreas",
          "Estabeleça métricas de execução no nível corporativo",
        ],
        courses: [],
      },
    },
    gestao: {
      pequeno: {
        title: "Desenvolvendo Competências de Gestão",
        description: "Como gestor em uma empresa menor, você frequentemente usa múltiplos chapéus. Desenvolver habilidades de planejamento e execução vai ajudá-lo a ser mais eficiente e impactar diretamente nos resultados.",
        actions: [
          "Crie um sistema pessoal de gestão de tarefas e prioridades",
          "Estabeleça check-ins semanais com sua equipe",
          "Aprenda a delegar de forma eficaz para crescer",
          "Documente processos para não depender apenas de você",
        ],
        courses: [],
      },
      medio: {
        title: "Profissionalizando a Gestão de Equipes",
        description: "Na média empresa, você precisa equilibrar execução tática com pensamento estratégico. Desenvolver consistência na entrega e engajamento da equipe são suas principais prioridades.",
        actions: [
          "Implemente metodologias ágeis ou híbridas na sua área",
          "Desenvolva um plano de desenvolvimento para sua equipe",
          "Crie rituais de retrospectiva e melhoria contínua",
          "Estabeleça SLAs claros com áreas parceiras",
        ],
        courses: [],
      },
      grande: {
        title: "Navegando a Complexidade Corporativa",
        description: "Em grandes organizações, gestores enfrentam burocracia e múltiplos stakeholders. Desenvolver habilidades políticas e de influência é tão importante quanto a execução técnica.",
        actions: [
          "Mapeie os stakeholders-chave e construa relacionamentos",
          "Aprenda a navegar os processos de aprovação da empresa",
          "Comunique-se de forma eficaz com diferentes níveis",
          "Alinhe sua área com os objetivos estratégicos corporativos",
        ],
        courses: [],
      },
    },
    operacional: {
      pequeno: {
        title: "Construindo Excelência Individual",
        description: "Em uma empresa menor, sua contribuição individual tem alto impacto. Desenvolver disciplina pessoal e habilidades de execução vai acelerar sua carreira e resultados.",
        actions: [
          "Crie uma rotina matinal de planejamento do dia",
          "Use técnicas como Pomodoro para manter foco",
          "Peça feedback regularmente ao seu gestor",
          "Busque entender como seu trabalho conecta com a estratégia",
        ],
        courses: [],
      },
      medio: {
        title: "Destacando-se no Ambiente Profissional",
        description: "Na média empresa, há oportunidades de crescimento para quem demonstra competência e proatividade. Desenvolver habilidades de execução vai diferenciá-lo.",
        actions: [
          "Assuma projetos desafiadores para demonstrar potencial",
          "Desenvolva habilidades de comunicação e apresentação",
          "Busque mentores dentro da organização",
          "Aprenda sobre as outras áreas da empresa",
        ],
        courses: [],
      },
      grande: {
        title: "Crescendo na Corporação",
        description: "Em grandes empresas, é fácil se perder na estrutura. Para crescer, você precisa se destacar pela consistência na entrega e visibilidade do seu trabalho.",
        actions: [
          "Documente e comunique suas entregas regularmente",
          "Participe de projetos cross-funcionais",
          "Busque programas de desenvolvimento interno",
          "Construa uma rede de relacionamentos na empresa",
        ],
        courses: [],
      },
    },
  },
  consolidacao: {
    lideranca: {
      pequeno: {
        title: "Escalando a Cultura de Execução",
        description: "Você já tem boas práticas estabelecidas. Agora é hora de sistematizá-las e preparar a organização para o próximo nível de crescimento.",
        actions: [
          "Formalize os processos que funcionam em playbooks",
          "Desenvolva a segunda linha de liderança",
          "Implemente métricas de performance mais sofisticadas",
          "Crie programas de reconhecimento por resultados",
        ],
        courses: [],
      },
      medio: {
        title: "Consolidando a Excelência Operacional",
        description: "Sua empresa tem bases sólidas. O próximo passo é criar consistência entre diferentes áreas e desenvolver uma cultura de alta performance organizacional.",
        actions: [
          "Padronize práticas de gestão entre áreas",
          "Implemente um sistema de gestão de talentos",
          "Crie fóruns de melhores práticas entre líderes",
          "Desenvolva uma agenda de inovação estruturada",
        ],
        courses: [],
      },
      grande: {
        title: "Liderando Transformação Corporativa",
        description: "Como executivo de uma grande empresa, você tem a oportunidade de influenciar a cultura organizacional. Use sua posição para acelerar a transformação.",
        actions: [
          "Lidere iniciativas de transformação digital",
          "Patrocine programas de desenvolvimento de líderes",
          "Crie métricas de execução para toda a organização",
          "Promova uma cultura de experimentação e aprendizado",
        ],
        courses: [],
      },
    },
    gestao: {
      pequeno: {
        title: "Tornando-se um Gestor de Referência",
        description: "Você já domina o básico da gestão. Agora é hora de desenvolver habilidades avançadas de liderança e influência para ampliar seu impacto.",
        actions: [
          "Desenvolva competências de coaching para sua equipe",
          "Assuma responsabilidades além da sua área",
          "Crie sistemas escaláveis de gestão",
          "Prepare sucessores para suas responsabilidades atuais",
        ],
        courses: [],
      },
      medio: {
        title: "Expandindo Influência e Impacto",
        description: "Você está pronto para aumentar sua esfera de influência. Desenvolva habilidades estratégicas e prepare-se para posições mais seniores.",
        actions: [
          "Participe de decisões estratégicas da empresa",
          "Desenvolva relacionamentos com a alta liderança",
          "Lidere projetos transformacionais",
          "Mentore outros gestores da organização",
        ],
        courses: [],
      },
      grande: {
        title: "Preparando-se para a Liderança Sênior",
        description: "Em uma grande corporação, você está no caminho para posições de diretoria. Desenvolva visão estratégica e habilidades políticas avançadas.",
        actions: [
          "Busque projetos de visibilidade executiva",
          "Desenvolva expertise em áreas adjacentes",
          "Construa uma marca pessoal forte internamente",
          "Participe de programas de high potentials",
        ],
        courses: [],
      },
    },
    operacional: {
      pequeno: {
        title: "Preparando-se para Liderar",
        description: "Você demonstra maturidade acima da média. É hora de desenvolver habilidades de liderança e preparar-se para assumir responsabilidades de gestão.",
        actions: [
          "Assuma a liderança informal de projetos",
          "Desenvolva habilidades de facilitação e comunicação",
          "Busque feedback 360 para identificar gaps",
          "Proponha melhorias de processo para sua área",
        ],
        courses: [],
      },
      medio: {
        title: "Acelerando para a Gestão",
        description: "Você está pronto para dar o próximo passo na carreira. Foque em desenvolver as competências necessárias para posições de coordenação ou gerência.",
        actions: [
          "Candidate-se a programas de desenvolvimento de líderes",
          "Assuma projetos que envolvam coordenar pessoas",
          "Desenvolva conhecimento do negócio como um todo",
          "Busque um mentor em posição de gestão",
        ],
        courses: [],
      },
      grande: {
        title: "Destacando-se para Crescimento",
        description: "Em grandes empresas, crescer requer visibilidade e networking estratégico. Você tem a base técnica, agora desenvolva as soft skills.",
        actions: [
          "Participe ativamente de grupos de afinidade e comitês",
          "Busque rotações de área para ampliar visão",
          "Desenvolva habilidades de apresentação executiva",
          "Construa relacionamentos com líderes de outras áreas",
        ],
        courses: [],
      },
    },
  },
  estrategico: {
    lideranca: {
      pequeno: {
        title: "Líder Visionário em Ação",
        description: "Você domina a execução e lidera pelo exemplo. Seu próximo desafio é multiplicar essa excelência, desenvolvendo outros líderes e escalando a cultura.",
        actions: [
          "Crie um programa de formação de líderes na empresa",
          "Documente e compartilhe seu modelo de gestão",
          "Busque parcerias e mentoria para outros empreendedores",
          "Explore novas fronteiras de crescimento para o negócio",
        ],
        courses: [],
      },
      medio: {
        title: "Excelência Executiva Consolidada",
        description: "Você é referência em execução estratégica. Mantenha-se atualizado com tendências e prepare a organização para os desafios futuros.",
        actions: [
          "Participe de fóruns executivos e conselhos",
          "Desenvolva uma agenda de inovação disruptiva",
          "Crie parcerias estratégicas para o negócio",
          "Prepare a próxima geração de executivos",
        ],
        courses: [],
      },
      grande: {
        title: "Liderança Transformadora",
        description: "Você está no topo da maturidade em execução. Use sua influência para transformar a organização e deixar um legado duradouro.",
        actions: [
          "Lidere iniciativas de transformação em larga escala",
          "Participe de conselhos e órgãos externos",
          "Desenvolva a próxima geração de C-levels",
          "Crie uma cultura de excelência sustentável",
        ],
        courses: [],
      },
    },
    gestao: {
      pequeno: {
        title: "Gestor de Alta Performance",
        description: "Você demonstra excelência em gestão. Está pronto para assumir desafios maiores e desenvolver outros gestores na organização.",
        actions: [
          "Assuma responsabilidades de diretoria ou sócio",
          "Crie programas de desenvolvimento para sua equipe",
          "Contribua para a estratégia geral do negócio",
          "Busque desenvolvimento em governança e finanças",
        ],
        courses: [],
      },
      medio: {
        title: "Pronto para a Alta Liderança",
        description: "Sua maturidade em execução o qualifica para posições de diretoria. Foque em desenvolver visão estratégica e habilidades de C-level.",
        actions: [
          "Busque posições de diretoria ou VP",
          "Desenvolva competências financeiras e de governança",
          "Amplie sua rede de relacionamentos executivos",
          "Participe de programas de MBA ou educação executiva",
        ],
        courses: [],
      },
      grande: {
        title: "Executivo em Potencial",
        description: "Você tem todas as competências para assumir posições C-level. Posicione-se estrategicamente e busque oportunidades de crescimento.",
        actions: [
          "Converse com a liderança sobre seu plano de carreira",
          "Busque exposição a diferentes unidades de negócio",
          "Desenvolva presença em fóruns externos",
          "Prepare-se para entrevistas de C-level",
        ],
        courses: [],
      },
    },
    operacional: {
      pequeno: {
        title: "Especialista de Alta Performance",
        description: "Você é um profissional excepcional. Pode escolher entre trilhas de especialização técnica ou gestão, ambas com excelentes perspectivas.",
        actions: [
          "Defina sua trilha: especialista ou gestor",
          "Busque certificações ou especializações avançadas",
          "Compartilhe conhecimento através de mentorias",
          "Assuma projetos de alta visibilidade e impacto",
        ],
        courses: [],
      },
      medio: {
        title: "Profissional Destaque",
        description: "Você está pronto para posições de liderança ou especialização sênior. Seu nível de maturidade é raro e valorizado no mercado.",
        actions: [
          "Candidate-se a posições de gestão ou senior specialist",
          "Desenvolva sua marca pessoal no mercado",
          "Busque oportunidades de palestrar e ensinar",
          "Considere empreendedorismo ou consultoria",
        ],
        courses: [],
      },
      grande: {
        title: "Talento de Alto Potencial",
        description: "Você tem maturidade excepcional para sua posição. A empresa provavelmente já o identificou como high potential. Aproveite as oportunidades.",
        actions: [
          "Busque programas de aceleração de carreira",
          "Candidate-se a posições de gestão",
          "Desenvolva relacionamento com sponsors executivos",
          "Prepare-se para assumir desafios de liderança",
        ],
        courses: [],
      },
    },
  },
};

export const getInterpretation = (
  stage: MaturityStage,
  leadData: LeadData
): Interpretation => {
  const stageName = stage.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const stageKey = stageName === "fundamentacao" ? "fundamentacao" : 
                   stageName === "consolidacao" ? "consolidacao" : "estrategico";
  
  const porteCategory = getPorteCategory(leadData.porte);
  const cargoCategory = getCargoCategory(leadData.cargo);
  
  const interpretation = interpretationsData[stageKey]?.[cargoCategory]?.[porteCategory];
  
  if (!interpretation) {
    // Fallback genérico
    return {
      title: `Seu Momento: ${stage.name}`,
      description: stage.description,
      actions: [stage.recommendation],
      courses: [],
    };
  }
  
  // Adicionar cursos baseados no estágio e cargo
  const courseKey = `${stageKey}_${cargoCategory}`;
  const courses = coursesDatabase[courseKey] || [];
  
  return {
    ...interpretation,
    courses,
  };
};
