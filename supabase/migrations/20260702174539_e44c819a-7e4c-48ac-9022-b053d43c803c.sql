
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_org() TO authenticated;
GRANT EXECUTE ON FUNCTION public.same_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lider() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_owner(uuid) TO authenticated;
