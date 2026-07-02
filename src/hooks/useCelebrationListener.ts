import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const CELEBRATIONS_PREF_KEY = "celebrations_enabled";

export function celebrationsAllowed(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CELEBRATIONS_PREF_KEY) !== "off";
}

export function fireConfetti(stageName?: string) {
  if (!celebrationsAllowed()) return;
  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.7 } }), 200);
  setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.7 } }), 400);
  if (stageName) toast.success(`🎉 Etapa "${stageName}" concluída!`);
}

type Payload = {
  audience: "team" | "admins";
  stage_name?: string;
  actor_id?: string;
};

export function useCelebrationListener() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const uRes = await supabase.auth.getUser();
      const uid = uRes.data.user?.id;
      if (!uid || cancelled) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", uid)
        .maybeSingle();
      const orgId = (prof as { organization_id?: string } | null)?.organization_id;
      if (!orgId || cancelled) return;

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");

      const channel = supabase.channel(`celebrations:${orgId}`);
      channel
        .on("broadcast", { event: "celebrate" }, ({ payload }) => {
          const p = payload as Payload;
          if (!p) return;
          if (p.actor_id === uid) return; // initiator already saw it locally
          if (p.audience === "admins" && !isAdmin) return;
          fireConfetti(p.stage_name);
        })
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);
}
