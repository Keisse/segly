import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <Select value={theme} onValueChange={(value) => changeTheme(value as ThemeMode)}>
        <SelectTrigger className="max-w-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dark">
            <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Escuro</span>
          </SelectItem>
          <SelectItem value="light">
            <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Claro</span>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        A preferência fica salva neste dispositivo e é aplicada imediatamente.
      </p>
    </div>
  );
}
