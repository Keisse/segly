import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, CheckCircle2, ExternalLink, FileText, Link2, Paperclip, Pencil, Plus, Send, Upload, Wrench, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ProposalStatus = "draft" | "sent" | "accepted" | "implementation" | "implemented" | "lost";
type ProposalRow = {
  id: string;
  lead_id: string;
  product_id: string;
  owner_id: string;
  status: ProposalStatus;
  negotiated_value: number | string;
  boleto_due_date: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  implementation_at: string | null;
  implemented_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  document_url: string | null;
  document_path: string | null;
  document_name: string | null;
  created_at: string;
  products?: { name: string; category: string; insurer_name: string | null; contract_type: string | null } | null;
};

type ProductRow = { id: string; name: string; category: string; insurer_name: string | null; contract_type: string | null };

type Props = {
  leadId: string;
  ownerId: string | null;
  currentProductId?: string | null;
  customFields?: Record<string, unknown> | null;
};

const statusMeta: Record<ProposalStatus, { label: string; icon: typeof FileText }> = {
  draft: { label: "Rascunho", icon: FileText },
  sent: { label: "Enviada", icon: Send },
  accepted: { label: "Aceita", icon: CheckCircle2 },
  implementation: { label: "Em implantação", icon: Wrench },
  implemented: { label: "Implantada", icon: BadgeCheck },
  lost: { label: "Perdida", icon: XCircle },
};

const money = (value: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";

function boletoStatus(dueDate: string | null, paid: boolean) {
  if (paid) return { label: "Pago", variant: "default" as const };
  if (!dueDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today) return { label: "Vencido", variant: "destructive" as const };
  return { label: "A vencer", variant: "outline" as const };
}

function validHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function LeadProposalsPanel({ leadId, ownerId, currentProductId, customFields }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalRow | null>(null);
  const [productId, setProductId] = useState(currentProductId || "");
  const [value, setValue] = useState(String(customFields?.valor_final_fechado ?? customFields?.valor_fechado ?? ""));
  const [boletoDueDate, setBoletoDueDate] = useState(String(customFields?.data_boleto ?? ""));
  const [status, setStatus] = useState<ProposalStatus>("draft");
  const [lostReason, setLostReason] = useState("");
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["proposal-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
      if (error) throw error;
      return data as { organization_id: string };
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["proposal-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products" as never).select("id,name,category,insurer_name,contract_type").eq("active", true).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["lead-proposals", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals" as never)
        .select("id,lead_id,product_id,owner_id,status,negotiated_value,boleto_due_date,sent_at,accepted_at,implementation_at,implemented_at,lost_reason,notes,document_url,document_path,document_name,created_at,products(name,category,insurer_name,contract_type)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProposalRow[];
    },
  });

  const activeProposal = useMemo(() => proposals.find((p) => !["implemented", "lost"].includes(p.status)) ?? null, [proposals]);
  const leadBoletoPaid = String(customFields?.boleto_pago ?? "").toLocaleLowerCase("pt-BR") === "sim";

  const reset = () => {
    setEditing(null);
    setProductId(currentProductId || "");
    setValue(String(customFields?.valor_final_fechado ?? customFields?.valor_fechado ?? ""));
    setBoletoDueDate(String(customFields?.data_boleto ?? ""));
    setStatus("draft");
    setLostReason("");
    setNotes("");
    setDocumentUrl("");
    setDocumentFile(null);
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (proposal: ProposalRow) => {
    setEditing(proposal);
    setProductId(proposal.product_id);
    setValue(String(proposal.negotiated_value));
    setBoletoDueDate(proposal.boleto_due_date || "");
    setStatus(proposal.status);
    setLostReason(proposal.lost_reason || "");
    setNotes(proposal.notes || "");
    setDocumentUrl(proposal.document_url || "");
    setDocumentFile(null);
    setOpen(true);
  };

  const openDocument = async (proposal: ProposalRow) => {
    if (proposal.document_url) {
      window.open(proposal.document_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!proposal.document_path) return;
    const { data, error } = await supabase.storage.from("proposal-files").createSignedUrl(proposal.document_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir o arquivo da proposta.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !profile?.organization_id || !ownerId) throw new Error("Responsável ou organização não encontrados.");
      if (!productId) throw new Error("Selecione o produto.");
      if (!validHttpUrl(documentUrl)) throw new Error("Informe uma URL válida, iniciando com http:// ou https://.");

      const negotiated = Number(String(value).replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(negotiated) || negotiated <= 0) throw new Error("Informe um valor negociado válido.");
      if (status === "lost" && !lostReason.trim()) throw new Error("Informe o motivo da perda.");

      let uploadedPath = editing?.document_path || null;
      let uploadedName = editing?.document_name || null;
      if (documentFile) {
        const filePath = `${profile.organization_id}/${leadId}/${crypto.randomUUID()}-${safeFileName(documentFile.name)}`;
        const { error: uploadError } = await supabase.storage.from("proposal-files").upload(filePath, documentFile, { upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = filePath;
        uploadedName = documentFile.name;
      }

      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        organization_id: profile.organization_id,
        lead_id: leadId,
        product_id: productId,
        owner_id: ownerId,
        created_by: user.id,
        status,
        negotiated_value: negotiated,
        boleto_due_date: boletoDueDate || null,
        lost_reason: status === "lost" ? lostReason.trim() : null,
        notes: notes.trim() || null,
        document_url: documentUrl.trim() || null,
        document_path: uploadedPath,
        document_name: uploadedName,
      };
      if (status === "sent") payload.sent_at = editing?.sent_at || now;
      if (status === "accepted") payload.accepted_at = editing?.accepted_at || now;
      if (status === "implementation") payload.implementation_at = editing?.implementation_at || now;
      if (status === "implemented") payload.implemented_at = editing?.implemented_at || now;

      if (editing) {
        const { error } = await supabase.from("proposals" as never).update(payload as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposals" as never).insert(payload as never);
        if (error) throw error;
      }

      if (["accepted", "implementation", "implemented"].includes(status)) {
        const merged = { ...(customFields || {}), valor_final_fechado: negotiated, ...(boletoDueDate ? { data_boleto: boletoDueDate } : {}) };
        const { error } = await supabase.from("leads").update({ product_id: productId, custom_fields: merged } as never).eq("id", leadId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-proposals", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["pipeline-leads"] });
      qc.invalidateQueries({ queryKey: ["commission-ledger"] });
      qc.invalidateQueries({ queryKey: ["audit-events"] });
      setOpen(false);
      toast.success(editing ? "Proposta atualizada." : "Proposta criada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Propostas comerciais</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Produto, operadora, valor negociado e arquivo ou URL da proposta.</p>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />Nova proposta</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando propostas...</p> : proposals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma proposta cadastrada para esta vida.</div>
        ) : proposals.map((proposal) => {
          const Icon = statusMeta[proposal.status].icon;
          const financialStatus = boletoStatus(proposal.boleto_due_date, activeProposal?.id === proposal.id && leadBoletoPaid);
          return (
            <div key={proposal.id} className="rounded-xl border p-4 grid gap-3 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{proposal.products?.name || "Produto"}</p>
                  <Badge variant={proposal.status === "lost" ? "destructive" : proposal.status === "implemented" ? "default" : "secondary"}><Icon className="h-3 w-3 mr-1" />{statusMeta[proposal.status].label}</Badge>
                  {activeProposal?.id === proposal.id && <Badge variant="outline">Ativa</Badge>}
                  {financialStatus && <Badge variant={financialStatus.variant}>{financialStatus.label}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{proposal.products?.insurer_name || "Operadora não informada"}{proposal.products?.contract_type ? ` · ${proposal.products.contract_type}` : ""}</p>
                {(proposal.document_url || proposal.document_path) && <Button variant="link" size="sm" className="h-auto px-0 pt-2 text-xs" onClick={() => openDocument(proposal)}><ExternalLink className="h-3.5 w-3.5 mr-1" />{proposal.document_name || "Abrir proposta"}</Button>}
              </div>
              <div><p className="text-xs text-muted-foreground">Valor negociado</p><p className="font-semibold">{money(proposal.negotiated_value)}</p></div>
              <div><p className="text-xs text-muted-foreground">Vencimento do boleto</p><p className="text-sm font-medium inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{dateBr(proposal.boleto_due_date)}</p></div>
              <div><p className="text-xs text-muted-foreground">Criada em</p><p className="text-sm">{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</p></div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(proposal)} title="Editar proposta"><Pencil className="h-4 w-4" /></Button>
              {proposal.status === "lost" && proposal.lost_reason && <p className="text-xs text-muted-foreground lg:col-span-5">Motivo da perda: {proposal.lost_reason}</p>}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proposta" : "Nova proposta"}</DialogTitle>
            <DialogDescription>Registre a condição comercial. A proposta pode ser anexada como arquivo ou informada por URL.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Produto *</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.insurer_name || product.category}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Valor negociado *</Label><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Status *</Label><Select value={status} onValueChange={(v) => setStatus(v as ProposalStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(statusMeta) as ProposalStatus[]).map((item) => <SelectItem key={item} value={item}>{statusMeta[item].label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Vencimento do boleto</Label><Input type="date" value={boletoDueDate} onChange={(e) => setBoletoDueDate(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />URL da proposta</Label><Input type="url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." /><p className="text-xs text-muted-foreground">Opcional. Pode usar URL, arquivo ou ambos.</p></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" />Arquivo da proposta</Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />{(documentFile || editing?.document_name) && <p className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" />{documentFile?.name || editing?.document_name}</p>}<p className="text-xs text-muted-foreground">Até 20 MB.</p></div>
            {status === "lost" && <div className="space-y-1.5 sm:col-span-2"><Label>Motivo da perda *</Label><Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} /></div>}
            <div className="space-y-1.5 sm:col-span-2"><Label>Observações</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Criar proposta"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
