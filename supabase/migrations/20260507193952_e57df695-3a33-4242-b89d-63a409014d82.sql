
-- Rename existing campaign to represent the Outbound flow (/diagnostico)
UPDATE public.campaigns
SET name = 'Diagnóstico (Outbound)',
    slug = 'diagnostico',
    description = 'Captura via página /diagnostico (Outbound)',
    tag = 'outbound'
WHERE slug = 'diagnostico-original';

-- Create new campaign for the Inbound flow (/diagnostico-direto)
INSERT INTO public.campaigns (name, slug, description, type, status, tag)
VALUES (
  'Diagnóstico Direto (Inbound)',
  'diagnostico-direto',
  'Captura via página /diagnostico-direto (Inbound)',
  'diagnostico_score',
  'ativa',
  'inbound'
)
ON CONFLICT DO NOTHING;

-- Reassign existing inbound leads to the new inbound campaign
UPDATE public.leads
SET campaign_id = (SELECT id FROM public.campaigns WHERE slug = 'diagnostico-direto'),
    campaign_slug = 'diagnostico-direto',
    campaign_name = 'Diagnóstico Direto (Inbound)'
WHERE fonte = 'inbound';

-- Reassign existing outbound leads to the renamed outbound campaign
UPDATE public.leads
SET campaign_id = (SELECT id FROM public.campaigns WHERE slug = 'diagnostico'),
    campaign_slug = 'diagnostico',
    campaign_name = 'Diagnóstico (Outbound)'
WHERE fonte = 'outbound';
