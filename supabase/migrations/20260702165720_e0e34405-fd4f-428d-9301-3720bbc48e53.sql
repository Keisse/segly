
-- 1. profiles.is_active
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Same-org profile visibility
CREATE OR REPLACE FUNCTION public.same_org(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.organization_id = public.my_org()
  )
$$;

DROP POLICY IF EXISTS "profiles_same_org_select" ON public.profiles;
CREATE POLICY "profiles_same_org_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.my_org() OR id = auth.uid() OR public.is_admin());

-- 3. Secure listing of org members with email
CREATE OR REPLACE FUNCTION public.list_org_members()
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  avatar_url text,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name, u.email::text, p.avatar_url, p.is_active
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.organization_id = public.my_org()
  ORDER BY p.display_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_org_members() TO authenticated;

-- 4. Default pipeline trigger for new leads
CREATE OR REPLACE FUNCTION public.leads_apply_default_pipeline()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_pipeline uuid;
  v_stage uuid;
BEGIN
  IF NEW.pipeline_id IS NOT NULL AND NEW.stage_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_org := COALESCE(NEW.organization_id, '00000000-0000-0000-0000-000000000001'::uuid);
  NEW.organization_id := v_org;

  IF NEW.pipeline_id IS NULL THEN
    SELECT id INTO v_pipeline
    FROM public.pipelines
    WHERE organization_id = v_org AND is_default = true AND arquivado = false
    ORDER BY ordem LIMIT 1;

    IF v_pipeline IS NULL THEN
      SELECT id INTO v_pipeline
      FROM public.pipelines
      WHERE organization_id = v_org AND arquivado = false
      ORDER BY ordem LIMIT 1;
    END IF;

    IF v_pipeline IS NULL THEN
      RAISE EXCEPTION 'Nenhum pipeline padrão configurado para esta organização. Configure em Configurações › Pipeline.';
    END IF;

    NEW.pipeline_id := v_pipeline;
  END IF;

  IF NEW.stage_id IS NULL THEN
    SELECT id INTO v_stage
    FROM public.pipeline_stages
    WHERE pipeline_id = NEW.pipeline_id
    ORDER BY ordem LIMIT 1;
    NEW.stage_id := v_stage;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_default_pipeline ON public.leads;
CREATE TRIGGER trg_leads_default_pipeline
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_apply_default_pipeline();

-- 5. Extend sync_lead_status_from_stage to map common stage names
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_stage()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  s record;
  nm text;
BEGIN
  IF NEW.stage_id IS NULL THEN RETURN NEW; END IF;
  SELECT is_won, is_lost, nome INTO s FROM public.pipeline_stages WHERE id = NEW.stage_id;
  IF s.is_won THEN
    NEW.status := 'convertido';
  ELSIF s.is_lost THEN
    NEW.status := 'perdido';
  ELSE
    nm := lower(unaccent(coalesce(s.nome, '')));
    IF nm LIKE '%novo%' THEN NEW.status := 'novo';
    ELSIF nm LIKE '%contato%' OR nm LIKE '%contatad%' THEN NEW.status := 'contatado';
    ELSIF nm LIKE '%negocia%' THEN NEW.status := 'em_negociacao';
    ELSIF nm LIKE '%qualific%' OR nm LIKE '%proposta%' OR nm LIKE '%analise%' THEN NEW.status := 'em_analise';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- unaccent may not exist; fall back gracefully
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS trg_sync_lead_status_from_stage ON public.leads;
CREATE TRIGGER trg_sync_lead_status_from_stage
BEFORE INSERT OR UPDATE OF stage_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_status_from_stage();

-- 6. History log trigger for stage/owner changes
CREATE OR REPLACE FUNCTION public.leads_log_history()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  ev jsonb;
  actor uuid := auth.uid();
  desc_text text;
  stage_nome text;
  pipeline_nome text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT ps.nome, p.nome INTO stage_nome, pipeline_nome
    FROM public.pipeline_stages ps
    LEFT JOIN public.pipelines p ON p.id = ps.pipeline_id
    WHERE ps.id = NEW.stage_id;
    desc_text := 'Lead criado e inserido no pipeline ' || COALESCE(pipeline_nome,'-') || ', etapa ' || COALESCE(stage_nome,'-');
    ev := jsonb_build_object(
      'id', gen_random_uuid(),
      'data', now(),
      'tipo', 'sistema',
      'descricao', desc_text,
      'resultado', 'criado',
      'actor', actor
    );
    NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(ev);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
      SELECT nome INTO stage_nome FROM public.pipeline_stages WHERE id = NEW.stage_id;
      ev := jsonb_build_object(
        'id', gen_random_uuid(),
        'data', now(),
        'tipo', 'sistema',
        'descricao', 'Etapa alterada para "' || COALESCE(stage_nome,'-') || '"',
        'resultado', 'stage_changed',
        'actor', actor
      );
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(ev);
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      SELECT display_name INTO stage_nome FROM public.profiles WHERE id = NEW.owner_id;
      ev := jsonb_build_object(
        'id', gen_random_uuid(),
        'data', now(),
        'tipo', 'sistema',
        'descricao', CASE WHEN NEW.owner_id IS NULL THEN 'Responsável removido' ELSE 'Responsável atribuído: ' || COALESCE(stage_nome,'usuário') END,
        'resultado', 'owner_changed',
        'actor', actor
      );
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(ev);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_log_history ON public.leads;
CREATE TRIGGER trg_leads_log_history
BEFORE INSERT OR UPDATE OF stage_id, owner_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_log_history();

-- 7. Ensure a default pipeline exists for the default org
UPDATE public.pipelines SET is_default = true
WHERE id = (
  SELECT id FROM public.pipelines
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY ordem LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.pipelines
  WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND is_default = true
);

-- 8. Realtime for leads
ALTER TABLE public.leads REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.leads';
  END IF;
END $$;
