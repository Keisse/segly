export type CampaignType = 'diagnostico_score' | 'formulario_captura' | 'pesquisa';
export type CampaignStatus = 'ativa' | 'inativa';
export type CampaignQuestionType =
  | 'multiple_choice'
  | 'checkbox'
  | 'scale'
  | 'short_text'
  | 'long_text'
  | 'yes_no'
  | 'dropdown'
  | 'nps';

export interface CampaignOption {
  text: string;
  value?: number;
}

export interface OptinFields {
  nome: boolean;
  email: boolean;
  telefone: boolean;
  empresa: boolean;
  porte_empresa: boolean;
  departamento: boolean;
  cargo: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  tag: string | null;
  public_title: string | null;
  public_subtitle: string | null;
  image_url: string | null;
  optin_fields: OptinFields;
  thank_you_message: string | null;
  voucher_enabled?: boolean;
  voucher_code?: string | null;
  voucher_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignQuestion {
  id: string;
  campaign_id: string;
  question_text: string;
  question_type: CampaignQuestionType;
  options: CampaignOption[];
  scale_min: number | null;
  scale_max: number | null;
  is_required: boolean;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export interface CampaignResponse {
  id: string;
  lead_id: string;
  campaign_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
  created_at: string;
}

export const campaignTypeLabels: Record<CampaignType, string> = {
  diagnostico_score: 'Diagnóstico com Score',
  formulario_captura: 'Formulário de Captura',
  pesquisa: 'Pesquisa',
};

export const questionTypeLabels: Record<CampaignQuestionType, string> = {
  multiple_choice: 'Múltipla escolha (uma resposta)',
  checkbox: 'Caixas de seleção (múltiplas)',
  scale: 'Escala numérica',
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  yes_no: 'Sim / Não',
  dropdown: 'Dropdown',
  nps: 'NPS (0 a 10)',
};

export const defaultOptinFields: OptinFields = {
  nome: true,
  email: true,
  telefone: true,
  empresa: true,
  porte_empresa: true,
  departamento: true,
  cargo: true,
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
