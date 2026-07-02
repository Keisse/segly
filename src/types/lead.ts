export interface Lead {
  id: string;
  created_at: string;
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
  resultado_diagnostico: ResultadoDiagnostico | null;
  status: LeadStatus;
  notas: Nota[];
  historico: HistoricoItem[];
  responsavel: string | null;
  fonte: string;
  campaign_id: string | null;
  campaign_slug: string | null;
  campaign_name: string | null;
  owner_id: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
}

export interface ResultadoDiagnostico {
  totalScore: number;
  maxScore: number;
  percentage: number;
  stage: {
    id: number;
    name: string;
    minPercentage: number;
    maxPercentage: number;
    description: string;
    recommendation: string;
  };
  pillarScores: PillarScore[];
  answers: Record<number, number>;
}

export interface PillarScore {
  pillarId: number;
  pillarName: string;
  icon: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface Nota {
  id: string;
  data: string;
  autor: string;
  texto: string;
}

export interface HistoricoItem {
  id: string;
  data: string;
  tipo: 'email' | 'ligacao' | 'whatsapp' | 'reuniao';
  descricao: string;
  resultado: string;
}

export type LeadStatus = 
  | 'novo' 
  | 'em_analise' 
  | 'contatado' 
  | 'em_negociacao' 
  | 'convertido' 
  | 'perdido';

export const statusLabels: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_analise: 'Em Análise',
  contatado: 'Contatado',
  em_negociacao: 'Em Negociação',
  convertido: 'Convertido',
  perdido: 'Perdido'
};

export const statusColors: Record<LeadStatus, string> = {
  novo: 'bg-blue-500/20 text-blue-400',
  em_analise: 'bg-amber-500/20 text-amber-400',
  contatado: 'bg-purple-500/20 text-purple-400',
  em_negociacao: 'bg-cyan-500/20 text-cyan-400',
  convertido: 'bg-emerald-500/20 text-emerald-400',
  perdido: 'bg-red-500/20 text-red-400'
};

export function getMaturityLevel(percentage: number): 'iniciante' | 'intermediario' | 'avancado' | 'estrategico' {
  if (percentage <= 40) return 'iniciante';
  if (percentage <= 70) return 'intermediario';
  if (percentage <= 85) return 'avancado';
  return 'estrategico';
}

export const maturityLabels = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  estrategico: 'Estratégico'
};

export const maturityColors = {
  iniciante: 'bg-red-500/20 text-red-400',
  intermediario: 'bg-amber-500/20 text-amber-400',
  avancado: 'bg-blue-500/20 text-blue-400',
  estrategico: 'bg-emerald-500/20 text-emerald-400'
};
