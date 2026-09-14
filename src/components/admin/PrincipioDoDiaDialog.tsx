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
  const [opened, setOpened] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOpened(false);
    setSaved(false);
    const t = setTimeout(() => setOpened(true), 350);
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

          <div className="relative h-44 mt-3 mb-2 flex items-center justify-center">
            <AnimatedScroll opened={opened} />
          </div>

          <div
            className={`transition-all duration-700 ease-out ${
              opened ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            {isLoading || !data ? (
              <p className="text-sm text-muted-foreground">Abrindo seu pergaminho…</p>
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

function AnimatedScroll({ opened }: { opened: boolean }) {
  return (
    <div className="relative w-48 h-36 flex items-center justify-center" aria-hidden="true">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-700 ease-out overflow-hidden shadow-lg"
        style={{
          width: opened ? "168px" : "46px",
          height: opened ? "104px" : "18px",
          transform: `translate(-50%, -50%) scale(${opened ? 1 : 0.92})`,
          borderRadius: opened ? "8px" : "12px",
          background: "linear-gradient(180deg, #F5E3B7 0%, #E8C98A 100%)",
          border: "1px solid #B48A4A",
        }}
      >
        <div
          className="absolute inset-x-5 top-7 space-y-2 transition-opacity duration-500"
          style={{ opacity: opened ? 1 : 0 }}
        >
          <div className="h-px bg-[#9A7747]/55" />
          <div className="h-px bg-[#9A7747]/45" />
          <div className="h-px bg-[#9A7747]/35 w-3/4 mx-auto" />
        </div>
      </div>

      <div
        className="absolute transition-all duration-700 ease-out rounded-full shadow-md"
        style={{
          width: "22px",
          height: "116px",
          left: opened ? "4px" : "73px",
          top: "10px",
          background: "linear-gradient(90deg, #8C5D2C 0%, #C68A47 45%, #7A4E24 100%)",
          transform: opened ? "rotate(-1deg)" : "rotate(90deg)",
        }}
      />
      <div
        className="absolute transition-all duration-700 ease-out rounded-full shadow-md"
        style={{
          width: "22px",
          height: "116px",
          right: opened ? "4px" : "73px",
          top: "10px",
          background: "linear-gradient(90deg, #8C5D2C 0%, #C68A47 45%, #7A4E24 100%)",
          transform: opened ? "rotate(1deg)" : "rotate(90deg)",
        }}
      />

      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] text-[#7A5A2F] font-semibold transition-all duration-700"
        style={{ opacity: opened ? 1 : 0, transform: `translate(-50%, ${opened ? "0" : "8px"})` }}
      >
        Pergaminho
      </div>
    </div>
  );
}
