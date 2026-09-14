import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/phone";
import type { Lead } from "@/types/lead";

const formatCnpj = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

const customLabels: Record<string, string> = {
  cnpj: "CNPJ",
  responsavel_proprietario: "Responsável é proprietário?",
  plano_saude_operadora: "Plano de Saúde / Operadora",
  acomodacao: "Acomodação",
  coparticipacao: "Coparticipação",
  plano_odontologico: "Plano odontológico",
  tipo_plano: "Tipo do plano",
  quantidade_pessoas: "Quantidade de pessoas",
  datas_nascimento: "Datas de nascimento",
  comentarios: "Comentários",
};

export function LeadEditDialog({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", empresa: "", porte_empresa: "", departamento: "", cargo: "" });
  const [custom, setCustom] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      nome: lead.nome || "",
      telefone: lead.telefone || "",
      email: lead.email || "",
      empresa: lead.empresa || "",
      porte_empresa: lead.porte_empresa || "",
      departamento: lead.departamento || "",
      cargo: lead.cargo || "",
    });
    const next: Record<string, string> = {};
    Object.entries(lead.custom_fields || {}).forEach(([key, value]) => { next[key] = value == null ? "" : String(value); });
    setCustom(next);
  }, [open, lead]);

  const save = async () => {
    if (!form.nome.trim() || !form.telefone.trim() || !form.email.trim()) {
      toast.error("Nome, telefone e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const normalizedCustom = Object.fromEntries(Object.entries(custom).map(([key, value]) => [key, value.trim() === "" ? null : value]));
      const { error } = await supabase
        .from("leads")
        .update({ ...form, nome: form.nome.trim(), telefone: form.telefone.trim(), email: form.email.trim(), empresa: form.empresa.trim(), custom_fields: normalizedCustom } as never)
        .eq("id", lead.id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["lead", lead.id] }),
        qc.invalidateQueries({ queryKey: ["leads"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-metrics"] }),
        qc.invalidateQueries({ queryKey: ["leads-by-pipeline"] }),
        qc.invalidateQueries({ queryKey: ["lead-audit-timeline", lead.id] }),
        qc.invalidateQueries({ queryKey: ["audit-events"] }),
      ]);
      toast.success("Lead atualizado com sucesso.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o lead.");
    } finally {
      setSaving(false);
    }
  };

  const orderedCustom = Object.keys(customLabels).filter((key) => key in custom || key === "cnpj");
  const extraCustom = Object.keys(custom).filter((key) => !customLabels[key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar lead</DialogTitle><DialogDescription>As alterações são salvas diretamente no banco e registradas na auditoria.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))} /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Empresa</Label><Input value={form.empresa} onChange={(e) => setForm((p) => ({ ...p, empresa: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Porte</Label><Input value={form.porte_empresa} onChange={(e) => setForm((p) => ({ ...p, porte_empresa: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Departamento</Label><Input value={form.departamento} onChange={(e) => setForm((p) => ({ ...p, departamento: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))} /></div>
        </div>

        {(orderedCustom.length > 0 || extraCustom.length > 0) && <div className="pt-4 border-t space-y-4">
          <div><p className="font-medium">Dados do formulário / etapa</p><p className="text-xs text-muted-foreground">Esses campos permanecem vinculados ao lead.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {orderedCustom.map((key) => {
              const long = key === "datas_nascimento" || key === "comentarios";
              return <div key={key} className={long ? "space-y-2 md:col-span-2" : "space-y-2"}><Label>{customLabels[key]}</Label>{long ? <Textarea rows={3} value={custom[key] || ""} onChange={(e) => setCustom((p) => ({ ...p, [key]: e.target.value }))} /> : <Input value={custom[key] || ""} onChange={(e) => setCustom((p) => ({ ...p, [key]: key === "cnpj" ? formatCnpj(e.target.value) : e.target.value }))} />}</div>;
            })}
            {extraCustom.map((key) => <div key={key} className="space-y-2"><Label>{key.replace(/_/g, " ")}</Label><Input value={custom[key] || ""} onChange={(e) => setCustom((p) => ({ ...p, [key]: e.target.value }))} /></div>)}
          </div>
        </div>}

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar alterações</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
