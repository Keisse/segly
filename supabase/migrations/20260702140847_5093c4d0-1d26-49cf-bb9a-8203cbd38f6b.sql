
-- 1) Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  city text,
  state text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Default org
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Segly')
ON CONFLICT (id) DO NOTHING;

-- 2) organization_id on existing tables (nullable + backfill to default org)
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.leads      ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.clientes   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

UPDATE public.profiles  SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.leads     SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.campaigns SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.clientes  SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 3) Helper function: current user's organization
CREATE OR REPLACE FUNCTION public.my_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 4) RLS on organizations
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.my_org());

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.my_org() AND public.is_admin())
  WITH CHECK (id = public.my_org() AND public.is_admin());

-- 5) organization_settings
CREATE TABLE public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_lead_owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  track_change_history boolean NOT NULL DEFAULT true,
  in_app_notifications boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT true,
  inactive_lead_reminder_days integer NOT NULL DEFAULT 7,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organization_settings (organization_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

CREATE POLICY "Members can view org settings"
  ON public.organization_settings FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admins manage org settings"
  ON public.organization_settings FOR ALL
  TO authenticated
  USING (organization_id = public.my_org() AND public.is_admin())
  WITH CHECK (organization_id = public.my_org() AND public.is_admin());

-- 6) audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view org audit"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org() AND public.is_admin());

CREATE POLICY "Members can write org audit"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.my_org() AND actor_id = auth.uid());

-- 7) updated_at triggers
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
