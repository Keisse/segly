
-- 1) Colunas de celebração em pipeline_stages
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS celebrate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS celebrate_type text NOT NULL DEFAULT 'confetti',
  ADD COLUMN IF NOT EXISTS celebrate_audience text NOT NULL DEFAULT 'owner';

-- 2) Tabela de dedupe de celebrações por (lead, etapa)
CREATE TABLE IF NOT EXISTS public.lead_stage_celebrations (
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  celebrated_at timestamptz NOT NULL DEFAULT now(),
  celebrated_by uuid,
  PRIMARY KEY (lead_id, stage_id)
);

GRANT SELECT, INSERT ON public.lead_stage_celebrations TO authenticated;
GRANT ALL ON public.lead_stage_celebrations TO service_role;

ALTER TABLE public.lead_stage_celebrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lsc_select_org" ON public.lead_stage_celebrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_stage_celebrations.lead_id
        AND (public.can_view_owner(l.owner_id) OR (l.owner_id IS NULL AND public.is_admin()))
    )
  );

CREATE POLICY "lsc_insert_org" ON public.lead_stage_celebrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_stage_celebrations.lead_id
        AND (public.can_view_owner(l.owner_id) OR (l.owner_id IS NULL AND public.is_admin()))
    )
  );

-- 3) Restringir escrita em pipelines/pipeline_stages APENAS a admin
DROP POLICY IF EXISTS "pipelines_write_admin" ON public.pipelines;
CREATE POLICY "pipelines_write_admin" ON public.pipelines
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pipeline_stages_write" ON public.pipeline_stages;
CREATE POLICY "pipeline_stages_write" ON public.pipeline_stages
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
