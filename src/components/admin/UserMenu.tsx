import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User as UserIcon,
  LogOut,
  Cookie,
  Tag,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PrincipioDoDiaDialog } from "@/components/admin/PrincipioDoDiaDialog";


const APP_VERSION = "1.0.0";

const roleLabels: Record<string, string> = {
  admin: "admin",
  lider: "líder",
  user: "usuário",
};

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { data: role } = useMyRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [principleOpen, setPrincipleOpen] = useState(false);


  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name || ""));
  }, [user?.id]);

  const initials = (displayName || user?.email || "?")
    .split(/\s|@/)[0]
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-login");
  };

  const handleClearCookies = () => {
    try {
      document.cookie.split(";").forEach((c) => {
        const eq = c.indexOf("=");
        const name = eq > -1 ? c.substr(0, eq).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      Object.keys(localStorage).forEach((k) => {
        if (!k.startsWith("sb-")) localStorage.removeItem(k);
      });
      toast.success("Cookies limpos");
    } catch {
      toast.error("Não foi possível limpar os cookies");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition"
          aria-label="Menu do usuário"
        >
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 space-y-1">
          <p className="font-semibold text-base leading-tight">
            {displayName || user?.email?.split("@")[0] || "Usuário"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          {role && (
            <Badge variant="secondary" className="mt-1 rounded-full font-normal">
              {roleLabels[role] || role}
            </Badge>
          )}
        </div>
        <Separator />
        <div className="p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Versão:</span>
            <span className="font-semibold">{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Licença:</span>
            <span className="font-semibold text-emerald-500">Ativa</span>
          </div>
        </div>
        <Separator />
        <button
          onClick={() => {
            setOpen(false);
            setPrincipleOpen(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition text-left"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <p className="font-medium leading-tight">Princípio do dia</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Abra seu biscoito da sorte de hoje.
            </p>
          </div>
        </button>
        <Separator />

        <button
          onClick={() => {
            setOpen(false);
            navigate("/admin/meu-perfil");
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition text-left"
        >
          <UserIcon className="h-4 w-4" />
          Meu Perfil
        </button>
        <Separator />
        <button
          onClick={handleClearCookies}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition text-left"
        >
          <Cookie className="h-4 w-4" />
          Limpar cookies
        </button>
        <Separator />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-accent transition text-left"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </PopoverContent>
      <PrincipioDoDiaDialog open={principleOpen} onOpenChange={setPrincipleOpen} />
    </Popover>
  );
}

