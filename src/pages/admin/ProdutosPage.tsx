import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  insurer_id: string | null;
  insurer_name: string | null;
  contract_type: string | null;
  admin_commission_pct: number | string;
  broker_commission_pct: number | string;
  active: boolean;
  notes: string | null;
};

type InsurerRow = {
  id: string;
  organization_id: string;
  name: string;
  active: boolean;
  notes: string | null;
  deleted_at: string | null;
};

const categories = ["Saúde", "Odonto", "Vida", "Viagem", "Consórcio", "Auto", "Imobiliário", "Outro"];
const contractTypes = ["Adesão", "PME", "Individual", "Familiar", "Empresarial", "Outro"];
const emptyForm = { name: "", category: "Saúde", insurer_id: "", contract_type: "", admin_commission_pct: "0", broker_commission_pct: "50", notes: "" };

export default function ProdutosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [insurerOpen, setInsurerOpen] = useState(false);
  const [insurerActionOpen, setInsurerActionOpen] = useState(false);
  const [selectedInsurer, setSelectedInsurer] = useState<InsurerRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [insurerName, setInsurerName] = useState("");
  const [insurerNotes, setInsurerNotes] = useState("");

  const invalidateInsurerData = () => {
    qc.invalidateQueries({ queryKey: ["insurers-admin"] });
    qc.invalidateQueries({ queryKey: ["products-admin"] });
    qc.invalidateQueries({ queryKey: ["active-products-for-sale"] });
    qc.invalidateQueries({ queryKey: ["proposal-products"] });
  };

  const closeInsurerAction = () => {
    setInsurerActionOpen(false);
    setSelectedInsurer(null);
    setDeleteConfirmation("");
  };

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

  const { data: insurers = [] } = useQuery({
    queryKey: ["insurers-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurers" as never)
        .select("id,organization_id,name,active,notes,deleted_at")
        .is("deleted_at", null)
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as InsurerRow[];
    },
  });

  const activeCount = useMemo(() => products.filter((p) => p.active).length, [products]);
  const activeInsurers = useMemo(() => insurers.filter((i) => i.active), [insurers]);

  const resetAndOpen = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const edit = (product: ProductRow) => {
    setEditing(product);
    setForm({ name: product.name, category: product.category, insurer_id: product.insurer_id || "", contract_type: product.contract_type || "", admin_commission_pct: String(product.admin_commission_pct ?? 0), broker_commission_pct: String(product.broker_commission_pct ?? 50), notes: product.notes || "" });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Organização não encontrada.");
      if (!form.name.trim()) throw new Error("Informe o nome do produto.");
      if (!form.insurer_id) throw new Error("Selecione a seguradora/operadora.");
      const adminPct = Number(form.admin_commission_pct.replace(",", "."));
      const brokerPct = Number(form.broker_commission_pct.replace(",", "."));
      if (!Number.isFinite(adminPct) || adminPct < 0 || adminPct > 100) throw new Error("Comissão da administradora deve estar entre 0 e 100%.");
      if (!Number.isFinite(brokerPct) || brokerPct < 0 || brokerPct > 100) throw new Error("Participação do corretor deve estar entre 0 e 100%.");
      const payload = { organization_id: profile.organization_id, name: form.name.trim(), category: form.category, insurer_id: form.insurer_id, contract_type: form.contract_type || null, admin_commission_pct: adminPct, broker_commission_pct: brokerPct, notes: form.notes.trim() || null, updated_at: new Date().toISOString() };
      if (editing) {
        const { error } = await supabase.from("products" as never).update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-admin"] }); qc.invalidateQueries({ queryKey: ["active-products-for-sale"] }); setOpen(false); toast.success(editing ? "Produto atualizado." : "Produto cadastrado."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveInsurer = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("Organização não encontrada.");
      if (!insurerName.trim()) throw new Error("Informe o nome da seguradora/operadora.");
      const { error } = await supabase.from("insurers" as never).insert({ organization_id: profile.organization_id, name: insurerName.trim(), notes: insurerNotes.trim() || null } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["insurers-admin"] }); setInsurerName(""); setInsurerNotes(""); setInsurerOpen(false); toast.success("Seguradora/operadora cadastrada."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const pauseInsurer = useMutation({
    mutationFn: async (insurer: InsurerRow) => {
      const { error } = await supabase.from("insurers" as never).update({ active: false, updated_at: new Date().toISOString() } as never).eq("id", insurer.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateInsurerData(); closeInsurerAction(); toast.success("Operadora pausada. Os produtos vinculados também foram pausados."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const reactivateInsurer = useMutation({
    mutationFn: async (insurer: InsurerRow) => {
      const { error } = await supabase.from("insurers" as never).update({ active: true, updated_at: new Date().toISOString() } as never).eq("id", insurer.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateInsurerData(); toast.success("Operadora reativada. Reative os produtos desejados separadamente."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteInsurer = useMutation({
    mutationFn: async (insurer: InsurerRow) => {
      if (!user) throw new Error("Usuário não encontrado.");
      if (deleteConfirmation !== "Excluir") throw new Error("Digite Excluir para confirmar.");
      const now = new Date().toISOString();
      const { error } = await supabase.from("insurers" as never).update({ active: false, deleted_at: now, deleted_by: user.id, updated_at: now } as never).eq("id", insurer.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateInsurerData(); closeInsurerAction(); toast.success("Operadora excluída. O histórico foi preservado."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const openInsurerAction = (insurer: InsurerRow) => {
    if (!insurer.active) {
      reactivateInsurer.mutate(insurer);
      return;
    }
    setSelectedInsurer(insurer);
    setDeleteConfirmation("");
    setInsurerActionOpen(true);
  };

  const toggle = useMutation({
    mutationFn: async (product: ProductRow) => {
      const { error } = await supabase.from("products" as never).update({ active: !product.active, updated_at: new Date().toISOString() } as never).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products-admin"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products" as never).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-admin"] }); toast.success("Produto excluído."); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Produtos e percentuais</h1><p className="text-sm text-muted-foreground">Cadastre operadoras, produtos e as regras percentuais usadas nas vendas.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setInsurerOpen(true)}><Building2 className="h-4 w-4 mr-2" />Cadastrar operadora</Button><Button onClick={resetAndOpen}><Plus className="h-4 w-4 mr-2" />Cadastrar produto</Button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Operadoras ativas</p><p className="text-2xl font-bold mt-1">{activeInsurers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos ativos</p><p className="text-2xl font-bold mt-1">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Regra padrão</p><p className="text-sm font-semibold mt-1">Corretor: 50% da comissão da administradora</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seguradoras / operadoras</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {insurers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma operadora cadastrada.</p> : insurers.map((insurer) => (
            <div key={insurer.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">{insurer.name}</span>
              <Badge variant={insurer.active ? "secondary" : "outline"}>{insurer.active ? "Ativa" : "Inativa"}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" title={insurer.active ? "Pausar ou excluir" : "Reativar operadora"} onClick={() => openInsurerAction(insurer)} disabled={reactivateInsurer.isPending}>
                <Power className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">Produtos</CardTitle></CardHeader><CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando produtos...</p> : products.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</div> : products.map((product) => (
          <div key={product.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto] lg:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold break-words">{product.name}</p><Badge variant={product.active ? "secondary" : "outline"}>{product.active ? "Ativo" : "Inativo"}</Badge></div><p className="text-xs text-muted-foreground mt-1">{product.category}{product.insurer_name ? ` · ${product.insurer_name}` : ""}{product.contract_type ? ` · ${product.contract_type}` : ""}</p></div>
            <div><p className="text-xs text-muted-foreground">Administradora</p><p className="font-semibold">{Number(product.admin_commission_pct).toLocaleString("pt-BR")}% da venda</p></div>
            <div><p className="text-xs text-muted-foreground">Corretor</p><p className="font-semibold">{Number(product.broker_commission_pct).toLocaleString("pt-BR")}% da comissão</p></div>
            <div><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm truncate">{product.notes || "—"}</p></div>
            <div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" onClick={() => edit(product)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => toggle.mutate(product)}><Power className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm(`Excluir o produto ${product.name}?`)) remove.mutate(product.id); }}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
      </CardContent></Card>

      <Dialog open={insurerActionOpen} onOpenChange={(next) => { if (!next) closeInsurerAction(); else setInsurerActionOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>O que deseja fazer com {selectedInsurer?.name}?</DialogTitle>
            <DialogDescription>Escolha entre pausar temporariamente ou excluir a operadora dos novos cadastros.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border p-4 space-y-3">
              <div><p className="font-semibold">Pausar operadora</p><p className="text-sm text-muted-foreground mt-1">Ela ficará inativa e poderá ser reativada depois. Produtos vinculados também serão pausados.</p></div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => selectedInsurer && pauseInsurer.mutate(selectedInsurer)} disabled={pauseInsurer.isPending || deleteInsurer.isPending}><Power className="h-4 w-4 mr-2" />Pausar operadora</Button>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div><p className="font-semibold text-destructive">Excluir operadora</p><p className="text-sm text-muted-foreground mt-1">Ela será removida dos novos cadastros. Produtos vinculados serão pausados, mas propostas, vendas, comissões e auditoria permanecerão preservadas.</p></div>
              <div className="space-y-1.5"><Label>Para confirmar, digite <strong>Excluir</strong></Label><Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Excluir" autoComplete="off" /></div>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={() => selectedInsurer && deleteInsurer.mutate(selectedInsurer)} disabled={deleteConfirmation !== "Excluir" || deleteInsurer.isPending || pauseInsurer.isPending}><Trash2 className="h-4 w-4 mr-2" />Excluir operadora</Button>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={closeInsurerAction}>Cancelar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insurerOpen} onOpenChange={setInsurerOpen}><DialogContent><DialogHeader><DialogTitle>Cadastrar seguradora / operadora</DialogTitle><DialogDescription>Depois do cadastro, ela poderá ser vinculada aos produtos.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label>Nome *</Label><Input value={insurerName} onChange={(e) => setInsurerName(e.target.value)} placeholder="Ex.: Unimed" /></div><div className="space-y-1.5"><Label>Observações</Label><Textarea value={insurerNotes} onChange={(e) => setInsurerNotes(e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setInsurerOpen(false)}>Cancelar</Button><Button onClick={() => saveInsurer.mutate()} disabled={saveInsurer.isPending}>Cadastrar</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Editar produto" : "Cadastrar produto"}</DialogTitle><DialogDescription>O produto não possui preço fixo. O valor usado na comissão vem da negociação do lead.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Nome do produto *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Categoria *</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Tipo de contratação</Label><Select value={form.contract_type || "none"} onValueChange={(v) => setForm({ ...form, contract_type: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não informado</SelectItem>{contractTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Seguradora / operadora *</Label><Select value={form.insurer_id} onValueChange={(v) => setForm({ ...form, insurer_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{activeInsurers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Administradora recebe (%) *</Label><Input inputMode="decimal" value={form.admin_commission_pct} onChange={(e) => setForm({ ...form, admin_commission_pct: e.target.value })} /><p className="text-xs text-muted-foreground">Sobre o valor final da venda.</p></div>
        <div className="space-y-1.5"><Label>Corretor recebe da comissão (%) *</Label><Input inputMode="decimal" value={form.broker_commission_pct} onChange={(e) => setForm({ ...form, broker_commission_pct: e.target.value })} /><p className="text-xs text-muted-foreground">Sobre a parte recebida pela administradora.</p></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Salvar alterações" : "Cadastrar produto"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}