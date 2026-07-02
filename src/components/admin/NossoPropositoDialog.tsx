import { Compass } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NossoPropositoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NossoPropositoDialog({ open, onOpenChange }: NossoPropositoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white text-slate-800 border-0 shadow-2xl rounded-2xl p-0 max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[90vh] px-8 py-10 sm:px-10 sm:py-12">
          <DialogHeader className="items-center text-center space-y-4">
            <div
              className="flex items-center justify-center h-14 w-14 rounded-full mx-auto"
              style={{ backgroundColor: "rgba(47, 177, 132, 0.1)" }}
            >
              <PrayingHandsIcon size={28} strokeWidth={1.75} style={{ color: "#2FB184" }} />
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Mais do que organizar vendas
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-slate-600 text-left">
              O Segly existe para ajudar pessoas e negócios a crescerem com clareza,
              responsabilidade e cuidado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-[15px] leading-relaxed text-slate-600 text-left mt-6">
            <p>
              No Segly, acreditamos que tecnologia deve aproximar pessoas, não reduzi-las
              a números.
            </p>
            <p>
              Por isso, criamos uma plataforma para ajudar consultores e corretoras a
              organizarem oportunidades, cumprirem combinados e acompanharem cada cliente
              com mais atenção.
            </p>
            <p>
              Vender bem não é pressionar. É compreender necessidades, orientar com
              clareza e construir confiança.
            </p>
            <p>
              Quando existe processo, existe mais tempo para ouvir. Quando existe
              organização, menos pessoas ficam sem resposta. Quando existe
              responsabilidade, o crescimento se torna mais sustentável.
            </p>
            <p>
              O Segly é feito para quem quer crescer com consistência, servir melhor e
              construir uma operação comercial da qual possa se orgulhar.
            </p>
          </div>

          <p
            className="mt-8 text-center text-lg sm:text-xl font-semibold"
            style={{
              color: "#1A9A70",
              textShadow: "0 0 22px rgba(47, 177, 132, 0.40)",
            }}
          >
            "Crescer com propósito é servir melhor."
          </p>

          <div className="mt-10 flex justify-center">
            <Button
              onClick={() => onOpenChange(false)}
              className="px-8 h-11 rounded-full text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#2FB184" }}
            >
              Entendi, vamos seguir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
