import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CircleDollarSign, Search, TrendingUp, Users } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Cliente = {
  id: string;
  lead_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  pipeline_origem: string | null;
  data_conversao: string;
  status: string;
  owner_id: string | null;
  historico: unknown[];
};

type LeadSnapshot = {
  id: string;
  custom_fields: Record<string, unknown> | null;
  product_id: string | null;
};

type ProposalSnapshot = {
  id: string;
  lead_id: string;
  negotiated_value: number | string;
  created_at: string;
};

type Period = "30" | "90" | "all";

const clientStatusLabel: Record<string, string> = {
  ativo: "Ativo",
  em_implantacao: "Em implantação",
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const asNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ClientesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("30");

  const { data, isLoading } = useQuery({
    queryKey: ["clientes-with-gain-metrics"],
    queryFn: async () => {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes" as never)
        .select("id,lead_id,nome,email,telefone,empresa,pipeline_origem,data_conversao,status,owner_id,historico")
        .order("data_conversao", { ascending: false });
      if (clientesError) throw clientesError;

      const clientes = (clientesData ?? []) as unknown as Cliente[];
      const leadIds = clientes.map((cliente) => cliente.lead_id).filter(Boolean) as string[];
      if (!leadIds.length) return { clientes, leads: [] as LeadSnapshot[], proposals: [] as ProposalSnapshot[] };

      const [{ data: leadsData, error: leadsError }, { data: proposalsData, error: proposalsError }] = await Promise.all([
        supabase.from("leads").select("id,custom_fields,product_id").in("id", leadIds),
        supabase.from("proposals" as never).select("id,lead_id,negotiated_value,created_at").in("lead_id", leadIds).order("created_at", { ascending: false }),
      ]);
      if (leadsError) throw leadsError;
      if (proposalsError) throw proposalsError;

      return {
        clientes,
        leads: (leadsData ?? []) as unknown as LeadSnapshot[],
        proposals: (proposalsData ?? []) as unknown as ProposalSnapshot[],
      };
    },
  });

  const clientes = data?.clientes ?? [];
  const leads = data?.leads ?? [];
  const proposals = data?.proposals ?? [];

  const metricsByLead = useMemo(() => {
    const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
    const latestProposal = new Map<string, ProposalSnapshot>();
    proposals.forEach((proposal) => {
      if (!latestProposal.has(proposal.lead_id)) latestProposal.set(proposal.lead_id, proposal);
    });

    const result = new Map<string, { lives: number; value: number; gainDate: string | null }>();
    leadMap.forEach((lead, id) => {
      const custom = lead.custom_fields ?? {};
      const proposal = latestProposal.get(id);
      const lives = asNumber(
        custom.quantidade_vidas_implantado ??
        custom.quantidade_vidas_proposta ??
        custom.quantidade_vidas ??
        custom.quantidade_pessoas
      );
      const value = proposal
        ? asNumber(proposal.negotiated_value)
        : asNumber(custom.valor_final_fechado ?? custom.valor_fechado ?? custom.valor_apresentado);
      const gainDate = String(custom.data_ganho ?? custom.data_pagamento_boleto ?? "") || null;
      result.set(id, { lives, value, gainDate });
    });
    return result;
  }, [leads, proposals]);

  const enrichedClients = useMemo(() => clientes.map((cliente) => {
    const metrics = cliente.lead_id ? metricsByLead.get(cliente.lead_id) : undefined;
    return {
      ...cliente,
      lives: metrics?.lives ?? 0,
      totalValue: metrics?.value ?? 0,
      gainDate: metrics?.gainDate || cliente.data_conversao,
    };
  }), [clientes, metricsByLead]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrichedClients;
    return enrichedClients.filter((cliente) =>
      cliente.nome?.toLowerCase().includes(q) ||
      cliente.empresa?.toLowerCase().includes(q) ||
      cliente.email?.toLowerCase().includes(q)
    );
  }, [enrichedClients, search]);

  const periodClients = useMemo(() => {
    if (period === "all") return enrichedClients;
    const cutoff = startOfDay(subDays(new Date(), Number(period) - 1));
    return enrichedClients.filter((cliente) => new Date(cliente.gainDate) >= cutoff);
  }, [enrichedClients, period]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; ganhos: number; valor: number }>();
    periodClients.forEach((cliente) => {
      const date = new Date(cliente.gainDate);
      if (Number.isNaN(date.getTime())) return;
      const key = format(date, "yyyy-MM-dd");
      const current = buckets.get(key) ?? { label: format(date, "dd/MM"), ganhos: 0, valor: 0 };
      current.ganhos += 1;
      current.valor += cliente.totalValue;
      buckets.set(key, current);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [periodClients]);

  const periodTotals = useMemo(() => ({
    gains: periodClients.length,
    lives: periodClients.reduce((sum, cliente) => sum + cliente.lives, 0),
    value: periodClients.reduce((sum, cliente) => sum + cliente.totalValue, 0),
  }), [periodClients]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Clientes ganhos, valor contratado e quantidade de vidas.</p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
          <SelectTrigger className="w-full sm:w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Ganhos no período</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{periodTotals.gains}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Vidas ganhas</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{periodTotals.lives}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Valor total ganho</p><CircleDollarSign className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{money(periodTotals.value)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ganhos no período</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Nenhum ganho encontrado neste período.</div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => name === "valor" ? money(Number(value)) : Number(value)} />
                  <Bar dataKey="ganhos" name="Ganhos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, empresa ou e-mail..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((cliente) => (
            <Card
              key={cliente.id}
              role={cliente.lead_id ? "button" : undefined}
              tabIndex={cliente.lead_id ? 0 : undefined}
              onClick={() => cliente.lead_id && navigate(`/admin/lead/${cliente.lead_id}`)}
              onKeyDown={(event) => {
                if (cliente.lead_id && (event.key === "Enter" || event.key === " ")) navigate(`/admin/lead/${cliente.lead_id}`);
              }}
              className={`p-4 ${cliente.lead_id ? "cursor-pointer transition-colors hover:bg-muted/40" : ""}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium uppercase">{cliente.nome}</p>
                    <Badge variant={cliente.status === "em_implantacao" ? "outline" : "secondary"}>{clientStatusLabel[cliente.status] || cliente.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{cliente.empresa || "—"} · {cliente.email || "sem e-mail"}</p>
                  <p className="text-xs text-muted-foreground">Ganho em {format(new Date(cliente.gainDate), "dd/MM/yyyy", { locale: ptBR })}{cliente.pipeline_origem ? ` · Origem: ${cliente.pipeline_origem}` : ""}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:min-w-[420px] lg:items-center">
                  <div><p className="text-xs text-muted-foreground">Vidas ganhas</p><p className="font-semibold">{cliente.lives}</p></div>
                  <div><p className="text-xs text-muted-foreground">Valor total</p><p className="font-semibold">{money(cliente.totalValue)}</p></div>
                  <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-end"><span className="text-xs text-muted-foreground sm:hidden">Abrir cliente</span>{cliente.lead_id ? <ArrowRight className="h-5 w-5 text-muted-foreground" /> : <span className="text-xs text-muted-foreground">Sem vida vinculada</span>}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
