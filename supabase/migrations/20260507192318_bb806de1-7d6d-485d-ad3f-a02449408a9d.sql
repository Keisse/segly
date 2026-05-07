
-- Enums
CREATE TYPE public.campaign_type AS ENUM ('diagnostico_score', 'formulario_captura', 'pesquisa');
CREATE TYPE public.campaign_status AS ENUM ('ativa', 'inativa');
CREATE TYPE public.campaign_question_type AS ENUM (
  'multiple_choice', 'checkbox', 'scale', 'short_text', 'long_text', 'yes_no', 'dropdown', 'nps'
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.campaign_type NOT NULL DEFAULT 'diagnostico_score',
  status public.campaign_status NOT NULL DEFAULT 'inativa',
  tag TEXT,
  public_title TEXT,
  public_subtitle TEXT,
  image_url TEXT,
  optin_fields JSONB NOT NULL DEFAULT '{"nome":true,"email":true,"telefone":true,"empresa":true,"porte_empresa":true,"departamento":true,"cargo":true}'::jsonb,
  thank_you_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.campaigns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public can read active campaigns" ON public.campaigns
  FOR SELECT USING (status = 'ativa');

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign questions
CREATE TABLE public.campaign_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type public.campaign_question_type NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  scale_min INTEGER,
  scale_max INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_questions_campaign ON public.campaign_questions(campaign_id, sort_order);

ALTER TABLE public.campaign_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign questions" ON public.campaign_questions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public reads questions of active campaigns" ON public.campaign_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.status = 'ativa')
  );

-- Alter leads
ALTER TABLE public.leads
  ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN campaign_slug TEXT,
  ADD COLUMN campaign_name TEXT;

CREATE INDEX idx_leads_campaign ON public.leads(campaign_id);

-- Allow public lead insert when tied to active campaign
CREATE POLICY "Public can insert leads for active campaigns" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    campaign_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.status = 'ativa')
  );

-- Campaign responses
CREATE TABLE public.campaign_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.campaign_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_responses_lead ON public.campaign_responses(lead_id);
CREATE INDEX idx_campaign_responses_campaign ON public.campaign_responses(campaign_id);

ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view responses" ON public.campaign_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage responses" ON public.campaign_responses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public can insert responses for active campaigns" ON public.campaign_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.status = 'ativa')
  );

-- Storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read campaign images" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaign-images');

CREATE POLICY "Admins upload campaign images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'campaign-images' AND public.is_admin());

CREATE POLICY "Admins update campaign images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'campaign-images' AND public.is_admin());

CREATE POLICY "Admins delete campaign images" ON storage.objects
  FOR DELETE USING (bucket_id = 'campaign-images' AND public.is_admin());

-- Default campaign + backfill existing leads
INSERT INTO public.campaigns (name, slug, description, type, status, public_title, public_subtitle, thank_you_message)
VALUES (
  'Diagnóstico Original',
  'diagnostico-original',
  'Campanha padrão criada automaticamente para os leads existentes do diagnóstico clássico.',
  'diagnostico_score',
  'ativa',
  'Diagnóstico de Maturidade da Execução',
  'Descubra em poucos minutos onde sua operação perde força entre a estratégia e o resultado.',
  'Obrigado! Seu diagnóstico foi processado com sucesso.'
);

UPDATE public.leads
SET campaign_id = (SELECT id FROM public.campaigns WHERE slug = 'diagnostico-original'),
    campaign_slug = 'diagnostico-original',
    campaign_name = 'Diagnóstico Original'
WHERE campaign_id IS NULL;
