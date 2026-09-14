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

          <div className="relative min-h-52 mt-3 mb-2 flex items-center justify-center">
            <AnimatedScroll
              opened={opened}
              phrase={isLoading || !data ? "Abrindo seu princípio de hoje…" : data.principle.phrase}
            />
          </div>

          <div
            className={`transition-all duration-700 ease-out ${
              opened ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            {!isLoading && data && (
              <div className="flex items-center justify-center gap-2 mt-4">
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnimatedScroll({ opened, phrase }: { opened: boolean; phrase: string }) {
  return (
    <div className="relative w-[310px] h-48 flex items-center justify-center">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-700 ease-out overflow-hidden shadow-lg flex items-center justify-center"
        style={{
          width: opened ? "260px" : "54px",
          height: opened ? "150px" : "22px",
          transform: `translate(-50%, -50%) scale(${opened ? 1 : 0.92})`,
          borderRadius: opened ? "10px" : "12px",
          background: "linear-gradient(180deg, #F7E8BD 0%, #EBCB8B 100%)",
          border: "1px solid #B48A4A",
        }}
      >
        <p
          className="px-9 text-center text-[15px] leading-relaxed font-medium text-[#4E3A23] transition-opacity duration-500"
          style={{ opacity: opened ? 1 : 0 }}
        >
          “{phrase}”
        </p>
      </div>

      <div
        className="absolute transition-all duration-700 ease-out rounded-full shadow-md"
        style={{
          width: "24px",
          height: "166px",
          left: opened ? "10px" : "142px",
          top: "7px",
          background: "linear-gradient(90deg, #8C5D2C 0%, #C68A47 45%, #7A4E24 100%)",
          transform: opened ? "rotate(-1deg)" : "rotate(90deg)",
        }}
      />
      <div
        className="absolute transition-all duration-700 ease-out rounded-full shadow-md"
        style={{
          width: "24px",
          height: "166px",
          right: opened ? "10px" : "142px",
          top: "7px",
          background: "linear-gradient(90deg, #8C5D2C 0%, #C68A47 45%, #7A4E24 100%)",
          transform: opened ? "rotate(1deg)" : "rotate(90deg)",
        }}
      />
    </div>
  );
}
