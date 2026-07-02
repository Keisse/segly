
-- Enum de público
CREATE TYPE public.principle_audience AS ENUM ('all', 'user', 'lider', 'admin');
CREATE TYPE public.principle_status AS ENUM ('published', 'paused', 'archived');

-- Biblioteca de princípios
CREATE TABLE public.principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phrase text NOT NULL,
  audience public.principle_audience NOT NULL DEFAULT 'all',
  status public.principle_status NOT NULL DEFAULT 'published',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.principles TO authenticated;
GRANT ALL ON public.principles TO service_role;
ALTER TABLE public.principles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_principles_org_status ON public.principles(organization_id, status);

-- Leitura: membros da organização veem os publicados destinados ao seu papel
CREATE POLICY "Members read published principles"
  ON public.principles FOR SELECT
  TO authenticated
  USING (
    organization_id = public.my_org()
    AND (
      public.is_admin()
      OR (
        status = 'published'
        AND (
          audience = 'all'
          OR (audience = 'admin' AND public.is_admin())
          OR (audience = 'lider' AND public.is_lider())
          OR (audience = 'user' AND NOT public.is_admin() AND NOT public.is_lider())
        )
      )
    )
  );

CREATE POLICY "Admins manage principles"
  ON public.principles FOR ALL
  TO authenticated
  USING (organization_id = public.my_org() AND public.is_admin())
  WITH CHECK (organization_id = public.my_org() AND public.is_admin());

CREATE TRIGGER trg_principles_updated_at
  BEFORE UPDATE ON public.principles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico por usuário
CREATE TABLE public.principle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  principle_id uuid NOT NULL REFERENCES public.principles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shown_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  saved boolean NOT NULL DEFAULT false,
  cycle integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.principle_history TO authenticated;
GRANT ALL ON public.principle_history TO service_role;
ALTER TABLE public.principle_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_principle_history_user_date ON public.principle_history(user_id, shown_date DESC);

CREATE POLICY "Users see own history"
  ON public.principle_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own history"
  ON public.principle_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own history"
  ON public.principle_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
