
-- Backfill: create profile for existing user and ensure trigger for future signups
INSERT INTO public.profiles (id, organization_id, display_name)
SELECT u.id, '00000000-0000-0000-0000-000000000001'::uuid, split_part(u.email, '@', 1)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure the existing user has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT '22e23c71-859f-42f8-8615-0252613e8c6b'::uuid, 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = '22e23c71-859f-42f8-8615-0252613e8c6b'::uuid AND role = 'admin'
);

-- Trigger to auto-create profile + admin (first user) or default membership on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (id, organization_id, display_name)
  VALUES (NEW.id, default_org, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
