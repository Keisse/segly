import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Principle = {
  id: string;
  phrase: string;
  audience: "all" | "user" | "lider" | "admin";
  status: "published" | "paused" | "archived";
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type PrinciplePrefs = {
  enabled: boolean;
  when: "first_access" | "dashboard" | "on_demand";
};

const DEFAULT_PREFS: PrinciplePrefs = {
  enabled: false,
  when: "first_access",
};

export function usePrinciplePrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["principle-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user!.id)
        .maybeSingle();
      const prefs = (data?.preferences as { principle_of_day?: Partial<PrinciplePrefs> } | null)
        ?.principle_of_day;
      return { ...DEFAULT_PREFS, ...(prefs ?? {}) } as PrinciplePrefs;
    },
  });

  const update = useMutation({
    mutationFn: async (next: Partial<PrinciplePrefs>) => {
      if (!user?.id) return;
      const { data: current } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle();
      const merged = {
        ...((current?.preferences as Record<string, unknown>) ?? {}),
        principle_of_day: { ...(q.data ?? DEFAULT_PREFS), ...next },
      };
      const { error } = await supabase
        .from("profiles")
        .update({ preferences: merged })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["principle-prefs"] }),
  });

  return { prefs: q.data ?? DEFAULT_PREFS, isLoading: q.isLoading, update: update.mutateAsync };
}

async function pickPrincipleForUser(userId: string, orgId: string): Promise<Principle | null> {
  const [{ data: pool }, { data: history }] = await Promise.all([
    supabase.from("principles" as never).select("*").eq("status", "published"),
    supabase
      .from("principle_history" as never)
      .select("principle_id, cycle")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const principles = ((pool ?? []) as unknown as Principle[]).filter((p) => p.organization_id === orgId);
  if (principles.length === 0) return null;

  const hist = (history ?? []) as { principle_id: string; cycle: number }[];
  const currentCycle = hist[0]?.cycle ?? 1;
  const seenInCycle = new Set(
    hist.filter((h) => h.cycle === currentCycle).map((h) => h.principle_id)
  );
  let candidates = principles.filter((p) => !seenInCycle.has(p.id));
  let cycle = currentCycle;
  if (candidates.length === 0) {
    cycle = currentCycle + 1;
    candidates = principles;
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  await supabase.from("principle_history" as never).insert({
    user_id: userId,
    principle_id: chosen.id,
    organization_id: orgId,
    cycle,
  } as never);
  return chosen;
}

/** Retorna o princípio do dia (uma vez por dia) ou null se já foi mostrado hoje. */
export function useTodayPrinciple() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["principle-today", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ principle: Principle; historyId: string; alreadyShown: boolean } | null> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user!.id)
        .maybeSingle();
      const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
      if (!orgId) return null;

      const today = new Date().toISOString().slice(0, 10);
      const { data: shownToday } = await supabase
        .from("principle_history" as never)
        .select("id, principle_id, saved, principles(*)" as never)
        .eq("user_id", user!.id)
        .eq("shown_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shownToday) {
        const row = shownToday as unknown as {
          id: string;
          principle_id: string;
          principles: Principle;
        };
        return { principle: row.principles, historyId: row.id, alreadyShown: true };
      }

      const chosen = await pickPrincipleForUser(user!.id, orgId);
      if (!chosen) return null;

      const { data: hist } = await supabase
        .from("principle_history" as never)
        .select("id")
        .eq("user_id", user!.id)
        .eq("principle_id", chosen.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        principle: chosen,
        historyId: (hist as { id: string } | null)?.id ?? "",
        alreadyShown: false,
      };
    },
  });
}

export function useSavePrinciple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ historyId, saved }: { historyId: string; saved: boolean }) => {
      const { error } = await supabase
        .from("principle_history" as never)
        .update({ saved } as never)
        .eq("id", historyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["principle-today"] });
      qc.invalidateQueries({ queryKey: ["saved-principles"] });
    },
  });
}

export function useSavedPrinciples() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-principles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("principle_history" as never)
        .select("id, saved, shown_date, principles(id, phrase)" as never)
        .eq("user_id", user!.id)
        .eq("saved", true)
        .order("shown_date", { ascending: false });
      return (data ?? []) as unknown as Array<{
        id: string;
        saved: boolean;
        shown_date: string;
        principles: { id: string; phrase: string };
      }>;
    },
  });
}
