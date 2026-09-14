import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, CheckCircle2, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useMyRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type CommissionRow = {
  id: string;
  user_id: string;
  lead_id: string | null;
  product_id: string | null;
  amount: number | string;
  commission_base_amount: number | string | null;
  admin_commission_pct: number | string | null;
  broker_commission_pct: number | string | null;
  admin_amount: number | string | null;
  boleto_paid_at: string | null;
  reference_date: string;
  status: string;
  description: string | null;
};
type ProfileRow = { id: string; display_name: string | null };
type ProductRow = { id: string; name: string; insurer_name: string | null };
type LeadRow = { id: string; nome: string; empresa: string | null };

const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";

export default function ComissoesPage() {
  const { data: role } = useMyRole();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const isAdmin = role === "admin";

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["commission-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_entries" as never).select("*").order("reference_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommissionRow[];
    },
  });

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const productIds = [...new Set(entries.map((e) => e.product_id).filter(Boolean))] as string[];
  const leadIds = [...new Set(entries.map((e) => e.lead_id).filter(Boolean))] as string[];

  const { data: profiles = [] } = useQuery({
    queryKey: ["commission-ledger-profiles", userIds.join(",")],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data, error } = await supabase.from("profiles").select("id,display_name").in("id", userIds);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    }, enabled: userIds.length > 0,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["commission-ledger-products", productIds.join(",")],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data, error } = await supabase.from("products" as never).select("id,name,insurer_name").in("id", productIds);
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    }, enabled: productIds.length > 0,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["commission-ledger-leads", leadIds.join(",")],
    queryFn: async () => {
      if (!leadIds.length) return [];
      const { data, error } = await supabase.from("leads").select("id,nome,empresa").in("id", leadIds);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    }, enabled: leadIds.length > 0,
  });

  const filtered = useMemo(() => status === "all" ? entries : entries.filter((e) => e.status === status), [entries, status]);
  const earned = entries.filter((e) => e.status === "earned");
  const adminGross = earned.reduce((sum, e) => sum + Number(e.admin_amount || 0), 0);
  const brokerDue = earned.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const adminNet = adminGross - brokerDue;

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_entries" as never).update({ status: "paid", updated_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-ledger"] }); qc.invalidateQueries({ queryKey: ["productivity-next-commissions"] }); qc.invalidateQueries({ queryKey: ["productivity-team-next-commissions"] }); toast.success("Comissão marcada como paga."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.display_name || "Corretor";
  const productName = (id: string | null) => products.find((p) => p.id === id);
  const leadName = (id: string | null) => leads.find((l) => l.id === id);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Comissões</h1><p className="text-sm text-muted-foreground">Acompanhe a receita da administradora e o valor devido aos corretores a partir de boletos pagos.</p></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-[210px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="earned">Liberadas</SelectItem><SelectItem value="paid">Pagas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Administradora recebe</p><p className="text-2xl font-bold mt-1">{money(adminGross)}</p><p className="text-xs text-muted-foreground mt-1">Comissão bruta das vendas liberadas</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Corretores recebem</p><p className="text-2xl font-bold mt-1">{money(brokerDue)}</p><p className="text-xs text-muted-foreground mt-1">Parte dos liderados sobre a comissão</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Administradora líquida</p><p className="text-2xl font-bold mt-1">{money(adminNet)}</p><p className="text-xs text-muted-foreground mt-1">Bruto menos repasse aos corretores</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CircleDollarSign className="h-4 w-4" />Histórico de comissões</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando comissões...</p> : filtered.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma comissão encontrada.</div> : filtered.map((entry) => {
            const product = productName(entry.product_id);
            const lead = leadName(entry.lead_id);
            return <div key={entry.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1.2fr_1fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div><p className="font-semibold">{profileName(entry.user_id)}</p><p className="text-xs text-muted-foreground">{lead?.empresa || lead?.nome || "Venda"}</p></div>
              <div><p className="text-xs text-muted-foreground">Produto</p><p className="text-sm font-medium">{product?.name || "—"}</p><p className="text-xs text-muted-foreground">{product?.insurer_name || ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-semibold">{money(entry.commission_base_amount)}</p><p className="text-xs text-muted-foreground">Boleto: {dateBr(entry.boleto_paid_at)}</p></div>
              <div><p className="text-xs text-muted-foreground">Administradora</p><p className="font-semibold">{money(entry.admin_amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.admin_commission_pct || 0).toLocaleString("pt-BR")}% da venda</p></div>
              <div><p className="text-xs text-muted-foreground">Corretor</p><p className="font-semibold text-primary">{money(entry.amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.broker_commission_pct || 0).toLocaleString("pt-BR")}% da comissão</p></div>
              <div className="flex items-center gap-2 lg:justify-end"><Badge variant={entry.status === "earned" ? "secondary" : entry.status === "paid" ? "default" : "outline"}>{entry.status === "earned" ? "Liberada" : entry.status === "paid" ? "Paga" : entry.status}</Badge>{isAdmin && entry.status === "earned" && <Button size="sm" onClick={() => markPaid.mutate(entry.id)} disabled={markPaid.isPending}><CheckCircle2 className="h-4 w-4 mr-1.5" />Pagar</Button>}</div>
            </div>;
          })}
        </CardContent>
      </Card>

      <Card className="border-primary/20"><CardContent className="p-4 flex gap-3"><WalletCards className="h-5 w-5 text-primary shrink-0" /><div><p className="font-medium text-sm">Regra financeira</p><p className="text-xs text-muted-foreground mt-1">A comissão é criada quando a venda está implantada, possui produto vinculado e o boleto foi pago. O pagamento do corretor é previsto para o primeiro dia útil do mês seguinte.</p></div></CardContent></Card>
    </div>
  );
}
