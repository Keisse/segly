import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  paid_at?: string | null;
};
type ProfileRow = { id: string; display_name: string | null; lider_id: string | null };
type CompensationRow = { user_id: string; base_salary: number | string };
type ProductRow = { id: string; name: string; insurer_name: string | null };
type LeadRow = { id: string; nome: string; empresa: string | null };
type BatchRow = {
  id: string;
  user_id: string;
  reference_date: string;
  salary_amount: number | string;
  commission_amount: number | string;
  total_amount: number | string;
  commission_count: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
};

const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";
const dateTimeBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

function firstBusinessDay(year: number, monthZeroBased: number) {
  const d = new Date(year, monthZeroBased, 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextCycle() {
  const now = new Date();
  return firstBusinessDay(now.getFullYear(), now.getMonth() + 1);
}

export default function ComissoesPage() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [cycle, setCycle] = useState(nextCycle());
  const isAdmin = role === "admin";

  const { data: people = [] } = useQuery({
    queryKey: ["commission-people", user?.id, role],
    queryFn: async () => {
      if (!user || !role) return [];
      let q = supabase.from("profiles").select("id,display_name,lider_id").eq("is_active", true).order("display_name");
      if (role === "lider") q = q.eq("lider_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
    enabled: !!user && !!role,
  });

  const visibleIds = useMemo(() => people.map((p) => p.id), [people]);

  const { data: compensations = [] } = useQuery({
    queryKey: ["commission-compensations", visibleIds.join(",")],
    queryFn: async () => {
      if (!visibleIds.length) return [];
      const { data, error } = await supabase.from("compensation_profiles" as never).select("user_id,base_salary").in("user_id", visibleIds);
      if (error) throw error;
      return (data ?? []) as unknown as CompensationRow[];
    }, enabled: visibleIds.length > 0,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["commission-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_entries" as never).select("*").order("reference_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommissionRow[];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["commission-payment-batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_payment_batches" as never).select("*").order("reference_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BatchRow[];
    },
  });

  const productIds = [...new Set(entries.map((e) => e.product_id).filter(Boolean))] as string[];
  const leadIds = [...new Set(entries.map((e) => e.lead_id).filter(Boolean))] as string[];

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

  const cycleOptions = useMemo(() => {
    const values = new Set<string>([nextCycle(), cycle]);
    entries.forEach((e) => values.add(e.reference_date));
    batches.forEach((b) => values.add(b.reference_date));
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [entries, batches, cycle]);

  const cycleEntries = useMemo(() => entries.filter((e) => e.reference_date === cycle && e.status !== "cancelled"), [entries, cycle]);
  const cycleBatches = useMemo(() => batches.filter((b) => b.reference_date === cycle && b.status === "paid"), [batches, cycle]);

  const teamForecast = useMemo(() => people.map((person) => {
    const salary = Number(compensations.find((c) => c.user_id === person.id)?.base_salary || 0);
    const personEntries = cycleEntries.filter((e) => e.user_id === person.id);
    const earnedCommission = personEntries.filter((e) => e.status === "earned").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const paidCommission = personEntries.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const batch = cycleBatches.find((b) => b.user_id === person.id);
    return {
      ...person,
      salary: batch ? Number(batch.salary_amount || 0) : salary,
      commission: batch ? Number(batch.commission_amount || 0) : earnedCommission + paidCommission,
      earnedCommission,
      saleCount: personEntries.filter((e) => ["earned", "paid"].includes(e.status)).length,
      total: batch ? Number(batch.total_amount || 0) : salary + earnedCommission + paidCommission,
      paid: !!batch,
      paidAt: batch?.paid_at || null,
    };
  }).filter((p) => p.salary > 0 || p.commission > 0 || p.saleCount > 0), [people, compensations, cycleEntries, cycleBatches]);

  const earned = cycleEntries.filter((e) => e.status === "earned");
  const adminGross = cycleEntries.filter((e) => ["earned", "paid"].includes(e.status)).reduce((sum, e) => sum + Number(e.admin_amount || 0), 0);
  const brokerDue = earned.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const adminNet = cycleEntries.filter((e) => ["earned", "paid"].includes(e.status)).reduce((sum, e) => sum + Number(e.admin_amount || 0) - Number(e.amount || 0), 0);
  const payrollForecast = teamForecast.reduce((sum, p) => sum + p.total, 0);

  const filtered = useMemo(() => {
    const byCycle = entries.filter((e) => e.reference_date === cycle);
    return status === "all" ? byCycle : byCycle.filter((e) => e.status === status);
  }, [entries, status, cycle]);

  const settle = useMutation({
    mutationFn: async (person: ProfileRow) => {
      const confirmation = confirm(`Confirmar o pagamento de ${person.display_name || "colaborador"} referente a ${dateBr(cycle)}? Esta ação marcará as comissões liberadas deste ciclo como pagas.`);
      if (!confirmation) return null;
      const { data, error } = await supabase.rpc("settle_commission_payment" as never, { p_user_id: person.id, p_reference_date: cycle, p_notes: null } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      qc.invalidateQueries({ queryKey: ["commission-ledger"] });
      qc.invalidateQueries({ queryKey: ["commission-payment-batches"] });
      qc.invalidateQueries({ queryKey: ["productivity-next-commissions"] });
      qc.invalidateQueries({ queryKey: ["productivity-team-next-commissions"] });
      toast.success("Pagamento confirmado e fechamento atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const profileName = (id: string) => people.find((p) => p.id === id)?.display_name || "Corretor";
  const productName = (id: string | null) => products.find((p) => p.id === id);
  const leadName = (id: string | null) => leads.find((l) => l.id === id);
  const cycleInFuture = cycle > new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-6 min-w-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Comissões e Fechamento</h1><p className="text-sm text-muted-foreground">Controle a comissão da administradora, o repasse aos corretores e o fechamento do próximo pagamento.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={cycle} onValueChange={setCycle}><SelectTrigger className="sm:w-[220px]"><SelectValue /></SelectTrigger><SelectContent>{cycleOptions.map((item) => <SelectItem key={item} value={item}>Pagamento {dateBr(item)}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="earned">Liberadas</SelectItem><SelectItem value="paid">Pagas</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Administradora bruta</p><p className="text-2xl font-bold mt-1">{money(adminGross)}</p><p className="text-xs text-muted-foreground mt-1">Receita de comissão do ciclo</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Repasse ainda a pagar</p><p className="text-2xl font-bold mt-1">{money(brokerDue)}</p><p className="text-xs text-muted-foreground mt-1">Comissões liberadas dos corretores</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Administradora líquida</p><p className="text-2xl font-bold mt-1">{money(adminNet)}</p><p className="text-xs text-muted-foreground mt-1">Bruto menos participação dos corretores</p></CardContent></Card>
        <Card className="border-primary/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Folha prevista</p><p className="text-2xl font-bold mt-1 text-primary">{money(payrollForecast)}</p><p className="text-xs text-muted-foreground mt-1">Salários + comissões deste ciclo</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><WalletCards className="h-4 w-4" />Fechamento por colaborador · {dateBr(cycle)}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {teamForecast.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum pagamento previsto para este ciclo.</div> : teamForecast.map((person) => (
            <div key={person.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{person.display_name || "Usuário"}</p><Badge variant={person.paid ? "default" : "secondary"}>{person.paid ? "Pago" : "Previsto"}</Badge></div><p className="text-xs text-muted-foreground mt-1">{person.saleCount} venda{person.saleCount === 1 ? "" : "s"} com comissão no ciclo{person.paidAt ? ` · pago em ${dateTimeBr(person.paidAt)}` : ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Salário fixo</p><p className="font-semibold">{money(person.salary)}</p></div>
              <div><p className="text-xs text-muted-foreground">Comissões</p><p className="font-semibold">{money(person.commission)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold text-primary">{money(person.total)}</p></div>
              <div className="lg:justify-self-end">{isAdmin && !person.paid && <Button size="sm" onClick={() => settle.mutate(person)} disabled={settle.isPending || cycleInFuture}><CheckCircle2 className="h-4 w-4 mr-1.5" />Confirmar pagamento</Button>}{isAdmin && !person.paid && cycleInFuture && <p className="text-[11px] text-muted-foreground mt-1 max-w-[190px]">Disponível na data prevista ou depois.</p>}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CircleDollarSign className="h-4 w-4" />Lançamentos do ciclo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando comissões...</p> : filtered.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma comissão encontrada neste ciclo.</div> : filtered.map((entry) => {
            const product = productName(entry.product_id);
            const lead = leadName(entry.lead_id);
            return <div key={entry.id} className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1.2fr_1fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div><p className="font-semibold">{profileName(entry.user_id)}</p><p className="text-xs text-muted-foreground">{lead?.empresa || lead?.nome || "Venda"}</p></div>
              <div><p className="text-xs text-muted-foreground">Produto</p><p className="text-sm font-medium">{product?.name || "—"}</p><p className="text-xs text-muted-foreground">{product?.insurer_name || ""}</p></div>
              <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-semibold">{money(entry.commission_base_amount)}</p><p className="text-xs text-muted-foreground">Boleto: {dateBr(entry.boleto_paid_at)}</p></div>
              <div><p className="text-xs text-muted-foreground">Administradora</p><p className="font-semibold">{money(entry.admin_amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.admin_commission_pct || 0).toLocaleString("pt-BR")}% da venda</p></div>
              <div><p className="text-xs text-muted-foreground">Corretor</p><p className="font-semibold text-primary">{money(entry.amount)}</p><p className="text-xs text-muted-foreground">{Number(entry.broker_commission_pct || 0).toLocaleString("pt-BR")}% da comissão</p></div>
              <div className="flex items-center lg:justify-end"><Badge variant={entry.status === "earned" ? "secondary" : entry.status === "paid" ? "default" : entry.status === "cancelled" ? "destructive" : "outline"}>{entry.status === "earned" ? "Liberada" : entry.status === "paid" ? "Paga" : entry.status === "cancelled" ? "Cancelada" : entry.status}</Badge></div>
            </div>;
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ReceiptText className="h-4 w-4" />Histórico de fechamentos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {batches.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum fechamento confirmado ainda.</p> : batches.slice(0, 20).map((batch) => (
            <div key={batch.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_.8fr_.8fr_.8fr] lg:items-center">
              <div><p className="font-medium">{profileName(batch.user_id)}</p><p className="text-xs text-muted-foreground">Pagamento {dateBr(batch.reference_date)} · {batch.commission_count} comissão{batch.commission_count === 1 ? "" : "ões"}</p></div>
              <div><p className="text-xs text-muted-foreground">Salário</p><p className="font-semibold">{money(batch.salary_amount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Comissões</p><p className="font-semibold">{money(batch.commission_amount)}</p></div>
              <div className="lg:text-right"><p className="text-xs text-muted-foreground">Total pago</p><p className="text-lg font-bold">{money(batch.total_amount)}</p><p className="text-[11px] text-muted-foreground">{dateTimeBr(batch.paid_at)}</p></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20"><CardContent className="p-4 flex gap-3"><WalletCards className="h-5 w-5 text-primary shrink-0" /><div><p className="font-medium text-sm">Regra financeira do Segly</p><p className="text-xs text-muted-foreground mt-1">A comissão só é liberada quando a venda está Implantada, possui produto vinculado, valor final fechado e boleto efetivamente pago. O valor do corretor é calculado sobre a comissão recebida pela administradora e entra no primeiro dia útil do mês seguinte. Ao confirmar o pagamento, o Segly congela o salário e as comissões daquele fechamento para manter o histórico financeiro.</p></div></CardContent></Card>
    </div>
  );
}
