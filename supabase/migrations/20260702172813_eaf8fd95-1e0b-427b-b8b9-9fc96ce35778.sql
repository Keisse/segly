
-- 1. campaign_responses: remove broad authenticated SELECT (admins already have ALL)
DROP POLICY IF EXISTS "Authenticated can view responses" ON public.campaign_responses;

-- 2. clientes: scope INSERT to the user's org and require the user to be the owner (or admin)
DROP POLICY IF EXISTS "Insert clientes authenticated" ON public.clientes;
CREATE POLICY "Insert clientes in own org"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IS NOT NULL
  AND organization_id = public.my_org()
  AND (owner_id IS NULL OR owner_id = auth.uid() OR public.is_admin())
);

-- 3. leads: scope authenticated INSERT to the user's org
DROP POLICY IF EXISTS "Insert leads authenticated" ON public.leads;
CREATE POLICY "Insert leads in own org"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IS NOT NULL
  AND organization_id = public.my_org()
  AND (owner_id IS NULL OR owner_id = auth.uid() OR public.is_admin())
);

-- 4. storage: remove broad listing on public campaign-images bucket
-- (public URLs continue to work; only directory listing is disabled)
DROP POLICY IF EXISTS "Public read campaign images" ON storage.objects;

-- 5. SECURITY DEFINER helper functions: revoke direct EXECUTE from anon/authenticated
-- These are only meant to be used from RLS policies and triggers.
REVOKE EXECUTE ON FUNCTION public.can_view_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_lider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_org() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.same_org(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is used by the client via rpc('has_role', ...) — keep it callable but only by signed-in users
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- list_org_members is called via rpc from the admin app
REVOKE EXECUTE ON FUNCTION public.list_org_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_members() TO authenticated;
