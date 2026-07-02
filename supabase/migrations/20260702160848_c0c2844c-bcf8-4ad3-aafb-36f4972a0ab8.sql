
-- 1. Tables
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cor text DEFAULT '#1D9E75',
  ativo boolean NOT NULL DEFAULT true,
  arquivado boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pipelines_org_idx ON public.pipelines(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT ALL ON public.pipelines TO service_role;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines_select_org" ON public.pipelines
  FOR SELECT TO authenticated
  USING (organization_id = public.my_org() OR public.is_admin());
CREATE POLICY "pipelines_write_admin" ON public.pipelines
  FOR ALL TO authenticated
  USING (public.is_admin() OR (organization_id = public.my_org() AND public.is_lider()))
  WITH CHECK (public.is_admin() OR (organization_id = public.my_org() AND public.is_lider()));

CREATE TRIGGER pipelines_updated BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Stages
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#64748b',
  ordem integer NOT NULL DEFAULT 0,
  wip_limit integer,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pipeline_stages_pipeline_idx ON public.pipeline_stages(pipeline_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_select" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND (p.organization_id = public.my_org() OR public.is_admin())));
CREATE POLICY "pipeline_stages_write" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND (public.is_admin() OR (p.organization_id = public.my_org() AND public.is_lider()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pipelines p WHERE p.id = pipeline_id AND (public.is_admin() OR (p.organization_id = public.my_org() AND public.is_lider()))));

CREATE TRIGGER pipeline_stages_updated BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Leads add columns
ALTER TABLE public.leads
  ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  ADD COLUMN stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
CREATE INDEX leads_pipeline_idx ON public.leads(pipeline_id);
CREATE INDEX leads_stage_idx ON public.leads(stage_id);

-- Validate stage belongs to pipeline
CREATE OR REPLACE FUNCTION public.validate_lead_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage_id IS NOT NULL AND NEW.pipeline_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.pipeline_stages s WHERE s.id = NEW.stage_id AND s.pipeline_id = NEW.pipeline_id) THEN
      RAISE EXCEPTION 'stage_id % não pertence ao pipeline %', NEW.stage_id, NEW.pipeline_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER leads_validate_stage BEFORE INSERT OR UPDATE OF pipeline_id, stage_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.validate_lead_stage();

-- Sync stage -> status
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  s record;
BEGIN
  IF NEW.stage_id IS NULL THEN RETURN NEW; END IF;
  SELECT is_won, is_lost, nome INTO s FROM public.pipeline_stages WHERE id = NEW.stage_id;
  IF s.is_won THEN NEW.status := 'convertido';
  ELSIF s.is_lost THEN NEW.status := 'perdido';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER leads_sync_status BEFORE INSERT OR UPDATE OF stage_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_status_from_stage();

-- 4. Backfill: create default pipeline per organization
DO $$
DECLARE
  o record;
  pid uuid;
  s_novo uuid; s_contato uuid; s_qualif uuid; s_proposta uuid; s_negoc uuid; s_ganho uuid; s_perdido uuid;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.pipelines (organization_id, nome, descricao, cor, is_default, ordem)
    VALUES (o.id, 'Comercial', 'Pipeline padrão', '#1D9E75', true, 0)
    RETURNING id INTO pid;

    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Novo',           '#64748b', 0, false, false) RETURNING id INTO s_novo;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Em contato',     '#3b82f6', 1, false, false) RETURNING id INTO s_contato;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Qualificação',   '#8b5cf6', 2, false, false) RETURNING id INTO s_qualif;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Proposta',       '#eab308', 3, false, false) RETURNING id INTO s_proposta;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Negociação',     '#f97316', 4, false, false) RETURNING id INTO s_negoc;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Ganho',          '#10b981', 5, true,  false) RETURNING id INTO s_ganho;
    INSERT INTO public.pipeline_stages (pipeline_id, nome, cor, ordem, is_won, is_lost) VALUES
      (pid, 'Perdido',        '#ef4444', 6, false, true)  RETURNING id INTO s_perdido;

    -- Backfill leads da organização (leads não têm organization_id explícito ainda; associamos todos ao pipeline default da primeira org)
    -- Como leads não têm org, aplicamos apenas se for a primeira/default org
    IF o.id = '00000000-0000-0000-0000-000000000001'::uuid THEN
      UPDATE public.leads SET pipeline_id = pid, stage_id = CASE status::text
        WHEN 'novo' THEN s_novo
        WHEN 'em_analise' THEN s_qualif
        WHEN 'contatado' THEN s_contato
        WHEN 'em_negociacao' THEN s_negoc
        WHEN 'convertido' THEN s_ganho
        WHEN 'perdido' THEN s_perdido
        ELSE s_novo
      END
      WHERE pipeline_id IS NULL;
    END IF;
  END LOOP;
END $$;
