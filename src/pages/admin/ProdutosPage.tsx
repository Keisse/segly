import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  insurer_name: string | null;
  contract_type: string | null;
  admin_commission_pct: number | string;
  broker_commission_pct: number | string;
  active: boolean;
  notes: string | null;
};

const categories = ["Saúde", "Odonto", "Vida", "Viagem", "Consórcio", "Auto", "Imobiliário", "Outro"];
const contractTypes = ["Adesão", "PME", "Individual", "Familiar", "Empresarial", "Outro"];

const emptyForm = {
  name: "",
  category: "Saúde",
  insurer_name: "",
  contract_type: "",
  admin_commission_pct: "0",
  broker_commission_pct: "50",
  notes: "",
};

export default function ProdutosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: profile } = useQuery({
    queryKey: ["products-my-org", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (error) throw error;
      return data as { organization_id: string };
    },
    enabled: !!user,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products" as never).select("*").order("active", { ascending: false }).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const activeCount = useMemo(() => products.filter((p) => p.active).length, [products]);

  const resetAndOpen = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const edit = (product: ProductRow) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      insurer_name: product.insurer_name || "",
      contract_type: product.contract_type || "",
      admin_commission_pct: String(product.admin_commission_pct ?? 0),
      broker_commission_pct: String(product.broker_commission_pct ?? 50),
      notes: product.notes || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Organização não encontrada.");
      if (!form.name.trim()) throw new Error("Informe o nome do produto.");
      const adminPct = Number(form.admin_commission_pct.replace(",", "."));
      const brokerPct = Number(form.broker_commission_pct.replace(",", "."));
      if (!Number.isFinite(adminPct) || adminPct < 0 || adminPct > 100) throw new Error("Comissão da administradora deve estar entre 0 e 100%.");
      if (!Number.isFinite(brokerPct) || brokerPct < 0 || brokerPct > 100) throw new Error("Participação do corretor deve estar entre 0 e 100%.");

      const payload = {
        organization_id: profile.organization_id,
        name: form.name.trim(),
        category: form.category,
        insurer_name: form.insurer_name.trim() || null,
        contract_type: form.contract_type || null,
        admin_commission_pct: adminPct,
        broker_commission_pct: brokerPct,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase.from("products" as never).update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-admin"] });
      qc.invalidateQueries({ queryKey: ["audit-events"] });
      setOpen(false);
      toast.success(editing ? "Produto atualizado." : "Produto cadastrado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async (product: ProductRow) => {
      const { error } = await supabase.from("products" as never).update({ active: !product.active, updated_at: new Date().toISOString() } as never).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-admin"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-admin"] }); toast.success("Produto excluído."); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Produtos e Comissões</h1>
          <p className="text-sm text-muted-foreground">O produto não tem preço fixo. O valor vem da negociação; aqui ficam apenas as regras de comissão.</p>
        </div>
        <Button onClick={resetAndOpen}><Plus className="h-4 w-4 mr-2" />Cadastrar produto</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos cadastrados</p><p className="text-2xl font-bold mt-1">{products.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos ativos</p><p className="text-2xl font-bold mt-1">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Regra</p><p className="text-sm font-semibold mt-1">Corretor recebe uma parte da comissão da administradora</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando produtos...</p> : products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</div>
          ) : products.map((product) => (
            <div key={product.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold break-words">{product.name}</p><Badge variant={product.active ? "secondary" : "outline"}>{product.active ? "Ativo" : "Inativo"}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">{product.category}{product.insurer_name ? ` · ${product.insurer_name}` : ""}{product.contract_type ? ` · ${product.contract_type}` : ""}</p>
              </div>
              <div><p className="text-xs text-muted-foreground">Administradora recebe</p><p className="font-semibold">{Number(product.admin_commission_pct).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}% da negociação</p></div>
              <div><p className="text-xs text-muted-foreground">Corretor recebe</p><p className="font-semibold">{Number(product.broker_commission_pct).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}% da comissão da administradora</p></div>
              <div><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm truncate">{product.notes || "—"}</p></div>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => edit(product)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => toggle.mutate(product)} title={product.active ? "Desativar" : "Ativar"}><Power className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Excluir o produto ${product.name}?`)) remove.mutate(product.id); }} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Cadastrar produto"}</DialogTitle><DialogDescription>Informe as regras percentuais. O preço da venda será informado na negociação do lead.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Nome do produto *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Plano Saúde Empresarial" /></div>
            <div className="space-y-1.5"><Label>Categoria *</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Tipo de contratação</Label><Select value={form.contract_type || "none"} onValueChange={(v) => setForm({ ...form, contract_type: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Não informado</SelectItem>{contractTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Seguradora / operadora</Label><Input value={form.insurer_name} onChange={(e) => setForm({ ...form, insurer_name: e.target.value })} placeholder="Opcional" /></div>
            <div className="space-y-1.5"><Label>Administradora recebe (%) *</Label><Input inputMode="decimal" value={form.admin_commission_pct} onChange={(e) => setForm({ ...form, admin_commission_pct: e.target.value })} /><p className="text-xs text-muted-foreground">Percentual aplicado sobre o valor fechado da negociação.</p></div>
            <div className="space-y-1.5"><Label>Corretor recebe da comissão (%) *</Label><Input inputMode="decimal" value={form.broker_commission_pct} onChange={(e) => setForm({ ...form, broker_commission_pct: e.target.value })} /><p className="text-xs text-muted-foreground">Percentual aplicado sobre o que a administradora recebeu. Padrão: 50%.</p></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opcional" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Salvar alterações" : "Cadastrar produto"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
