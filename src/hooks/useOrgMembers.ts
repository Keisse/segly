import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgMember = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export function useOrgMembers(opts?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["org-members", opts?.activeOnly ?? false],
    queryFn: async (): Promise<OrgMember[]> => {
      const { data, error } = await supabase.rpc("list_org_members" as never);
      if (error) throw error;
      const list = (data as OrgMember[] | null) ?? [];
      return opts?.activeOnly ? list.filter((m) => m.is_active) : list;
    },
    staleTime: 60_000,
  });
}
