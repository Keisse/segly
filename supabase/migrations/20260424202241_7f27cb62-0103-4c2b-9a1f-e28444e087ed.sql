-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_admin());
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Promover admin atual
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'lancamentos@redealumni.com'
ON CONFLICT DO NOTHING;

-- 2. Conjuntos de perguntas
CREATE TABLE public.question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  context text,
  pillars jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX one_active_question_set ON public.question_sets (is_active) WHERE is_active = true;

CREATE POLICY "Admins manage question sets" ON public.question_sets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public can read active set" ON public.question_sets
  FOR SELECT USING (is_active = true);

CREATE TRIGGER question_sets_updated_at
  BEFORE UPDATE ON public.question_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Base de conhecimento
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','pdf','docx','link','audio','video')),
  content text,
  file_url text,
  source_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge base" ON public.knowledge_base
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins read knowledge files" ON storage.objects
  FOR SELECT USING (bucket_id = 'knowledge-base' AND public.is_admin());
CREATE POLICY "Admins upload knowledge files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'knowledge-base' AND public.is_admin());
CREATE POLICY "Admins update knowledge files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'knowledge-base' AND public.is_admin());
CREATE POLICY "Admins delete knowledge files" ON storage.objects
  FOR DELETE USING (bucket_id = 'knowledge-base' AND public.is_admin());