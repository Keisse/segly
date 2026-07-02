import { useEffect } from "react";

/**
 * Warns the user (browser confirm) before unloading the page when there are
 * unsaved changes. React Router v6 removed a stable blocker API, so we
 * expose a `confirmDiscard()` helper the UI can await before tab switches.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const confirmDiscard = (): boolean => {
    if (!hasChanges) return true;
    return window.confirm(
      "Você tem alterações não salvas. Deseja descartá-las?"
    );
  };

  return { confirmDiscard };
}
