// Interpretações específicas por pilar, estágio, cargo e porte da empresa
// Seguindo as diretrizes da Allevo para geração de resultados

import type { LeadData } from "@/components/LeadCaptureForm";

type PorteCategory = "pequeno" | "medio" | "grande";
type CargoCategory = "lideranca" | "gestao" | "operacional";
type StageKey = "fundamentacao" | "consolidacao" | "estrategico";

export interface PillarInterpretation {
  interpretation: string;
  actions: string[];
}

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

// Interpretações base por estágio (usadas como fundação para personalização)
const stageBaseInterpretations: Record<StageKey, { meaning: string; focus: string }> = {
  fundamentacao: {
    meaning: "ausência de base estruturada, com atuação reativa e pouco consistente",
    focus: "aprender fundamentos, criar rotinas básicas e organizar processos",
  },
  consolidacao: {
    meaning: "boas práticas já existem, mas com oscilações e falta de integração",
    focus: "padronizar métodos, ganhar consistência e melhorar execução",
  },
  estrategico: {
    meaning: "domínio do tema, visão sistêmica e influência sobre o ambiente",
    focus: "escalar boas práticas, estruturar governança e desenvolver pessoas",
  },
};

// Interpretações específicas por pilar, estágio, cargo e porte
const pillarInterpretationsData: Record<number, Record<StageKey, Record<CargoCategory, Record<PorteCategory, PillarInterpretation>>>> = {
  // =========================================
  // PILAR 1 - PENSAMENTO ESTRATÉGICO
  // =========================================
  1: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "Como líder de uma empresa em crescimento, você ainda não tem uma base sólida de pensamento estratégico. Suas decisões tendem a ser reativas, respondendo ao dia a dia sem uma visão clara do futuro. Isso é comum em empresas menores, mas pode limitar seu crescimento.",
          actions: [
            "Defina claramente o propósito da sua empresa e comunique-o à equipe",
            "Reserve 2 horas semanais exclusivamente para pensar estrategicamente",
            "Mapeie os 3 fatores mais críticos para o sucesso do seu negócio",
            "Crie o hábito de analisar dados antes de decisões importantes",
          ],
        },
        medio: {
          interpretation: "Na posição de liderança de uma empresa de médio porte, a falta de pensamento estratégico estruturado pode criar desalinhamento entre áreas. Sua equipe pode estar executando bem, mas sem uma direção clara e compartilhada.",
          actions: [
            "Estruture um processo formal de planejamento estratégico anual",
            "Crie rituais de alinhamento estratégico com sua liderança",
            "Desenvolva indicadores que conectem operação à estratégia",
            "Invista em análise de cenários para antecipar mudanças do mercado",
          ],
        },
        grande: {
          interpretation: "Em uma grande organização, a ausência de pensamento estratégico na liderança pode gerar silos e falta de sinergia entre unidades. A complexidade exige uma visão sistêmica que ainda precisa ser desenvolvida.",
          actions: [
            "Participe ativamente dos fóruns de estratégia corporativa",
            "Conecte a estratégia da sua área com os objetivos globais",
            "Desenvolva capacidade de análise de cenários complexos",
            "Crie canais para disseminar a estratégia em todos os níveis",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Como gestor em uma empresa menor, você está muito focado na operação e pouco no pensamento estratégico. Isso é natural dada a necessidade de 'fazer acontecer', mas limita sua capacidade de agregar valor.",
          actions: [
            "Busque entender como seu trabalho conecta com a estratégia do negócio",
            "Converse regularmente com a liderança sobre direção e prioridades",
            "Antes de executar, questione: isso está alinhado com nossos objetivos?",
            "Desenvolva o hábito de analisar dados antes de tomar decisões",
          ],
        },
        medio: {
          interpretation: "Na gestão de uma empresa de médio porte, você precisa equilibrar execução com visão estratégica. A falta de clareza sobre o propósito maior pode fazer sua área operar de forma isolada.",
          actions: [
            "Participe das discussões de planejamento estratégico da empresa",
            "Traduza a estratégia corporativa em objetivos claros para sua área",
            "Desenvolva visão de médio e longo prazo para seu departamento",
            "Crie o hábito de analisar cenários antes de propor iniciativas",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, gestores que não pensam estrategicamente ficam presos à execução operacional. Você precisa elevar sua perspectiva para contribuir com decisões de maior impacto.",
          actions: [
            "Entenda profundamente a estratégia corporativa e seus desdobramentos",
            "Mapeie como sua área contribui para os objetivos organizacionais",
            "Desenvolva relacionamento com áreas estratégicas da empresa",
            "Proponha iniciativas que conectem operação com estratégia",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você está focado nas suas entregas diárias, o que é natural no seu nível. Porém, desenvolver pensamento estratégico vai acelerar seu crescimento e aumentar seu impacto na empresa.",
          actions: [
            "Pergunte ao seu gestor como seu trabalho contribui para os objetivos",
            "Observe como as decisões estratégicas afetam seu dia a dia",
            "Busque entender o negócio além da sua função específica",
            "Proponha melhorias conectando-as com resultados do negócio",
          ],
        },
        medio: {
          interpretation: "Em uma empresa de médio porte, há mais oportunidades de se conectar com a estratégia. Você ainda não aproveitou esse potencial para entender o propósito maior do seu trabalho.",
          actions: [
            "Participe de reuniões de alinhamento quando possível",
            "Converse com pessoas de diferentes áreas para ampliar sua visão",
            "Entenda os indicadores de sucesso do seu departamento",
            "Conecte suas entregas com os objetivos da área e da empresa",
          ],
        },
        grande: {
          interpretation: "Em grandes organizações, é fácil perder a conexão com a estratégia. Você está executando tarefas sem entender claramente como elas contribuem para algo maior.",
          actions: [
            "Busque informações sobre a estratégia corporativa disponíveis internamente",
            "Entenda como sua área se encaixa na cadeia de valor da empresa",
            "Questione seu gestor sobre as prioridades estratégicas",
            "Identifique como suas entregas impactam clientes ou resultados",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "Você já tem clareza sobre a direção do negócio, mas ainda oscila na execução da estratégia. Como líder de empresa em crescimento, o desafio é manter consistência no pensamento estratégico.",
          actions: [
            "Formalize seu processo de planejamento estratégico",
            "Crie rituais mensais de revisão estratégica com a equipe",
            "Desenvolva indicadores para monitorar a execução da estratégia",
            "Comunique regularmente a visão e prioridades para todos",
          ],
        },
        medio: {
          interpretation: "Sua empresa já possui direcionamento estratégico, mas falta integração entre áreas. Como líder, você precisa garantir que a estratégia permeie todas as decisões.",
          actions: [
            "Alinhe os objetivos de todas as áreas com a estratégia central",
            "Crie fóruns cross-funcionais para discussão estratégica",
            "Desenvolva sua equipe de liderança em pensamento estratégico",
            "Implemente um sistema de gestão estratégica (OKRs, BSC)",
          ],
        },
        grande: {
          interpretation: "A estratégia existe, mas sua execução é inconsistente nas diferentes unidades. Você precisa fortalecer a governança estratégica para garantir alinhamento.",
          actions: [
            "Participe ativamente da governança estratégica corporativa",
            "Garanta que sua área traduza a estratégia em planos táticos",
            "Desenvolva métricas de alinhamento estratégico",
            "Promova a cultura de pensamento estratégico em sua liderança",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você entende a estratégia e busca aplicá-la, mas ainda há oscilações. O próximo passo é criar consistência entre pensamento e ação estratégica.",
          actions: [
            "Alinhe regularmente suas prioridades com a liderança",
            "Desenvolva planos de médio prazo para sua área",
            "Use dados e análises para embasar suas propostas",
            "Comunique a conexão entre atividades da equipe e estratégia",
          ],
        },
        medio: {
          interpretation: "Você já pensa estrategicamente, mas precisa desenvolver maior consistência e integração com outras áreas. A visão sistêmica ainda está em construção.",
          actions: [
            "Participe de iniciativas cross-funcionais estratégicas",
            "Desenvolva cenários e planos de contingência para sua área",
            "Contribua ativamente nas discussões de planejamento",
            "Mentore sua equipe em pensamento estratégico",
          ],
        },
        grande: {
          interpretation: "Você navega bem a estratégia corporativa, mas a complexidade organizacional ainda limita sua visão sistêmica. Há oportunidade de ampliar sua influência estratégica.",
          actions: [
            "Busque projetos estratégicos de alta visibilidade",
            "Desenvolva relacionamentos com stakeholders seniores",
            "Aprofunde seu conhecimento do modelo de negócio completo",
            "Proponha iniciativas que gerem impacto organizacional",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você já demonstra boa compreensão do propósito do seu trabalho. O próximo passo é aprofundar sua visão estratégica para aumentar seu impacto.",
          actions: [
            "Proponha melhorias com visão de impacto no negócio",
            "Desenvolva habilidades de análise de dados",
            "Busque feedback sobre como elevar sua contribuição estratégica",
            "Prepare-se para assumir responsabilidades maiores",
          ],
        },
        medio: {
          interpretation: "Você conecta bem seu trabalho com objetivos maiores. Está pronto para desenvolver uma visão mais ampla e contribuir em discussões estratégicas.",
          actions: [
            "Participe de projetos que exponham você à estratégia",
            "Desenvolva visão de processos além da sua função",
            "Busque mentores em posições estratégicas",
            "Proponha soluções que considerem múltiplas perspectivas",
          ],
        },
        grande: {
          interpretation: "Você tem boa leitura estratégica para seu nível. Em uma grande empresa, isso é diferencial. Aproveite para ampliar sua visão e influência.",
          actions: [
            "Participe de programas de desenvolvimento de talentos",
            "Busque rotações de área para ampliar visão do negócio",
            "Contribua em fóruns e comitês quando possível",
            "Desenvolva apresentações executivas de suas análises",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você domina o pensamento estratégico e lidera com visão clara. Seu próximo desafio é multiplicar essa capacidade, desenvolvendo outros líderes estratégicos.",
          actions: [
            "Documente e compartilhe seu processo de análise estratégica",
            "Desenvolva a próxima geração de líderes da empresa",
            "Crie governança para sustentar a excelência estratégica",
            "Busque inspiração externa através de conselhos e mentorias",
          ],
        },
        medio: {
          interpretation: "Sua visão estratégica é referência na organização. O desafio é institucionalizar essa capacidade para que ela não dependa apenas de você.",
          actions: [
            "Estruture um programa de formação estratégica para líderes",
            "Formalize a governança estratégica da empresa",
            "Desenvolva parcerias estratégicas externas",
            "Prepare sucessores com a mesma visão sistêmica",
          ],
        },
        grande: {
          interpretation: "Você tem domínio estratégico em ambiente complexo. Sua influência pode transformar a organização. Use essa posição para deixar legado.",
          actions: [
            "Lidere transformações estratégicas de grande escala",
            "Participe de conselhos e fóruns externos de estratégia",
            "Desenvolva a capacidade estratégica institucional",
            "Mentore a próxima geração de executivos",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você pensa e age estrategicamente de forma natural. Em uma empresa menor, isso o qualifica para assumir responsabilidades de liderança sênior.",
          actions: [
            "Contribua ativamente para a estratégia do negócio",
            "Prepare-se para posições de diretoria ou sócio",
            "Desenvolva visão de governança e modelo de negócio",
            "Mentore outros gestores em pensamento estratégico",
          ],
        },
        medio: {
          interpretation: "Sua maturidade estratégica é diferenciada. Você está pronto para posições de diretoria onde poderá influenciar a estratégia corporativa.",
          actions: [
            "Busque posições de maior responsabilidade estratégica",
            "Desenvolva competências de C-level (finanças, governança)",
            "Amplie sua rede de relacionamentos estratégicos",
            "Lidere iniciativas de transformação organizacional",
          ],
        },
        grande: {
          interpretation: "Você demonstra capacidade estratégica de nível executivo. Sua visão sistêmica o diferencia e o prepara para posições C-level.",
          actions: [
            "Posicione-se para oportunidades de diretoria/VP",
            "Desenvolva visibilidade com a alta liderança",
            "Participe de programas de high potentials",
            "Contribua para a estratégia corporativa em fóruns formais",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Sua capacidade estratégica é excepcional para seu nível. Você está pronto para assumir responsabilidades de gestão ou especialização sênior.",
          actions: [
            "Candidate-se a posições de liderança",
            "Desenvolva habilidades de gestão de pessoas",
            "Busque projetos de alta visibilidade estratégica",
            "Considere especialização técnica de alto nível",
          ],
        },
        medio: {
          interpretation: "Você pensa estrategicamente acima do esperado para sua posição. A empresa provavelmente já o identificou como talento de alto potencial.",
          actions: [
            "Participe de programas de aceleração de carreira",
            "Assuma projetos que envolvam decisões estratégicas",
            "Desenvolva sua marca pessoal como pensador estratégico",
            "Prepare-se para gestão ou especialização avançada",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, sua visão estratégica é rara em nível operacional. Isso é um grande diferencial para crescimento acelerado.",
          actions: [
            "Busque sponsors entre a liderança sênior",
            "Participe de programas de talentos e sucessão",
            "Desenvolva exposição a diferentes unidades de negócio",
            "Prepare-se para assumir posições de gestão",
          ],
        },
      },
    },
  },
  
  // =========================================
  // PILAR 2 - EXECUÇÃO E DISCIPLINA
  // =========================================
  2: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "Como líder de uma empresa em crescimento, você ainda não estabeleceu disciplina consistente de execução. Planos são feitos, mas o acompanhamento falha e as prioridades mudam frequentemente.",
          actions: [
            "Estabeleça um ritual semanal de planejamento e revisão",
            "Defina poucas prioridades e mantenha foco absoluto nelas",
            "Crie um sistema simples de acompanhamento de metas",
            "Aprenda a dizer 'não' para proteger o que é prioritário",
          ],
        },
        medio: {
          interpretation: "Na liderança de uma empresa de médio porte, a falta de disciplina na execução cria inconsistência nos resultados. Os processos existem, mas não são seguidos com rigor.",
          actions: [
            "Implemente um sistema formal de gestão de metas (OKRs)",
            "Crie rituais de accountability para toda a liderança",
            "Estabeleça consequências claras para desvios de execução",
            "Modele o comportamento disciplinado que espera dos outros",
          ],
        },
        grande: {
          interpretation: "Em uma grande organização, a falta de disciplina na execução pode estar sendo mascarada pela estrutura. Resultados inconsistentes indicam necessidade de maior rigor.",
          actions: [
            "Revise os processos de gestão de performance da sua área",
            "Implemente rotinas de acompanhamento mais frequentes",
            "Desenvolva cultura de accountability em sua liderança",
            "Crie métricas claras e visíveis para toda a equipe",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Como gestor em empresa menor, você está sobrecarregado e perde foco constantemente. A disciplina na execução sofre pela multiplicidade de demandas.",
          actions: [
            "Crie uma rotina matinal de planejamento do dia",
            "Use técnicas de timeboxing para proteger tempo focado",
            "Estabeleça check-ins curtos diários com sua equipe",
            "Aprenda a priorizar usando critérios objetivos",
          ],
        },
        medio: {
          interpretation: "Na gestão de uma empresa de médio porte, você precisa de maior disciplina para garantir que planos se transformem em resultados consistentes.",
          actions: [
            "Implemente metodologias de gestão de projetos na sua área",
            "Crie rituais semanais de planejamento e revisão",
            "Desenvolva habilidade de priorização estratégica",
            "Estabeleça métricas de acompanhamento da execução",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, gestores sem disciplina de execução perdem credibilidade. Suas entregas são inconsistentes e isso afeta sua reputação.",
          actions: [
            "Adote ferramentas corporativas de gestão de projetos",
            "Crie visibilidade sobre o progresso das suas iniciativas",
            "Desenvolva disciplina pessoal como exemplo para a equipe",
            "Alinhe sua execução com as expectativas dos stakeholders",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você ainda não desenvolveu disciplina pessoal de execução. Suas entregas são inconsistentes e você se distrai facilmente das prioridades.",
          actions: [
            "Crie uma lista diária de prioridades (máximo 3 itens)",
            "Use técnicas como Pomodoro para manter foco",
            "Estabeleça horários fixos para tarefas repetitivas",
            "Peça feedback sobre sua consistência de entrega",
          ],
        },
        medio: {
          interpretation: "Em uma empresa de médio porte, sua falta de disciplina de execução pode estar limitando seu crescimento. Há expectativa de maior consistência.",
          actions: [
            "Desenvolva um sistema pessoal de gestão de tarefas",
            "Comunique proativamente o status das suas entregas",
            "Busque feedback regular sobre sua performance",
            "Celebre pequenas vitórias e aprenda com os desvios",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, profissionais sem disciplina de execução ficam invisíveis ou são vistos negativamente. Consistência é fundamental.",
          actions: [
            "Adote as ferramentas e processos padrão da empresa",
            "Crie visibilidade sobre suas entregas e progresso",
            "Desenvolva reputação de confiabilidade",
            "Busque mentores que demonstrem excelência em execução",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "Você já tem boas práticas de execução, mas ainda oscila. O desafio é criar consistência e sistematizar o que funciona para toda a empresa.",
          actions: [
            "Documente os processos de execução que funcionam",
            "Crie playbooks de gestão para padronizar práticas",
            "Desenvolva sua equipe em disciplina de execução",
            "Implemente revisões periódicas de efetividade",
          ],
        },
        medio: {
          interpretation: "A execução na sua empresa é boa, mas inconsistente entre áreas. Como líder, você precisa nivelar a disciplina em toda a organização.",
          actions: [
            "Padronize práticas de gestão entre departamentos",
            "Crie fóruns de compartilhamento de melhores práticas",
            "Implemente indicadores de disciplina de execução",
            "Desenvolva uma cultura de melhoria contínua",
          ],
        },
        grande: {
          interpretation: "Sua área executa bem, mas há espaço para maior consistência e integração com outras unidades. A disciplina precisa ser institucionalizada.",
          actions: [
            "Contribua para padronização de práticas corporativas",
            "Desenvolva métricas comparativas entre áreas",
            "Promova cultura de excelência operacional",
            "Participe de iniciativas de melhoria organizacional",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você executa com boa disciplina, mas ainda há oscilações. O próximo passo é criar consistência que não dependa apenas do seu esforço individual.",
          actions: [
            "Crie sistemas e processos que garantam continuidade",
            "Desenvolva sua equipe para executar com autonomia",
            "Estabeleça métricas de acompanhamento automáticas",
            "Documente e compartilhe suas melhores práticas",
          ],
        },
        medio: {
          interpretation: "Sua disciplina de execução é boa, mas você precisa elevá-la para influenciar positivamente sua área e além. A consistência é chave.",
          actions: [
            "Torne-se referência em execução para outras áreas",
            "Desenvolva competências de coaching de execução",
            "Implemente metodologias mais robustas de gestão",
            "Busque certificações em gestão de projetos ou processos",
          ],
        },
        grande: {
          interpretation: "Você tem boa disciplina de execução. Em uma grande empresa, isso é diferencial. Agora, amplie sua influência para além da sua área.",
          actions: [
            "Lidere iniciativas cross-funcionais de melhoria",
            "Compartilhe suas práticas em fóruns internos",
            "Busque projetos de maior complexidade e visibilidade",
            "Desenvolva habilidades de gestão de mudança",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você já demonstra boa disciplina de execução. Em uma empresa menor, isso o destaca e abre portas para maiores responsabilidades.",
          actions: [
            "Assuma liderança informal de projetos",
            "Ajude colegas a desenvolverem disciplina",
            "Proponha melhorias de processo para a área",
            "Prepare-se para posições de coordenação",
          ],
        },
        medio: {
          interpretation: "Sua disciplina de execução é acima da média. Você está pronto para assumir mais responsabilidades e desenvolver habilidades de gestão.",
          actions: [
            "Candidate-se a projetos de maior complexidade",
            "Desenvolva habilidades de liderança de equipes",
            "Busque feedback sobre seu potencial de gestão",
            "Participe de programas de desenvolvimento de líderes",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, sua disciplina de execução é diferenciada. Use isso para ganhar visibilidade e acelerar sua carreira.",
          actions: [
            "Busque projetos de alta visibilidade",
            "Desenvolva relacionamentos com gestores seniores",
            "Participe de grupos de melhoria contínua",
            "Prepare-se para oportunidades de promoção",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você domina a execução disciplinada e é exemplo para toda a empresa. Seu desafio é escalar essa excelência conforme a organização cresce.",
          actions: [
            "Crie uma cultura de excelência em execução",
            "Desenvolva sistemas que sustentem o crescimento",
            "Forme líderes com a mesma disciplina",
            "Documente seu modelo de gestão como legado",
          ],
        },
        medio: {
          interpretation: "Sua disciplina de execução é referência no mercado. A empresa se beneficia enormemente da sua capacidade de entregar resultados consistentes.",
          actions: [
            "Institucionalize as práticas de excelência",
            "Desenvolva um programa de formação de gestores",
            "Compartilhe seu conhecimento externamente",
            "Prepare sucessores com a mesma excelência",
          ],
        },
        grande: {
          interpretation: "Você é referência em execução em uma grande organização. Sua influência pode transformar a cultura operacional da empresa.",
          actions: [
            "Lidere transformações operacionais de grande escala",
            "Participe da governança de excelência corporativa",
            "Desenvolva a próxima geração de líderes operacionais",
            "Contribua para a estratégia de excelência da empresa",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Sua excelência em execução o qualifica para responsabilidades de liderança sênior. Você é peça-chave para os resultados da empresa.",
          actions: [
            "Prepare-se para posições de diretoria",
            "Desenvolva visão estratégica além da execução",
            "Mentore outros gestores na disciplina de entrega",
            "Contribua para a estratégia de crescimento do negócio",
          ],
        },
        medio: {
          interpretation: "Sua disciplina de execução é excepcional. Você está pronto para liderar áreas maiores ou múltiplas equipes com a mesma excelência.",
          actions: [
            "Busque posições de maior responsabilidade",
            "Desenvolva competências de liderança de líderes",
            "Lidere programas de transformação operacional",
            "Prepare-se para posições de diretoria",
          ],
        },
        grande: {
          interpretation: "Você demonstra excelência em execução em ambiente complexo. Isso é raro e valorizado. Posicione-se para posições executivas.",
          actions: [
            "Busque visibilidade com a alta liderança",
            "Lidere iniciativas de excelência operacional",
            "Desenvolva competências executivas",
            "Candidate-se a posições de diretoria ou VP",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Sua disciplina de execução é excepcional. Você está pronto para assumir posições de liderança ou se tornar especialista sênior.",
          actions: [
            "Decida entre trilha de gestão ou especialização",
            "Busque posições de coordenação ou supervisão",
            "Desenvolva habilidades de liderança de pessoas",
            "Torne-se mentor de colegas menos experientes",
          ],
        },
        medio: {
          interpretation: "Sua excelência em execução é diferenciada. A empresa provavelmente já o identificou para posições de maior responsabilidade.",
          actions: [
            "Candidate-se a posições de gestão",
            "Participe de programas de high potentials",
            "Desenvolva competências de liderança",
            "Amplie sua influência além da sua área",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, sua disciplina de execução é rara no nível operacional. Você é candidato natural a aceleração de carreira.",
          actions: [
            "Busque sponsors para sua carreira",
            "Participe de programas de sucessão",
            "Desenvolva visibilidade executiva",
            "Prepare-se para assumir gestão de equipes",
          ],
        },
      },
    },
  },
  
  // =========================================
  // PILAR 3 - EXECUÇÃO E CULTURA CORPORATIVA
  // (Avalia o ambiente organizacional)
  // =========================================
  3: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "A cultura da sua empresa ainda não sustenta uma execução consistente. Como líder, você precisa criar os fundamentos de processos, comunicação e valores que guiem a equipe.",
          actions: [
            "Defina e comunique claramente os valores da empresa",
            "Crie processos básicos documentados para as atividades críticas",
            "Estabeleça rituais de comunicação de metas e prioridades",
            "Modele o comportamento que espera ver na organização",
          ],
        },
        medio: {
          interpretation: "A empresa cresceu, mas a cultura de execução não acompanhou. Há inconsistência entre o que é falado e o que é praticado, gerando desengajamento.",
          actions: [
            "Mapeie os processos críticos e padronize-os",
            "Crie fóruns seguros para feedback e aprendizado",
            "Alinhe a liderança em torno de valores e práticas comuns",
            "Implemente programas de desenvolvimento cultural",
          ],
        },
        grande: {
          interpretation: "A cultura corporativa pode estar fragmentada ou desalinhada com a estratégia. Os processos existem, mas não são seguidos de forma consistente.",
          actions: [
            "Diagnostique os gaps culturais da sua área",
            "Alinhe práticas locais com valores corporativos",
            "Crie ambiente de segurança psicológica para sua equipe",
            "Lidere pelo exemplo na coerência entre discurso e prática",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "O ambiente da sua empresa ainda não favorece uma execução consistente. Faltam processos claros e a comunicação de prioridades é inconsistente.",
          actions: [
            "Proponha à liderança a criação de processos básicos",
            "Crie clareza de metas e prioridades para sua equipe",
            "Estabeleça rituais de feedback e aprendizado na sua área",
            "Seja exemplo de alinhamento entre discurso e prática",
          ],
        },
        medio: {
          interpretation: "A cultura da empresa tem pontos a melhorar, especialmente em comunicação e alinhamento. Você pode influenciar positivamente a partir da sua área.",
          actions: [
            "Crie uma microcultura de excelência na sua equipe",
            "Comunique prioridades de forma clara e consistente",
            "Promova diálogo aberto sobre erros e aprendizados",
            "Contribua para iniciativas de melhoria cultural",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, você pode encontrar desalinhamentos culturais. Como gestor, seu papel é garantir que sua equipe tenha clareza e ambiente saudável.",
          actions: [
            "Proteja sua equipe de ruídos e desalinhamentos",
            "Crie rituais de alinhamento e feedback",
            "Promova os valores corporativos na prática diária",
            "Escale problemas culturais através dos canais adequados",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você percebe que faltam processos claros e que a comunicação de prioridades é inconsistente. Isso afeta sua capacidade de entregar com qualidade.",
          actions: [
            "Busque clareza sobre suas prioridades com seu gestor",
            "Documente processos informalmente para seu uso",
            "Contribua com sugestões de melhoria quando apropriado",
            "Adapte-se e mantenha foco no que pode controlar",
          ],
        },
        medio: {
          interpretation: "O ambiente organizacional tem gaps que você percebe. Sua percepção pode contribuir para melhorias se comunicada adequadamente.",
          actions: [
            "Compartilhe feedback construtivo nos canais adequados",
            "Busque entender a perspectiva da liderança",
            "Contribua para um ambiente positivo na sua equipe",
            "Adapte-se enquanto busca influenciar melhorias",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, inconsistências culturais são comuns. Sua percepção mostra maturidade. Foque no que pode influenciar.",
          actions: [
            "Participe de pesquisas e canais de feedback",
            "Contribua para um clima positivo no seu time",
            "Busque entender as razões das inconsistências",
            "Desenvolva resiliência mantendo foco em resultados",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "A cultura da empresa tem boas bases, mas oscila. Como líder, você precisa reforçar consistentemente os valores e práticas que funcionam.",
          actions: [
            "Formalize os valores e comportamentos esperados",
            "Crie rituais que reforcem a cultura desejada",
            "Reconheça publicamente quem vive os valores",
            "Desenvolva líderes que sejam guardiões da cultura",
          ],
        },
        medio: {
          interpretation: "A cultura de execução existe, mas precisa de maior consistência. O desafio é garantir que todas as áreas vivam os mesmos valores.",
          actions: [
            "Alinhe práticas culturais entre departamentos",
            "Implemente programas de engajamento estruturados",
            "Crie métricas de saúde cultural e acompanhe",
            "Desenvolva líderes como embaixadores da cultura",
          ],
        },
        grande: {
          interpretation: "A cultura corporativa é boa, mas sua área pode fortalecer ainda mais o alinhamento entre processos, valores e práticas diárias.",
          actions: [
            "Conecte sua área às iniciativas culturais corporativas",
            "Desenvolva práticas locais alinhadas à cultura global",
            "Crie ambiente de segurança e aprendizado contínuo",
            "Promova líderes que exemplifiquem a cultura desejada",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "O ambiente da sua empresa é razoavelmente positivo, mas há espaço para maior consistência. Você pode fortalecer a cultura na sua equipe.",
          actions: [
            "Crie rituais de equipe que reforcem boas práticas",
            "Promova feedback constante e aprendizado",
            "Reconheça comportamentos alinhados aos valores",
            "Contribua para melhorias culturais da empresa",
          ],
        },
        medio: {
          interpretation: "A cultura organizacional tem boas práticas, mas oscila. Como gestor, você pode ser agente de consistência e melhoria.",
          actions: [
            "Torne-se referência cultural na sua área",
            "Participe de iniciativas de engajamento e cultura",
            "Desenvolva sua equipe em alinhamento com valores",
            "Proponha melhorias baseadas em melhores práticas",
          ],
        },
        grande: {
          interpretation: "Você percebe uma cultura corporativa positiva, com espaço para evolução. Seu papel é fortalecer isso na sua esfera de influência.",
          actions: [
            "Participe de comitês culturais e de engajamento",
            "Implemente as melhores práticas corporativas",
            "Contribua com feedback para evolução cultural",
            "Desenvolva sua equipe como referência",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você percebe um ambiente razoavelmente positivo com espaço para melhoria. Sua contribuição para o clima da equipe é importante.",
          actions: [
            "Contribua positivamente para o clima do time",
            "Dê feedback construtivo quando solicitado",
            "Viva os valores da empresa no dia a dia",
            "Reconheça colegas que fazem bom trabalho",
          ],
        },
        medio: {
          interpretation: "O ambiente organizacional é bom, e você tem maturidade para contribuir ainda mais. Sua perspectiva pode agregar às melhorias.",
          actions: [
            "Participe ativamente de iniciativas de clima",
            "Compartilhe feedback construtivo nos fóruns certos",
            "Seja agente positivo de mudança na sua equipe",
            "Desenvolva relacionamentos saudáveis com colegas",
          ],
        },
        grande: {
          interpretation: "Você avalia positivamente a cultura, com consciência de espaços de melhoria. Isso demonstra maturidade e engajamento.",
          actions: [
            "Engaje-se em grupos de afinidade e melhorias",
            "Contribua em pesquisas de clima e cultura",
            "Seja promotor de práticas positivas",
            "Desenvolva sua carreira alinhado aos valores",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você construiu uma cultura forte de execução. A empresa tem processos claros, valores vividos e um ambiente saudável. Seu desafio é sustentar isso no crescimento.",
          actions: [
            "Documente e proteja os elementos culturais que funcionam",
            "Desenvolva guardiões da cultura para quando crescer",
            "Compartilhe sua experiência com outros empreendedores",
            "Inove continuamente mantendo a essência cultural",
          ],
        },
        medio: {
          interpretation: "A cultura de execução da empresa é exemplar. Processos, valores e práticas estão alinhados. Mantenha a vigilância para sustentar essa excelência.",
          actions: [
            "Institucionalize as práticas culturais de sucesso",
            "Desenvolva a próxima geração de líderes culturais",
            "Compartilhe seu modelo externamente como referência",
            "Antecipe desafios culturais do crescimento",
          ],
        },
        grande: {
          interpretation: "Sua área demonstra excelência cultural em uma grande organização. Isso é diferencial competitivo. Expanda essa influência para outras unidades.",
          actions: [
            "Torne-se referência corporativa em cultura",
            "Contribua para iniciativas de transformação cultural",
            "Mentore líderes de outras áreas",
            "Influencie a estratégia cultural da organização",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você contribuiu para criar um excelente ambiente de trabalho. A cultura da empresa favorece alta performance e engajamento.",
          actions: [
            "Documente as práticas que criou na sua área",
            "Prepare-se para expandir sua influência cultural",
            "Mentore outros gestores em práticas culturais",
            "Contribua para sustentar a cultura no crescimento",
          ],
        },
        medio: {
          interpretation: "A cultura organizacional é forte, e você é parte importante disso. Seu próximo passo é ampliar seu impacto cultural para além da sua área.",
          actions: [
            "Assuma papel em iniciativas culturais corporativas",
            "Desenvolva outros gestores como líderes culturais",
            "Contribua para a estratégia de pessoas da empresa",
            "Prepare-se para responsabilidades de diretoria",
          ],
        },
        grande: {
          interpretation: "Você atua em uma cultura corporativa madura e contribui ativamente para isso. Sua influência cultural é um diferencial de carreira.",
          actions: [
            "Participe de comitês de cultura e engajamento",
            "Lidere transformações culturais quando necessário",
            "Desenvolva sua área como referência interna",
            "Contribua para a estratégia de employer branding",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você trabalha em um ambiente de excelência cultural e contribui para isso. Isso demonstra alinhamento e potencial de crescimento.",
          actions: [
            "Seja embaixador da cultura para novos colegas",
            "Contribua para manter o ambiente positivo",
            "Prepare-se para responsabilidades maiores",
            "Desenvolva-se como futuro líder cultural",
          ],
        },
        medio: {
          interpretation: "Você avalia o ambiente como excelente e faz parte dessa construção. Sua maturidade cultural é diferencial.",
          actions: [
            "Participe de programas de desenvolvimento cultural",
            "Assuma papel de mentor informal de colegas",
            "Contribua para iniciativas de engajamento",
            "Prepare-se para posições de liderança",
          ],
        },
        grande: {
          interpretation: "Sua percepção cultural positiva em uma grande empresa demonstra engajamento e maturidade. Use isso como alavanca de carreira.",
          actions: [
            "Participe de grupos de embaixadores culturais",
            "Contribua em programas de onboarding e integração",
            "Desenvolva visibilidade positiva na organização",
            "Posicione-se para oportunidades de crescimento",
          ],
        },
      },
    },
  },
  
  // =========================================
  // PILAR 4 - GESTÃO DE PROJETOS
  // =========================================
  4: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "Como líder de uma empresa em crescimento, você ainda transforma ideias em projetos de forma desorganizada. Escopo, prazo e riscos não são gerenciados adequadamente.",
          actions: [
            "Aprenda os fundamentos de gestão de projetos",
            "Crie um template básico para estruturar projetos",
            "Estabeleça rituais de acompanhamento de iniciativas",
            "Envolva a equipe na definição de escopo e prazos",
          ],
        },
        medio: {
          interpretation: "Na liderança de uma empresa de médio porte, projetos falham por falta de estrutura. Ideias boas não se transformam em resultados por gestão inadequada.",
          actions: [
            "Implemente metodologia básica de gestão de projetos",
            "Crie governança para priorização de iniciativas",
            "Desenvolva gestores em competências de projetos",
            "Estabeleça rituais de revisão e aprendizado",
          ],
        },
        grande: {
          interpretation: "Em uma grande organização, projetos podem estar falhando pela complexidade ou falta de método. Você precisa fortalecer as práticas de gestão.",
          actions: [
            "Adote as metodologias corporativas de projetos",
            "Garanta governança adequada nas suas iniciativas",
            "Desenvolva sua liderança em gestão de projetos",
            "Estabeleça PMO ou função equivalente na sua área",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você precisa desenvolver competências básicas de gestão de projetos. Suas iniciativas frequentemente derrapam em prazo, escopo ou qualidade.",
          actions: [
            "Estude os fundamentos de gestão de projetos",
            "Use ferramentas simples para organizar iniciativas",
            "Crie o hábito de definir escopo antes de começar",
            "Aprenda a identificar e gerenciar riscos básicos",
          ],
        },
        medio: {
          interpretation: "Como gestor em empresa de médio porte, suas competências de projetos precisam evoluir. Stakeholders esperam maior previsibilidade nas entregas.",
          actions: [
            "Adote metodologia formal de gestão de projetos",
            "Desenvolva habilidades de comunicação de status",
            "Aprenda a gerenciar expectativas de stakeholders",
            "Crie rituais de acompanhamento e visibilidade",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, gestão de projetos é competência essencial. Suas lacunas podem estar afetando sua credibilidade e entregas.",
          actions: [
            "Domine as metodologias corporativas de projetos",
            "Busque certificação em gestão de projetos",
            "Aprenda a navegar a complexidade organizacional",
            "Desenvolva habilidades de gestão de stakeholders",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você ainda não desenvolveu habilidades de estruturação de projetos. Suas entregas dependem de outros organizarem o trabalho.",
          actions: [
            "Aprenda conceitos básicos de gestão de projetos",
            "Pratique dividir trabalho em tarefas menores",
            "Desenvolva habilidade de estimar prazos",
            "Comunique proativamente riscos e impedimentos",
          ],
        },
        medio: {
          interpretation: "Em uma empresa de médio porte, saber estruturar seu trabalho como projeto é diferencial. Você ainda precisa desenvolver essa competência.",
          actions: [
            "Estude fundamentos de gestão de projetos",
            "Aplique conceitos básicos nas suas tarefas",
            "Busque participar de projetos estruturados",
            "Peça feedback sobre sua organização de trabalho",
          ],
        },
        grande: {
          interpretation: "Grandes empresas valorizam profissionais que sabem trabalhar com projetos. Desenvolver essa competência vai acelerar sua carreira.",
          actions: [
            "Aproveite treinamentos corporativos de projetos",
            "Participe de projetos para aprender na prática",
            "Entenda as metodologias usadas na empresa",
            "Desenvolva visibilidade através de entregas de projeto",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "Você já tem boas práticas de gestão de projetos, mas precisa de maior consistência. O desafio é sistematizar para toda a empresa.",
          actions: [
            "Padronize a metodologia de projetos da empresa",
            "Crie um portfólio de projetos prioritários",
            "Desenvolva a equipe em gestão de projetos",
            "Implemente rituais de lições aprendidas",
          ],
        },
        medio: {
          interpretation: "A gestão de projetos na empresa está evoluindo. Você precisa garantir maior maturidade e integração entre diferentes iniciativas.",
          actions: [
            "Estruture um PMO ou função de governança",
            "Alinhe prioridades de projetos com estratégia",
            "Desenvolva gestores de projeto internamente",
            "Crie visibilidade do portfólio de iniciativas",
          ],
        },
        grande: {
          interpretation: "Suas práticas de projetos são boas, mas há espaço para maior integração com outras áreas e melhoria na gestão de portfólio.",
          actions: [
            "Fortaleça a governança de projetos na sua área",
            "Integre-se às práticas corporativas de PMO",
            "Desenvolva gestores de projeto como competência",
            "Contribua para melhores práticas organizacionais",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você já gerencia projetos com razoável competência. O próximo passo é desenvolver maior sofisticação e engajar melhor stakeholders.",
          actions: [
            "Aprimore técnicas de gestão de stakeholders",
            "Desenvolva habilidades de gestão de riscos",
            "Crie templates e processos replicáveis",
            "Busque liderar projetos mais complexos",
          ],
        },
        medio: {
          interpretation: "Suas competências de projetos são sólidas. Hora de desenvolver visão de portfólio e habilidades de programa.",
          actions: [
            "Desenvolva visão de múltiplos projetos simultâneos",
            "Aprenda metodologias ágeis em escala",
            "Busque certificações avançadas de projetos",
            "Mentore outros gestores em práticas de projetos",
          ],
        },
        grande: {
          interpretation: "Você gerencia projetos com competência em ambiente complexo. Há espaço para liderar iniciativas de maior impacto e visibilidade.",
          actions: [
            "Busque projetos estratégicos de alta visibilidade",
            "Desenvolva competências de gestão de programa",
            "Contribua para evolução do PMO corporativo",
            "Prepare-se para posições de liderança sênior",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você já demonstra boa capacidade de organizar e executar projetos. Isso o diferencia e abre portas para mais responsabilidades.",
          actions: [
            "Assuma liderança informal de pequenos projetos",
            "Desenvolva habilidades de comunicação de status",
            "Aprenda a gerenciar expectativas",
            "Prepare-se para posições de coordenação",
          ],
        },
        medio: {
          interpretation: "Suas competências de projetos estão acima da média. Você está pronto para assumir mais responsabilidades nessa área.",
          actions: [
            "Candidate-se a liderar projetos formalmente",
            "Busque certificações de gestão de projetos",
            "Desenvolva habilidades de gestão de pessoas",
            "Prepare-se para posições de gestão",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, sua competência de projetos é diferencial. Use isso para ganhar visibilidade e crescer.",
          actions: [
            "Participe de projetos estratégicos",
            "Busque certificações reconhecidas (PMP, Agile)",
            "Desenvolva relacionamentos com gestores de projeto",
            "Posicione-se para oportunidades de gestão",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você domina a gestão de projetos e isso é vantagem competitiva da empresa. O desafio é escalar essa capacidade no crescimento.",
          actions: [
            "Crie um modelo de gestão de projetos escalável",
            "Desenvolva a próxima geração de gestores de projeto",
            "Estruture governança de portfólio",
            "Compartilhe seu conhecimento externamente",
          ],
        },
        medio: {
          interpretation: "A maturidade em projetos da empresa é alta graças à sua liderança. Hora de institucionalizar e desenvolver a próxima geração.",
          actions: [
            "Estruture um PMO de excelência",
            "Crie programas de formação de gestores de projeto",
            "Desenvolva práticas de gestão de portfólio",
            "Prepare sucessores para sua expertise",
          ],
        },
        grande: {
          interpretation: "Você é referência em gestão de projetos em grande organização. Sua influência pode transformar práticas corporativas.",
          actions: [
            "Lidere iniciativas de excelência em projetos",
            "Contribua para a governança corporativa de PMO",
            "Desenvolva metodologias adaptadas à empresa",
            "Mentore líderes de projeto de outras áreas",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Sua excelência em projetos é diferencial. Você está pronto para responsabilidades de diretoria ou para liderar o PMO da empresa.",
          actions: [
            "Assuma responsabilidades de diretoria",
            "Estruture a função de PMO se não existir",
            "Desenvolva visão de portfólio estratégico",
            "Mentore outros gestores em excelência de projetos",
          ],
        },
        medio: {
          interpretation: "Você domina gestão de projetos e programas. Está pronto para posições de liderança sênior ou gestão de portfólio.",
          actions: [
            "Busque posições de PMO ou gestão de portfólio",
            "Desenvolva competências de diretoria",
            "Lidere transformações metodológicas",
            "Prepare-se para posições executivas",
          ],
        },
        grande: {
          interpretation: "Sua competência em projetos é de nível executivo. Você pode liderar a área de PMO ou posições equivalentes.",
          actions: [
            "Candidate-se a posições de liderança de PMO",
            "Contribua para a estratégia de projetos corporativa",
            "Desenvolva visibilidade com executivos",
            "Lidere programas de transformação",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Sua competência em projetos é excepcional. Você está pronto para liderar projetos estratégicos ou assumir gestão.",
          actions: [
            "Lidere projetos de maior complexidade e impacto",
            "Desenvolva competências de liderança",
            "Busque certificações avançadas",
            "Prepare-se para posições de gestão",
          ],
        },
        medio: {
          interpretation: "Você demonstra maestria em gestão de projetos. A empresa provavelmente já o considera para posições de maior responsabilidade.",
          actions: [
            "Candidate-se a posições de gestão ou PMO",
            "Busque projetos estratégicos de alta visibilidade",
            "Desenvolva habilidades de liderança sênior",
            "Prepare-se para assumir equipes",
          ],
        },
        grande: {
          interpretation: "Sua competência em projetos é rara no nível operacional. Isso é trampolim para crescimento acelerado.",
          actions: [
            "Busque patrocínio de líderes seniores",
            "Participe de programas de high potentials",
            "Candidate-se a posições de gestão de projetos",
            "Desenvolva sua marca como especialista",
          ],
        },
      },
    },
  },
  
  // =========================================
  // PILAR 5 - LIDERANÇA E INFLUÊNCIA
  // =========================================
  5: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "Como líder da empresa, você precisa desenvolver suas competências de liderança. Seu estilo atual pode não estar inspirando a equipe a dar o melhor.",
          actions: [
            "Busque feedback honesto sobre seu estilo de liderança",
            "Desenvolva o hábito de reconhecer contribuições da equipe",
            "Crie ambiente seguro para a equipe compartilhar ideias",
            "Aprenda a dar feedback construtivo regularmente",
          ],
        },
        medio: {
          interpretation: "Na liderança de empresa de médio porte, suas lacunas de liderança impactam toda a organização. Desenvolvimento é urgente.",
          actions: [
            "Invista em desenvolvimento pessoal de liderança",
            "Busque coaching ou mentoria executiva",
            "Desenvolva habilidades de influência e comunicação",
            "Crie cultura de feedback e reconhecimento",
          ],
        },
        grande: {
          interpretation: "Em uma grande organização, líderes seniores são observados como modelo. Suas lacunas de liderança se amplificam na estrutura.",
          actions: [
            "Participe de programas de desenvolvimento executivo",
            "Busque feedback 360 e trabalhe os pontos críticos",
            "Desenvolva presença executiva e influência",
            "Crie ambiente de segurança psicológica na sua área",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Como gestor em empresa menor, você precisa desenvolver habilidades básicas de liderança. Sua equipe pode não se sentir inspirada ou apoiada.",
          actions: [
            "Aprenda os fundamentos de liderança de pessoas",
            "Desenvolva o hábito de dar feedback regular",
            "Crie momentos de reconhecimento para a equipe",
            "Busque entender as motivações individuais do time",
          ],
        },
        medio: {
          interpretation: "Na gestão de uma empresa de médio porte, suas competências de liderança precisam evoluir para desenvolver e reter talentos.",
          actions: [
            "Invista em formação estruturada de liderança",
            "Desenvolva habilidades de coaching",
            "Crie rituais de feedback e desenvolvimento",
            "Aprenda a influenciar sem autoridade formal",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, gestores precisam de forte liderança para engajar equipes. Suas lacunas podem estar afetando resultados e retenção.",
          actions: [
            "Participe dos programas de liderança corporativos",
            "Busque feedback estruturado sobre seu estilo",
            "Desenvolva habilidades políticas e de influência",
            "Crie ambiente de segurança e desenvolvimento",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você ainda não desenvolveu habilidades de influência. Isso é natural no início de carreira, mas limitará seu crescimento.",
          actions: [
            "Observe líderes que você admira e aprenda com eles",
            "Pratique dar reconhecimento a colegas",
            "Desenvolva habilidades de comunicação",
            "Busque oportunidades de liderar pequenas iniciativas",
          ],
        },
        medio: {
          interpretation: "Em uma empresa de médio porte, profissionais com capacidade de influência crescem mais rápido. Você precisa desenvolver essa competência.",
          actions: [
            "Participe de projetos que exijam trabalho em equipe",
            "Desenvolva sua capacidade de comunicação",
            "Pratique ajudar colegas a se desenvolverem",
            "Busque feedback sobre como é percebido pelo time",
          ],
        },
        grande: {
          interpretation: "Grandes empresas valorizam profissionais que influenciam positivamente seus colegas. Desenvolver liderança vai acelerar sua carreira.",
          actions: [
            "Participe de programas de desenvolvimento oferecidos",
            "Busque mentores em posições de liderança",
            "Pratique dar feedback construtivo a colegas",
            "Desenvolva presença e comunicação assertiva",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "Você já demonstra boas práticas de liderança, mas com oscilações. O desafio é criar consistência e desenvolver outros líderes.",
          actions: [
            "Formalize suas práticas de desenvolvimento de pessoas",
            "Crie programas de reconhecimento estruturados",
            "Desenvolva a segunda linha de liderança",
            "Estabeleça cultura de feedback contínuo",
          ],
        },
        medio: {
          interpretation: "Sua liderança é positiva, mas precisa de maior consistência e escala. Hora de desenvolver líderes que perpetuem seu estilo.",
          actions: [
            "Crie um programa de desenvolvimento de líderes",
            "Padronize práticas de gestão de pessoas",
            "Desenvolva habilidades de coaching na liderança",
            "Implemente rituais de feedback e reconhecimento",
          ],
        },
        grande: {
          interpretation: "Você lidera bem, mas há espaço para maior influência organizacional. Sua liderança pode impactar além da sua área.",
          actions: [
            "Expanda sua influência para outras áreas",
            "Participe de iniciativas de desenvolvimento corporativo",
            "Mentore líderes de outros departamentos",
            "Contribua para a cultura de liderança da empresa",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você já lidera razoavelmente bem. O próximo passo é desenvolver maior consistência e impacto no desenvolvimento de pessoas.",
          actions: [
            "Crie planos de desenvolvimento individuais para equipe",
            "Desenvolva habilidades avançadas de feedback",
            "Amplie sua influência além da sua área",
            "Prepare-se para liderar líderes",
          ],
        },
        medio: {
          interpretation: "Suas competências de liderança são sólidas. Hora de ampliar seu impacto e desenvolver-se para posições mais seniores.",
          actions: [
            "Busque projetos que envolvam liderar pares",
            "Desenvolva habilidades de influência política",
            "Mentore outros gestores menos experientes",
            "Prepare-se para posições de diretoria",
          ],
        },
        grande: {
          interpretation: "Você lidera bem em ambiente complexo. Há espaço para expandir sua influência e desenvolver líderes em maior escala.",
          actions: [
            "Busque visibilidade como líder de líderes",
            "Participe de fóruns de liderança sênior",
            "Contribua para iniciativas de cultura e pessoas",
            "Desenvolva presença executiva",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você já demonstra capacidade de influência acima do esperado. Isso o posiciona bem para crescimento em liderança.",
          actions: [
            "Assuma liderança informal de projetos e iniciativas",
            "Ajude colegas a se desenvolverem",
            "Desenvolva habilidades de apresentação e comunicação",
            "Prepare-se para posições de coordenação",
          ],
        },
        medio: {
          interpretation: "Sua capacidade de influência é diferenciada. Você está pronto para responsabilidades de liderança formal.",
          actions: [
            "Candidate-se a posições de coordenação ou supervisão",
            "Desenvolva competências de gestão de pessoas",
            "Busque feedback sobre seu potencial de liderança",
            "Participe de programas de desenvolvimento de líderes",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, sua influência positiva não passa despercebida. Você é candidato natural a posições de liderança.",
          actions: [
            "Manifeste interesse em posições de liderança",
            "Participe de programas de talentos e sucessão",
            "Desenvolva relacionamentos com sponsors seniores",
            "Busque projetos que demonstrem liderança",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você é um líder inspirador que desenvolve pessoas e cria ambiente de alta performance. Seu desafio é perpetuar isso no crescimento.",
          actions: [
            "Documente seu modelo de liderança para escalar",
            "Desenvolva a próxima geração de líderes",
            "Crie uma cultura de liderança sustentável",
            "Compartilhe seu conhecimento externamente",
          ],
        },
        medio: {
          interpretation: "Sua liderança é referência na organização. Você transforma pessoas e resultados. Hora de institucionalizar essa excelência.",
          actions: [
            "Crie programas de formação de líderes",
            "Estabeleça uma cultura de liderança exemplar",
            "Mentore outros executivos da empresa",
            "Prepare sucessores para seu legado",
          ],
        },
        grande: {
          interpretation: "Você é líder transformador em grande organização. Sua influência pode moldar a cultura de liderança corporativa.",
          actions: [
            "Lidere transformações culturais de liderança",
            "Participe de conselhos e governança de talentos",
            "Desenvolva a próxima geração de executivos",
            "Deixe legado na cultura de liderança",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Sua excelência em liderança o qualifica para posições seniores. Você é peça-chave no desenvolvimento de pessoas da empresa.",
          actions: [
            "Assuma responsabilidades de diretoria",
            "Lidere a área de pessoas e cultura se apropriado",
            "Desenvolva outros gestores como líderes",
            "Contribua para a estratégia de pessoas",
          ],
        },
        medio: {
          interpretation: "Você é líder de referência. Está pronto para posições de diretoria onde poderá impactar mais pessoas e resultados.",
          actions: [
            "Busque posições de diretoria ou VP",
            "Lidere programas de transformação cultural",
            "Desenvolva presença executiva externa",
            "Prepare-se para posições C-level",
          ],
        },
        grande: {
          interpretation: "Sua liderança é de nível executivo. Você pode assumir responsabilidades de diretoria ou liderar a área de pessoas.",
          actions: [
            "Candidate-se a posições de diretoria",
            "Busque exposição a conselhos e governança",
            "Lidere iniciativas de cultura e pessoas",
            "Desenvolva-se para posições C-level",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Sua capacidade de liderança é excepcional. Você está absolutamente pronto para assumir posições de gestão.",
          actions: [
            "Candidate-se a posições de coordenação ou gerência",
            "Desenvolva competências de gestão formal",
            "Busque projetos de liderança de equipe",
            "Prepare-se para ser líder de pessoas",
          ],
        },
        medio: {
          interpretation: "Você demonstra liderança de nível gerencial. A empresa certamente já o identificou para posições maiores.",
          actions: [
            "Busque promoção para posições de gestão",
            "Participe de programas de high potentials",
            "Desenvolva-se em competências gerenciais",
            "Amplie sua influência organizacional",
          ],
        },
        grande: {
          interpretation: "Sua capacidade de liderança em nível operacional é rara. Você é candidato óbvio para aceleração de carreira.",
          actions: [
            "Busque sponsors e patrocinadores de carreira",
            "Manifeste interesse em posições de liderança",
            "Participe de programas de sucessão",
            "Posicione-se para oportunidades de gestão",
          ],
        },
      },
    },
  },
  
  // =========================================
  // PILAR 6 - INOVAÇÃO E CRIATIVIDADE
  // =========================================
  6: {
    fundamentacao: {
      lideranca: {
        pequeno: {
          interpretation: "Como líder de empresa em crescimento, você ainda não incorporou inovação e tecnologia no seu modelo mental. Isso pode limitar a competitividade.",
          actions: [
            "Dedique tempo para aprender sobre tendências tecnológicas",
            "Crie espaço para experimentação na empresa",
            "Encoraje a equipe a trazer ideias e soluções novas",
            "Explore ferramentas que podem otimizar processos",
          ],
        },
        medio: {
          interpretation: "Na liderança de uma empresa de médio porte, a resistência à inovação pode criar gaps competitivos. Você precisa abraçar a transformação.",
          actions: [
            "Invista em transformação digital da empresa",
            "Crie uma agenda estruturada de inovação",
            "Desenvolva a liderança em mindset de inovação",
            "Busque inspiração em práticas de mercado",
          ],
        },
        grande: {
          interpretation: "Em grandes organizações, líderes que não inovam ficam obsoletos. Você precisa desenvolver mindset de inovação e tecnologia.",
          actions: [
            "Participe de programas de transformação digital",
            "Conecte-se com áreas de inovação da empresa",
            "Desenvolva visão de tecnologia como alavanca",
            "Crie espaço para experimentação na sua área",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Como gestor em empresa menor, você ainda resiste a mudanças e novas tecnologias. Isso pode estar limitando a eficiência da sua área.",
          actions: [
            "Explore ferramentas digitais para sua área",
            "Desenvolva abertura para experimentação",
            "Busque aprender sobre tendências do seu setor",
            "Encoraje a equipe a propor melhorias e inovações",
          ],
        },
        medio: {
          interpretation: "Na gestão de uma empresa de médio porte, você precisa desenvolver mindset de inovação. A resistência a mudanças limita resultados.",
          actions: [
            "Participe de iniciativas de inovação da empresa",
            "Desenvolva projetos de melhoria com tecnologia",
            "Aprenda sobre metodologias ágeis e inovação",
            "Crie cultura de experimentação na sua equipe",
          ],
        },
        grande: {
          interpretation: "Em grandes empresas, gestores sem mindset de inovação perdem relevância. Você precisa evoluir para acompanhar as transformações.",
          actions: [
            "Engaje-se com a agenda de inovação corporativa",
            "Busque formação em transformação digital",
            "Conecte-se com áreas de tecnologia e inovação",
            "Implemente melhorias tecnológicas na sua área",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você ainda demonstra resistência a mudanças e novas tecnologias. Desenvolver essa competência é fundamental para sua carreira.",
          actions: [
            "Busque aprender novas ferramentas e tecnologias",
            "Desenvolva curiosidade e abertura a mudanças",
            "Proponha melhorias simples para seu trabalho",
            "Peça ajuda para desenvolver habilidades digitais",
          ],
        },
        medio: {
          interpretation: "Em uma empresa de médio porte, profissionais que abraçam inovação crescem mais rápido. Você precisa desenvolver essa competência.",
          actions: [
            "Participe de treinamentos de novas tecnologias",
            "Busque automatizar partes do seu trabalho",
            "Proponha melhorias baseadas em tecnologia",
            "Desenvolva mindset de aprendizado contínuo",
          ],
        },
        grande: {
          interpretation: "Grandes empresas passam por transformação digital constante. Sem desenvolver mindset de inovação, você pode ficar para trás.",
          actions: [
            "Aproveite os recursos de aprendizado da empresa",
            "Busque certificações em tecnologias relevantes",
            "Participe de iniciativas de transformação digital",
            "Desenvolva-se como profissional digital",
          ],
        },
      },
    },
    consolidacao: {
      lideranca: {
        pequeno: {
          interpretation: "Você já incorpora inovação, mas de forma inconsistente. O desafio é criar uma cultura de inovação sustentável na empresa.",
          actions: [
            "Estruture uma agenda de inovação formal",
            "Crie rituais de geração e teste de ideias",
            "Invista em tecnologias que alavanquem o negócio",
            "Desenvolva a equipe em mindset de inovação",
          ],
        },
        medio: {
          interpretation: "A inovação já faz parte da agenda, mas precisa de maior estrutura. Hora de criar processos que sustentem a criatividade.",
          actions: [
            "Implemente metodologias de inovação estruturadas",
            "Crie um pipeline formal de novas iniciativas",
            "Desenvolva parcerias com startups e ecossistemas",
            "Invista em formação de inovação para líderes",
          ],
        },
        grande: {
          interpretation: "Você abraça inovação, mas há espaço para maior impacto. Sua área pode se tornar referência em transformação.",
          actions: [
            "Conecte-se com labs e áreas de inovação",
            "Lidere pilotos de novas tecnologias",
            "Crie parcerias internas para escalar inovação",
            "Desenvolva sua área como hub de transformação",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Você já aplica inovação no seu trabalho. O próximo passo é sistematizar e expandir essa capacidade para maior impacto.",
          actions: [
            "Crie processos de melhoria contínua na equipe",
            "Implemente novas tecnologias de forma estruturada",
            "Desenvolva a equipe em mindset de inovação",
            "Busque referências externas de inovação",
          ],
        },
        medio: {
          interpretation: "Você demonstra boa capacidade de inovação. Hora de ampliar seu impacto e liderar transformações maiores.",
          actions: [
            "Lidere projetos de transformação digital",
            "Desenvolva expertise em metodologias ágeis",
            "Busque certificações em inovação",
            "Torne-se referência de inovação na empresa",
          ],
        },
        grande: {
          interpretation: "Você inova consistentemente em ambiente complexo. Há espaço para liderar transformações de maior escala.",
          actions: [
            "Busque projetos de inovação estratégica",
            "Conecte-se com áreas de inovação corporativa",
            "Contribua para a agenda de transformação digital",
            "Desenvolva visão de tecnologias emergentes",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Você já demonstra mindset de inovação acima da média. Isso o diferencia e abre portas para mais responsabilidades.",
          actions: [
            "Proponha projetos de melhoria e automação",
            "Desenvolva expertise em ferramentas inovadoras",
            "Ajude colegas a adotarem novas tecnologias",
            "Busque certificações em áreas tecnológicas",
          ],
        },
        medio: {
          interpretation: "Sua capacidade de inovação é diferenciada. Você está pronto para liderar iniciativas de transformação.",
          actions: [
            "Candidate-se a projetos de inovação",
            "Desenvolva-se como especialista em tecnologia",
            "Busque certificações avançadas",
            "Prepare-se para posições técnicas seniores",
          ],
        },
        grande: {
          interpretation: "Em uma grande empresa, seu mindset de inovação é diferencial competitivo. Use isso para ganhar visibilidade.",
          actions: [
            "Participe de programas de inovação corporativos",
            "Busque projetos em áreas de transformação digital",
            "Desenvolva expertise em tecnologias emergentes",
            "Posicione-se como agente de mudança",
          ],
        },
      },
    },
    estrategico: {
      lideranca: {
        pequeno: {
          interpretation: "Você é líder inovador que abraça tecnologia e criatividade. A empresa se beneficia dessa visão. O desafio é escalar.",
          actions: [
            "Crie uma cultura de inovação que transcenda você",
            "Desenvolva a próxima geração de líderes inovadores",
            "Explore parcerias estratégicas de inovação",
            "Mantenha-se na fronteira do conhecimento",
          ],
        },
        medio: {
          interpretation: "Sua liderança em inovação é referência. A empresa está bem posicionada para o futuro graças à sua visão.",
          actions: [
            "Institucionalize a cultura de inovação",
            "Crie ecossistemas de parceiros e startups",
            "Desenvolva líderes como agentes de transformação",
            "Compartilhe sua expertise externamente",
          ],
        },
        grande: {
          interpretation: "Você é líder de inovação em grande organização. Sua influência pode transformar a agenda de transformação corporativa.",
          actions: [
            "Lidere a agenda de inovação corporativa",
            "Participe de conselhos de inovação e tecnologia",
            "Desenvolva a capacidade de inovação institucional",
            "Deixe legado na transformação digital",
          ],
        },
      },
      gestao: {
        pequeno: {
          interpretation: "Sua capacidade de inovação é excepcional. Você está pronto para liderar a transformação digital da empresa.",
          actions: [
            "Assuma responsabilidades de inovação estratégica",
            "Desenvolva visão de novas tecnologias",
            "Lidere a agenda de transformação digital",
            "Prepare-se para posições de diretoria",
          ],
        },
        medio: {
          interpretation: "Você é referência em inovação. Está pronto para posições que liderem a transformação em maior escala.",
          actions: [
            "Busque posições de liderança em inovação",
            "Desenvolva expertise em tecnologias emergentes",
            "Lidere transformações de grande impacto",
            "Prepare-se para posições executivas",
          ],
        },
        grande: {
          interpretation: "Sua excelência em inovação é de nível executivo. Você pode liderar a agenda de transformação da empresa.",
          actions: [
            "Busque posições em inovação ou transformação digital",
            "Desenvolva visão estratégica de tecnologia",
            "Contribua para a agenda de inovação corporativa",
            "Posicione-se para posições C-level",
          ],
        },
      },
      operacional: {
        pequeno: {
          interpretation: "Sua capacidade de inovação é excepcional. Você pode escolher entre trilhas de especialização técnica ou gestão.",
          actions: [
            "Defina sua trilha: especialista ou gestor",
            "Busque certificações avançadas em tecnologia",
            "Lidere projetos de inovação de impacto",
            "Desenvolva sua marca como inovador",
          ],
        },
        medio: {
          interpretation: "Você demonstra maestria em inovação. A empresa certamente o vê como alto potencial para posições técnicas ou de gestão.",
          actions: [
            "Candidate-se a posições de liderança técnica",
            "Busque projetos estratégicos de inovação",
            "Desenvolva-se como referência em tecnologia",
            "Prepare-se para posições de maior impacto",
          ],
        },
        grande: {
          interpretation: "Sua capacidade de inovação em nível operacional é rara. Você é candidato óbvio para posições de destaque.",
          actions: [
            "Busque sponsors na área de inovação",
            "Participe de programas de talentos de tecnologia",
            "Desenvolva visibilidade como agente de transformação",
            "Posicione-se para crescimento acelerado",
          ],
        },
      },
    },
  },
};

export const getPillarInterpretation = (
  pillarId: number,
  stageKey: StageKey,
  leadData: LeadData
): PillarInterpretation => {
  const porteCategory = getPorteCategory(leadData.porte);
  const cargoCategory = getCargoCategory(leadData.cargo);
  
  const interpretation = pillarInterpretationsData[pillarId]?.[stageKey]?.[cargoCategory]?.[porteCategory];
  
  if (!interpretation) {
    // Fallback genérico baseado no estágio
    const base = stageBaseInterpretations[stageKey];
    return {
      interpretation: `Seu resultado indica ${base.meaning}. O foco deve ser ${base.focus}.`,
      actions: ["Revise suas práticas atuais e identifique oportunidades de melhoria"],
    };
  }
  
  return interpretation;
};

export const getStageKeyFromPercentage = (percentage: number): StageKey => {
  if (percentage <= 33) return "fundamentacao";
  if (percentage <= 66) return "consolidacao";
  return "estrategico";
};
