import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePrinciplePrefs } from "@/hooks/usePrinciple";
import { useAuth } from "@/hooks/useAuth";
import { PrincipioDoDiaDialog } from "./PrincipioDoDiaDialog";

const CRITICAL_PATHS = [
  "/admin/campanhas/nova",
  "/admin/campanhas/",
];

/**
 * Automatically opens the Princípio do Dia dialog based on the user's
 * preference, once per day. Skips critical flows (campaign editor, etc.).
 */
export function PrincipioAutoOpener() {
  const { user } = useAuth();
  const { prefs } = usePrinciplePrefs();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !prefs.enabled) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `principle-shown-${user.id}-${today}`;
    if (localStorage.getItem(key)) return;

    const isCritical = CRITICAL_PATHS.some((p) => location.pathname.startsWith(p));
    if (isCritical) return;

    const shouldTrigger =
      prefs.when === "first_access" ||
      (prefs.when === "dashboard" && location.pathname === "/admin/dashboard");
    if (!shouldTrigger) return;

    localStorage.setItem(key, "1");
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [user?.id, prefs.enabled, prefs.when, location.pathname]);

  return <PrincipioDoDiaDialog open={open} onOpenChange={setOpen} />;
}
