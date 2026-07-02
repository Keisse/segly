
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  lider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Owner column on leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_lider()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'lider')
$$;

CREATE OR REPLACE FUNCTION public.can_view_owner(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_admin()
    OR _owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _owner AND p.lider_id = auth.uid()
    )
$$;

-- Leads policies
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

CREATE POLICY "View leads by scope" ON public.leads
  FOR SELECT TO authenticated
  USING (public.can_view_owner(owner_id) OR (owner_id IS NULL AND public.is_admin()));
CREATE POLICY "Insert leads authenticated" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update leads by scope" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.can_view_owner(owner_id) OR (owner_id IS NULL AND public.is_admin()));
CREATE POLICY "Delete leads admin or owner" ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pipeline_origem text,
  data_conversao timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ativo',
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View clientes by scope" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.can_view_owner(owner_id) OR (owner_id IS NULL AND public.is_admin()));
CREATE POLICY "Insert clientes authenticated" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update clientes by scope" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.can_view_owner(owner_id) OR (owner_id IS NULL AND public.is_admin()));
CREATE POLICY "Delete clientes admin or owner" ON public.clientes
  FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_clientes_owner ON public.clientes(owner_id);
CREATE INDEX IF NOT EXISTS idx_clientes_lead ON public.clientes(lead_id);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
