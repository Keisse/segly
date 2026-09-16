import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";

type Pipeline = { id: string; nome: string; cor: string | null; is_default?: boolean };

interface Props {
  pipelines: Pipeline[];
  activeId: string | null;
  onSelect: (id: string) => void;
  rightActions?: ReactNode;
}

const storageKey = (userId: string) => `segly:pipeline-tabs:${userId}`;

export function PipelineTabs({ pipelines, activeId, onSelect, rightActions }: Props) {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const isAdmin = role === "admin";
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [popOpen, setPopOpen] = useState(false);
  const defaultPipeline = useMemo(() => pipelines.find((p) => p.is_default) ?? null, [pipelines]);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(storageKey(user.id));
    if (raw) {
      try {
        const arr = JSON.parse(raw) as string[];
        const valid = arr.filter((id) => pipelines.some((p) => p.id === id));
        if (defaultPipeline && !valid.includes(defaultPipeline.id)) valid.push(defaultPipeline.id);
        setOpenIds(valid.length ? valid : pipelines.map((p) => p.id));
        return;
      } catch {
        // ignore
      }
    }
    setOpenIds(pipelines.map((p) => p.id));
  }, [user, pipelines, defaultPipeline]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(openIds));
  }, [user, openIds]);

  useEffect(() => {
    setOpenIds((prev) => {
      const next = prev.filter((id) => pipelines.some((p) => p.id === id));
      if (defaultPipeline && !next.includes(defaultPipeline.id)) next.push(defaultPipeline.id);
      if (activeId && pipelines.some((p) => p.id === activeId) && !next.includes(activeId)) next.push(activeId);
      return next.length === prev.length && next.every((id, index) => id === prev[index]) ? prev : next;
    });
  }, [activeId, pipelines, defaultPipeline]);

  const openTabs = useMemo(
    () => openIds.map((id) => pipelines.find((p) => p.id === id)).filter(Boolean) as Pipeline[],
    [openIds, pipelines]
  );
  const available = useMemo(
    () => pipelines.filter((p) => !openIds.includes(p.id)),
    [pipelines, openIds]
  );

  const addTab = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onSelect(id);
    setPopOpen(false);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (id === defaultPipeline?.id) return;
    const remaining = openIds.filter((x) => x !== id);
    setOpenIds(remaining);
    if (id === activeId && remaining.length > 0) onSelect(remaining[0]);
  };

  return (
    <div className="flex items-center gap-3 border-b border-border min-w-0">
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {openTabs.map((p) => {
          const active = p.id === activeId;
          const isDefault = p.id === defaultPipeline?.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`group relative inline-flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.cor ?? "#1D9E75" }} />
              {p.nome}
              {openTabs.length > 1 && !isDefault && (
                <span role="button" onClick={(e) => closeTab(e, p.id)} className="ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" aria-label={`Fechar aba ${p.nome}`}>
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-1 h-9 shrink-0"><Plus className="w-4 h-4 mr-1" /> Adicionar pipeline</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0 w-[260px]">
            {available.length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground space-y-2">
                <p>Todos os pipelines já estão abertos.</p>
                {isAdmin && <Link to="/admin/configuracoes?tab=pipeline" className="text-primary hover:underline" onClick={() => setPopOpen(false)}>Criar novo pipeline</Link>}
              </div>
            ) : (
              <div className="max-h-72 overflow-auto py-1">
                {available.map((p) => (
                  <button key={p.id} onClick={() => addTab(p.id)} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/60 transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.cor ?? "#1D9E75" }} />
                    <span className="truncate">{p.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {rightActions && <div className="shrink-0 pb-1">{rightActions}</div>}
    </div>
  );
}
