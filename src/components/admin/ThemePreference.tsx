import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getTheme, setTheme, type ThemeMode } from "@/lib/theme";

export function ThemePreference() {
  const [theme, setCurrentTheme] = useState<ThemeMode>(() => getTheme());

  useEffect(() => {
    const sync = () => setCurrentTheme(getTheme());
    window.addEventListener("segly-theme-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("segly-theme-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const changeTheme = (value: ThemeMode) => {
    setCurrentTheme(value);
    setTheme(value);
  };

  return (
    <div className="space-y-2">
      <Label>Tema do sistema</Label>
      <div className="grid max-w-sm grid-cols-2 gap-2" role="group" aria-label="Tema do sistema">
        <Button
          type="button"
          variant={theme === "light" ? "default" : "outline"}
          className="justify-center gap-2"
          aria-pressed={theme === "light"}
          onClick={() => changeTheme("light")}
        >
          <Sun className="h-4 w-4" />
          Claro
        </Button>
        <Button
          type="button"
          variant={theme === "dark" ? "default" : "outline"}
          className="justify-center gap-2"
          aria-pressed={theme === "dark"}
          onClick={() => changeTheme("dark")}
        >
          <Moon className="h-4 w-4" />
          Escuro
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Um clique aplica o tema imediatamente e salva a preferência neste dispositivo.
      </p>
    </div>
  );
}
