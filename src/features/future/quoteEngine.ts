export type AgeBand =
  | "0-18"
  | "19-23"
  | "24-28"
  | "29-33"
  | "34-38"
  | "39-43"
  | "44-48"
  | "49-53"
  | "54-58"
  | "59+";

export type Accommodation = "Enfermaria" | "Apartamento";
export type Copay = "Sem coparticipacao" | "Coparticipacao leve" | "Coparticipacao moderada";

export interface PlanCatalogItem {
  id: string;
  provider: string;
  name: string;
  source: "SeglyTable" | "API";
  ansRegistry: string;
  states: string[];
  minLives: number;
  maxLives: number;
  accommodation: Accommodation;
  copay: Copay;
  coverage: string;
  networkScore: number;
  reimbursement: boolean;
  highlights: string[];
  prices: Record<AgeBand, number>;
}

export interface QuoteProfile {
  companyName: string;
  state: string;
  city: string;
  ages: number[];
  priorities: {
    price: number;
    network: number;
    accommodation: number;
  };
}

export interface QuoteResult {
  plan: PlanCatalogItem;
  monthlyTotal: number;
  annualTotal: number;
  fitScore: number;
  ageBreakdown: Record<AgeBand, { lives: number; unitPrice: number; subtotal: number }>;
  reasons: string[];
}

export const AGE_BANDS: AgeBand[] = [
  "0-18",
  "19-23",
  "24-28",
  "29-33",
  "34-38",
  "39-43",
  "44-48",
  "49-53",
  "54-58",
  "59+",
];

export function ageToBand(age: number): AgeBand {
  if (age <= 18) return "0-18";
  if (age <= 23) return "19-23";
  if (age <= 28) return "24-28";
  if (age <= 33) return "29-33";
  if (age <= 38) return "34-38";
  if (age <= 43) return "39-43";
  if (age <= 48) return "44-48";
  if (age <= 53) return "49-53";
  if (age <= 58) return "54-58";
  return "59+";
}

export const demoCatalog: PlanCatalogItem[] = [
  {
    id: "alpha-essencial-200",
    provider: "Operadora Alpha",
    name: "Essencial 200",
    source: "SeglyTable",
    ansRegistry: "DEMO-001",
    states: ["MG", "SP"],
    minLives: 2,
    maxLives: 199,
    accommodation: "Enfermaria",
    copay: "Coparticipacao moderada",
    coverage: "Regional",
    networkScore: 76,
    reimbursement: false,
    highlights: ["Menor custo", "Rede regional", "Boa opcao para empresas sensiveis a preco"],
    prices: {
      "0-18": 238.9,
      "19-23": 286.7,
      "24-28": 329.7,
      "29-33": 362.7,
      "34-38": 398.9,
      "39-43": 454.8,
      "44-48": 548.6,
      "49-53": 662.3,
      "54-58": 817.9,
      "59+": 1431.3,
    },
  },
  {
    id: "beta-select-plus",
    provider: "Operadora Beta",
    name: "Select Plus",
    source: "SeglyTable",
    ansRegistry: "DEMO-002",
    states: ["MG", "SP", "RJ"],
    minLives: 3,
    maxLives: 299,
    accommodation: "Apartamento",
    copay: "Coparticipacao leve",
    coverage: "Nacional",
    networkScore: 93,
    reimbursement: true,
    highlights: ["Equilibrio entre preco e rede", "Abrangencia nacional", "Reembolso"],
    prices: {
      "0-18": 286.4,
      "19-23": 343.7,
      "24-28": 395.3,
      "29-33": 434.8,
      "34-38": 478.3,
      "39-43": 545.2,
      "44-48": 657.5,
      "49-53": 793.8,
      "54-58": 980.4,
      "59+": 1715.8,
    },
  },
  {
    id: "gamma-executive",
    provider: "Operadora Gamma",
    name: "Executive Nacional",
    source: "SeglyTable",
    ansRegistry: "DEMO-003",
    states: ["MG", "SP", "RJ", "PR", "SC"],
    minLives: 5,
    maxLives: 499,
    accommodation: "Apartamento",
    copay: "Sem coparticipacao",
    coverage: "Nacional",
    networkScore: 98,
    reimbursement: true,
    highlights: ["Rede premium", "Sem coparticipacao", "Maior previsibilidade para o beneficiario"],
    prices: {
      "0-18": 349.8,
      "19-23": 419.8,
      "24-28": 482.8,
      "29-33": 531.1,
      "34-38": 584.2,
      "39-43": 666.0,
      "44-48": 803.2,
      "49-53": 970.0,
      "54-58": 1198.0,
      "59+": 2096.5,
    },
  },
];

function emptyBreakdown(plan: PlanCatalogItem): QuoteResult["ageBreakdown"] {
  return Object.fromEntries(
    AGE_BANDS.map((band) => [band, { lives: 0, unitPrice: plan.prices[band], subtotal: 0 }]),
  ) as QuoteResult["ageBreakdown"];
}

export function calculateQuotes(profile: QuoteProfile, catalog = demoCatalog): QuoteResult[] {
  const lives = profile.ages.length;

  return catalog
    .filter(
      (plan) =>
        plan.states.includes(profile.state) && lives >= plan.minLives && lives <= plan.maxLives,
    )
    .map((plan) => {
      const ageBreakdown = emptyBreakdown(plan);

      for (const age of profile.ages) {
        const band = ageToBand(age);
        ageBreakdown[band].lives += 1;
        ageBreakdown[band].subtotal += plan.prices[band];
      }

      const monthlyTotal = Object.values(ageBreakdown).reduce((sum, row) => sum + row.subtotal, 0);
      const networkComponent = plan.networkScore * profile.priorities.network;
      const priceComponent = Math.max(0, 100 - monthlyTotal / Math.max(1, lives) / 12) * profile.priorities.price;
      const accommodationComponent =
        (plan.accommodation === "Apartamento" ? 100 : 72) * profile.priorities.accommodation;
      const weightTotal =
        profile.priorities.network + profile.priorities.price + profile.priorities.accommodation;
      const fitScore = Math.round(
        Math.min(99, Math.max(1, (networkComponent + priceComponent + accommodationComponent) / weightTotal)),
      );

      const reasons = [
        `${plan.networkScore}% de score de rede no catalogo demo`,
        plan.accommodation === "Apartamento" ? "Mantem acomodacao em apartamento" : "Prioriza economia com enfermaria",
        plan.reimbursement ? "Inclui reembolso" : "Sem reembolso no catalogo demo",
      ];

      return {
        plan,
        monthlyTotal,
        annualTotal: monthlyTotal * 12,
        fitScore,
        ageBreakdown,
        reasons,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore || a.monthlyTotal - b.monthlyTotal);
}

export const demoProfile: QuoteProfile = {
  companyName: "Grupo Horizonte",
  state: "MG",
  city: "Montes Claros",
  ages: [
    17, 18, 21, 23, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 35, 36, 37, 38, 39, 41, 42, 44, 46,
    48, 50, 53, 55, 58, 60,
  ],
  priorities: {
    price: 0.35,
    network: 0.45,
    accommodation: 0.2,
  },
};
