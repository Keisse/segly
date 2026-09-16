import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  usePipelineStages,
  useUpdateLeadStage,
  type PipelineStage,
} from "@/hooks/usePipelines";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
  pipelineId: string | null;
  stageId: string | null;
  className?: string;
}

export function StagePicker({ leadId, pipelineId, stageId, className }: Props) {
  const { data: stages = [] } = usePipelineStages(pipelineId);
  const updateStage = useUpdateLeadStage();
  const [open, setOpen] = useState(false);
  const [lossDialog, setLossDialog] = useState<{ stage: PipelineStage } | null>(null);
  const [reason, setReason] = useState("");

  const current = stages.find((s) => s.id === stageId) || null;

  const apply = async (stage: PipelineStage) => {
    if (!pipelineId) return;
    await updateStage.mutateAsync({ leadId, stageId: stage.id, pipelineId });
  };

  const pick = (stage: PipelineStage) => {
    setOpen(false);
    if (stage.is_lost) {
      setLossDialog({ stage });
      setReason("");
      return;
    }
    apply(stage);
  };

  const confirmLoss = async () => {
    if (!lossDialog) return;
    await apply(lossDialog.stage);
    // append reason to historico
    try {
      const { data: lead } = await supabase
        .from("leads")
        .select("historico")
        .eq("id", leadId)
        .maybeSingle();
      const hist = (lead?.historico as Json[]) || [];
      const item = {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        tipo: "sistema",
        descricao: `Motivo da perda: ${reason || "não informado"}`,
        resultado: "loss_reason",
      };
      await supabase
        .from("leads")
        .update({ historico: [...hist, item] as unknown as Json })
        .eq("id", leadId);
      toast.success("Motivo registrado no histórico.");
    } catch {
      /* silent */
    }
    setLossDialog(null);
  };

  if (!pipelineId) {
    return (
      <span className="text-xs text-muted-foreground italic">Sem pipeline</span>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "px-2 py-1 rounded text-xs font-medium min-w-[140px] text-left inline-flex items-center gap-1.5 border-0",
              className
            )}
            style={
              current?.cor
                ? { background: `${current.cor}22`, color: current.cor }
                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
            }
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: current?.cor ?? "#64748b" }}
            />
            <span className="truncate">{current?.nome ?? "Selecionar etapa"}</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-auto" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-1 w-[220px]" align="start">
          {stages.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Sem etapas.</p>
          ) : (
            stages.map((s) => {
              const active = s.id === stageId;
              return (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 hover:bg-muted/60 transition-colors",
                    active && "bg-muted/40 font-medium"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: s.cor ?? "#64748b" }}
                  />
                  <span className="truncate">{s.nome}</span>
                </button>
              );
            })
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={!!lossDialog} onOpenChange={(o) => !o && setLossDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da perda</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por que esta vida foi perdida?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmLoss}>Registrar perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
