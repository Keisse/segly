import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Activity = {
  id: string;
  lead_id: string;
  responsible_id: string;
  type: string;
  scheduled_at: string;
  notes: string | null;
  status: "pendente" | "concluida" | "cancelada";
  completed_at: string | null;
};

export function usePendingActivitiesForLeads(leadIds: string[]) {
  return useQuery({
    queryKey: ["pending-activities", leadIds],
    queryFn: async () => {
      if (leadIds.length === 0) return [];
      const { data, error } = await supabase
        .from("activities" as never)
        .select("id, lead_id, responsible_id, type, scheduled_at, notes, status, completed_at")
        .in("lead_id", leadIds)
        .eq("status", "pendente")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Activity[];
    },
    enabled: leadIds.length > 0,
  });
}
