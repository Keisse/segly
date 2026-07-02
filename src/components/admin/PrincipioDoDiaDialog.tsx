import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, X, Sparkles } from "lucide-react";
import { useTodayPrinciple, useSavePrinciple } from "@/hooks/usePrinciple";

export function PrincipioDoDiaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useTodayPrinciple();
  const save = useSavePrinciple();
  const [cracked, setCracked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCracked(false);
    setSaved(false);
    const t = setTimeout(() => setCracked(true), 350);
    return () => clearTimeout(t);
  }, [open, data?.principle.id]);

  useEffect(() => {
    if (data?.principle) setSaved(!!(data as { saved?: boolean }).saved);
  }, [data?.principle]);

  const handleSave = async () => {
    if (!data?.historyId) return;
    await save.mutateAsync({ historyId: data.historyId, saved: !saved });
    setSaved(!saved);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">

        <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-6 pt-8 text-center">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Princípio do Dia
          </div>

          {/* Fortune cookie */}
          <div className="relative h-40 mt-4 mb-2 flex items-center justify-center">
            <FortuneCookie cracked={cracked} />
          </div>

          <div
            className={`transition-all duration-700 ease-out ${
              cracked ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            {isLoading || !data ? (
              <p className="text-sm text-muted-foreground">Preparando seu princípio…</p>
            ) : (
              <>
                <p className="text-lg font-medium leading-relaxed px-2 text-foreground">
                  “{data.principle.phrase}”
                </p>
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant={saved ? "secondary" : "default"}
                    onClick={handleSave}
                    disabled={save.isPending || !data.historyId}
                    className="gap-2"
                  >
                    {saved ? (
                      <><BookmarkCheck className="h-4 w-4" /> Salvo</>
                    ) : (
                      <><Bookmark className="h-4 w-4" /> Salvar</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FortuneCookie({ cracked }: { cracked: boolean }) {
  // SVG-based cookie that splits open when cracked
  return (
    <svg
      viewBox="0 0 200 140"
      className="w-40 h-28"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cookie" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E9B96A" />
          <stop offset="100%" stopColor="#B77E3A" />
        </linearGradient>
      </defs>
      {/* Paper strip */}
      <g
        style={{
          transform: cracked ? "translateY(-6px)" : "translateY(20px)",
          opacity: cracked ? 1 : 0,
          transition: "all 500ms ease-out",
        }}
      >
        <rect x="80" y="30" width="40" height="60" rx="2" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <line x1="86" y1="42" x2="114" y2="42" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" />
        <line x1="86" y1="52" x2="114" y2="52" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" />
        <line x1="86" y1="62" x2="104" y2="62" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" />
      </g>
      {/* Left half */}
      <g
        style={{
          transformOrigin: "100px 100px",
          transform: cracked ? "translate(-24px,4px) rotate(-14deg)" : "translate(0,0) rotate(0)",
          transition: "transform 600ms cubic-bezier(.4,.6,.3,1.2)",
        }}
      >
        <path
          d="M100 40 Q60 40 45 90 Q60 120 100 110 Z"
          fill="url(#cookie)"
          stroke="#8B5A2B"
          strokeWidth="1.5"
        />
      </g>
      {/* Right half */}
      <g
        style={{
          transformOrigin: "100px 100px",
          transform: cracked ? "translate(24px,4px) rotate(14deg)" : "translate(0,0) rotate(0)",
          transition: "transform 600ms cubic-bezier(.4,.6,.3,1.2)",
        }}
      >
        <path
          d="M100 40 Q140 40 155 90 Q140 120 100 110 Z"
          fill="url(#cookie)"
          stroke="#8B5A2B"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
