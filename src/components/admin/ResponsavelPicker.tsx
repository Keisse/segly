import { useState } from "react";
import { Check, ChevronDown, Search, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrgMembers, type OrgMember } from "@/hooks/useOrgMembers";
import { capitalizeWords } from "@/lib/formatName";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function ResponsavelPicker({ value, onChange, disabled, className }: Props) {
  const { data: members = [], isLoading } = useOrgMembers();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = members.find((m) => m.id === value) || null;
  const query = q.trim().toLowerCase();
  const list = members.filter((m) => {
    if (!query) return true;
    const hay = `${m.display_name ?? ""} ${m.email ?? ""}`.toLowerCase();
    return hay.includes(query);
  });

  const pick = (m: OrgMember | null) => {
    onChange(m ? m.id : null);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "px-2 py-1 rounded text-xs font-medium min-w-[140px] text-left inline-flex items-center gap-1.5 border border-border/60 hover:bg-secondary/60 transition-colors",
            selected ? "bg-secondary/70 text-foreground" : "bg-secondary/30 text-muted-foreground",
            className
          )}
        >
          {selected ? (
            <>
              <Avatar className="w-4 h-4">
                {selected.avatar_url && <AvatarImage src={selected.avatar_url} />}
                <AvatarFallback className="text-[8px]">
                  {(selected.display_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{capitalizeWords(selected.display_name || "Usuário")}</span>
            </>
          ) : (
            <>
              <User className="w-3 h-3" />
              <span>Atribuir…</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar usuário…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-auto py-1">
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Carregando…</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-6 text-xs text-center text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <>
              {value && (
                <button
                  onClick={() => pick(null)}
                  className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  Remover responsável
                </button>
              )}
              {list.map((m) => {
                const active = m.id === value;
                return (
                  <button
                    key={m.id}
                    onClick={() => m.is_active && pick(m)}
                    disabled={!m.is_active}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/60 transition-colors",
                      active && "bg-muted/40",
                      !m.is_active && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Avatar className="w-6 h-6">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-[10px]">
                        {(m.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {capitalizeWords(m.display_name || "Usuário")}
                        {!m.is_active && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(inativo)</span>
                        )}
                      </p>
                      {m.email && (
                        <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                      )}
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
