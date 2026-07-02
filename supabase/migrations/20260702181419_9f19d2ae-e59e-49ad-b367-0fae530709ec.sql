
-- 1. Add custom_fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Enum type for field type
DO $$ BEGIN
  CREATE TYPE public.lead_form_field_type AS ENUM (
    'short_text','long_text','email','phone','number','date','select','multiselect','checkbox','company'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. lead_form_fields
CREATE TABLE IF NOT EXISTS public.lead_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  type public.lead_form_field_type NOT NULL,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  placeholder text,
  help_text text,
  default_value text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  maps_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_form_fields TO authenticated;
GRANT ALL ON public.lead_form_fields TO service_role;

ALTER TABLE public.lead_form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_fields_select_same_org" ON public.lead_form_fields;
CREATE POLICY "form_fields_select_same_org" ON public.lead_form_fields
  FOR SELECT TO authenticated
  USING (organization_id = public.my_org());

DROP POLICY IF EXISTS "form_fields_admin_write" ON public.lead_form_fields;
CREATE POLICY "form_fields_admin_write" ON public.lead_form_fields
  FOR ALL TO authenticated
  USING (organization_id = public.my_org() AND public.is_admin())
  WITH CHECK (organization_id = public.my_org() AND public.is_admin());

-- Prevent deletion of system fields
CREATE OR REPLACE FUNCTION public.prevent_delete_system_form_field()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Campos padrão do sistema não podem ser excluídos. Desative-o em vez de excluir.';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_delete_system_form_field ON public.lead_form_fields;
CREATE TRIGGER trg_prevent_delete_system_form_field
  BEFORE DELETE ON public.lead_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_form_field();

CREATE TRIGGER trg_lead_form_fields_updated_at
  BEFORE UPDATE ON public.lead_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed function
CREATE OR REPLACE FUNCTION public.seed_default_lead_form(_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_form_fields (organization_id, field_key, label, type, required, ordem, placeholder, maps_to, is_system, options)
  VALUES
    (_org, 'nome',        'Nome',               'short_text', true, 0, 'Seu nome completo',       'nome',       true, '[]'::jsonb),
    (_org, 'telefone',    'WhatsApp/Telefone',  'phone',      true, 1, '(11) 99999-9999',         'telefone',   true, '[]'::jsonb),
    (_org, 'email',       'E-mail Corporativo', 'email',      true, 2, 'seuemail@empresa.com.br', 'email',      true, '[]'::jsonb),
    (_org, 'empresa',     'Nome da Empresa',    'company',    true, 3, 'Nome da empresa',         'empresa',    true, '[]'::jsonb),
    (_org, 'porte',       'Porte da Empresa',   'select',     true, 4, 'Selecione...',            'porte_empresa', true,
      '["Autônomo","2 - 10 funcionários","11 - 50 funcionários","51 - 200 funcionários","201 - 500 funcionários","501 - 1000 funcionários","1001 - 5000 funcionários","5001+ funcionários"]'::jsonb),
    (_org, 'departamento','Seu Departamento',   'select',     true, 5, 'Selecione...',            'departamento', true,
      '["Recursos Humanos","Treinamento & Desenvolvimento","Tecnologia","Business Intelligence/Dados","Produto","Inovação","Marketing","Compras","Não tem departamento","Outros"]'::jsonb),
    (_org, 'cargo',       'Seu Cargo',          'select',     true, 6, 'Selecione...',            'cargo',      true,
      '["C-level","Diretor(a)","Gerente","Coordenador(a)/Supervisor(a)","Especialista","Analista","Estagiário / Estudante","Outros"]'::jsonb)
  ON CONFLICT (organization_id, field_key) DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public.seed_default_lead_form(uuid) FROM anon, authenticated, PUBLIC;

-- 5. Restore RPC (admin only)
CREATE OR REPLACE FUNCTION public.restore_default_lead_form()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente administradores podem restaurar o formulário padrão.';
  END IF;
  v_org := public.my_org();
  -- bypass delete trigger by unsetting is_system momentarily
  UPDATE public.lead_form_fields SET is_system = false WHERE organization_id = v_org AND is_system = true;
  DELETE FROM public.lead_form_fields WHERE organization_id = v_org AND field_key IN ('nome','telefone','email','empresa','porte','departamento','cargo');
  PERFORM public.seed_default_lead_form(v_org);
END $$;

GRANT EXECUTE ON FUNCTION public.restore_default_lead_form() TO authenticated;

-- 6. Trigger to auto-seed on new org
CREATE OR REPLACE FUNCTION public.trg_seed_lead_form_on_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_lead_form(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_lead_form_new_org ON public.organizations;
CREATE TRIGGER trg_seed_lead_form_new_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_lead_form_on_org();

-- 7. Seed existing orgs
DO $$
DECLARE o record;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_lead_form(o.id);
  END LOOP;
END $$;

-- 8. Extend history trigger to detect manual origin (fonte='manual')
CREATE OR REPLACE FUNCTION public.leads_log_history()
 RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $function$
DECLARE
  ev jsonb;
  actor uuid := auth.uid();
  actor_name text;
  desc_text text;
  stage_nome text;
  pipeline_nome text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT ps.nome, p.nome INTO stage_nome, pipeline_nome
    FROM public.pipeline_stages ps
    LEFT JOIN public.pipelines p ON p.id = ps.pipeline_id
    WHERE ps.id = NEW.stage_id;
    IF NEW.fonte = 'manual' THEN
      SELECT display_name INTO actor_name FROM public.profiles WHERE id = actor;
      desc_text := 'Lead cadastrado manualmente por ' || COALESCE(actor_name, 'usuário');
    ELSE
      desc_text := 'Lead criado e inserido no pipeline ' || COALESCE(pipeline_nome,'-') || ', etapa ' || COALESCE(stage_nome,'-');
    END IF;
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
        'id', gen_random_uuid(), 'data', now(), 'tipo', 'sistema',
        'descricao', 'Etapa alterada para "' || COALESCE(stage_nome,'-') || '"',
        'resultado', 'stage_changed', 'actor', actor
      );
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(ev);
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      SELECT display_name INTO stage_nome FROM public.profiles WHERE id = NEW.owner_id;
      ev := jsonb_build_object(
        'id', gen_random_uuid(), 'data', now(), 'tipo', 'sistema',
        'descricao', CASE WHEN NEW.owner_id IS NULL THEN 'Responsável removido' ELSE 'Responsável atribuído: ' || COALESCE(stage_nome,'usuário') END,
        'resultado', 'owner_changed', 'actor', actor
      );
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(ev);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;
