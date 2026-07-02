import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "lider" | "user" | "moderator";

export function useMyRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: async (): Promise<AppRole> => {
      if (!user) return "user";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data || []).map((r: any) => r.role as AppRole);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("lider")) return "lider";
      return "user";
    },
    enabled: !!user,
  });
}

export function useIsAdmin() {
  const { data } = useMyRole();
  return data === "admin";
}
