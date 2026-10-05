import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, X } from "lucide-react";
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
    const t = setTimeout(() => setOpened(true), 180);
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
      <DialogContent className="max-w-[520px] p-0 overflow-hidden border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl [&>button]:hidden">
        <div className={`relative rounded-2xl px-7 py-8 sm:px-10 sm:py-10 text-center transition-all duration-500 ease-out ${opened ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-h-[180px] flex items-center justify-center px-2 sm:px-5">
            <p className="max-w-[430px] text-[21px] sm:text-[24px] leading-[1.45] font-medium tracking-[-0.015em] text-foreground">
              {isLoading || !data ? "Abrindo seu princípio de hoje…" : `“${data.principle.phrase}”`}
            </p>
          </div>

          {!isLoading && data && (
            <div className="mt-7 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto text-muted-foreground hover:text-foreground">
                Fechar
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto text-muted-foreground hover:text-foreground">
                Refletir mais
              </Button>
              <Button variant={saved ? "secondary" : "default"} onClick={handleSave} disabled={save.isPending || !data.historyId} className="w-full sm:w-auto gap-2">
                {saved ? <><BookmarkCheck className="h-4 w-4" /> Salvo</> : <><Bookmark className="h-4 w-4" /> Salvar</>}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
