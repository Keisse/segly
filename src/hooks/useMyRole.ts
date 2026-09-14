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

      const [{ data: isAdmin, error: adminError }, { data: isLeader, error: leaderError }] = await Promise.all([
        supabase.rpc("is_admin" as never),
        supabase.rpc("is_lider" as never),
      ]);

      if (adminError) {
        console.error("Erro ao verificar papel de administrador:", adminError);
        throw adminError;
      }
      if (leaderError) {
        console.error("Erro ao verificar papel de líder:", leaderError);
        throw leaderError;
      }

      if (isAdmin === true) return "admin";
      if (isLeader === true) return "lider";
      return "user";
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useIsAdmin() {
  const { data } = useMyRole();
  return data === "admin";
}
