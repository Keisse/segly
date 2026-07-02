import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes once to changes in the `leads` table and invalidates
 * all lead-derived queries so Leads, Kanban and Dashboard stay in sync.
 */
export function useLeadRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("leads-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          qc.invalidateQueries({ queryKey: ["leads"] });
          qc.invalidateQueries({ queryKey: ["leads-by-pipeline"] });
          qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
          qc.invalidateQueries({ queryKey: ["lead"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
