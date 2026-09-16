import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CircleDollarSign, Search, TrendingUp, Users } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type HistoryItem = {
  data?: string;
  descricao?: string;
  resultado?: string;
};

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
};

type LeadSnapshot = {
  id: string;
  custom_fields: Record<string, unknown> | null;
  historico: HistoryItem[] | null;
};

type StageDataSnapshot = {
  lead_id: string;
  data: Record<string, unknown> | null;
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

const firstMeaningfulNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

const firstMeaningfulString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const ClientesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("30");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["clientes-page-complete-v2"],
    queryFn: async () => {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes" as never)
        .select("id,lead_id,nome,email,telefone,empresa,pipeline_origem,data_conversao,status,owner_id")
        .order("data_conversao", { ascending: false });
      if (clientesError) throw clientesError;

      const clientes = (clientesData ?? []) as unknown as Cliente[];
      const leadIds = clientes.map((cliente) => cliente.lead_id).filter(Boolean) as string[];
      if (!leadIds.length) {
        return { clientes, leads: [] as LeadSnapshot[], stageData: [] as StageDataSnapshot[], proposals: [] as ProposalSnapshot[] };
      }

      const [leadsResult, stageDataResult, proposalsResult] = await Promise.all([
        supabase.from("leads").select("id,custom_fields,historico").in("id", leadIds),
        supabase.from("lead_stage_data" as never).select("lead_id,data").in("lead_id", leadIds),
        supabase.from("proposals" as never).select("id,lead_id,negotiated_value,created_at").in("lead_id", leadIds).order("created_at", { ascending: false }),
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (stageDataResult.error) throw stageDataResult.error;
      if (proposalsResult.error) throw proposalsResult.error;

      return {
        clientes,
        leads: (leadsResult.data ?? []) as unknown as LeadSnapshot[],
        stageData: (stageDataResult.data ?? []) as unknown as StageDataSnapshot[],
        proposals: (proposalsResult.data ?? []) as unknown as ProposalSnapshot[],
      };
    },
  });

  const clientes = data?.clientes ?? [];
  const leads = data?.leads ?? [];
  const stageData = data?.stageData ?? [];
  const proposals = data?.proposals ?? [];

  const metricsByLead = useMemo(() => {
    const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
    const stageDataMap = new Map<string, Record<string, unknown>[]>();
    stageData.forEach((row) => {
      const rows = stageDataMap.get(row.lead_id) ?? [];
      if (row.data) rows.push(row.data);
      stageDataMap.set(row.lead_id, rows);
    });

    const latestProposal = new Map<string, ProposalSnapshot>();
    proposals.forEach((proposal) => {
      if (!latestProposal.has(proposal.lead_id)) latestProposal.set(proposal.lead_id, proposal);
    });

    const result = new Map<string, { lives: number; value: number; gainDate: string | null; hasLives: boolean; hasValue: boolean }>();

    leadMap.forEach((lead, id) => {
      const custom = lead.custom_fields ?? {};
      const stageRows = stageDataMap.get(id) ?? [];
      const stageValue = (key: string) => {
        for (let index = stageRows.length - 1; index >= 0; index -= 1) {
          const value = stageRows[index]?.[key];
          if (value !== null && value !== undefined && String(value).trim()) return value;
        }
        return undefined;
      };

      const lives = firstMeaningfulNumber(
        custom.quantidade_vidas_implantado,
        stageValue("quantidade_vidas_implantado"),
        custom.quantidade_vidas_proposta,
        stageValue("quantidade_vidas_proposta"),
        custom.quantidade_vidas,
        stageValue("quantidade_vidas"),
        custom.quantidade_pessoas,
        stageValue("quantidade_pessoas")
      );

      const proposal = latestProposal.get(id);
      const value = proposal
        ? firstMeaningfulNumber(
            proposal.negotiated_value,
            custom.valor_final_fechado,
            stageValue("valor_final_fechado"),
            custom.valor_fechado,
            stageValue("valor_fechado"),
            custom.valor_apresentado,
            stageValue("valor_apresentado")
          )
        : firstMeaningfulNumber(
            custom.valor_final_fechado,
            stageValue("valor_final_fechado"),
            custom.valor_fechado,
            stageValue("valor_fechado"),
            custom.valor_apresentado,
            stageValue("valor_apresentado")
          );

      const ganhoHistory = (lead.historico ?? [])
        .filter((item) => item.resultado === "stage_changed" && item.descricao?.toLocaleLowerCase("pt-BR").includes("ganho") && item.data)
        .map((item) => item.data as string)
        .sort();

      const gainDate = firstMeaningfulString(
        custom.data_ganho,
        stageValue("data_ganho"),
        custom.data_pagamento_boleto,
        stageValue("data_pagamento_boleto"),
        ganhoHistory.at(-1)
      );

      result.set(id, { lives, value, gainDate, hasLives: lives > 0, hasValue: value > 0 });
    });

    return result;
  }, [leads, stageData, proposals]);

  const enrichedClients = useMemo(() => clientes.map((cliente) => {
    const metrics = cliente.lead_id ? metricsByLead.get(cliente.lead_id) : undefined;
    return {
      ...cliente,
      lives: metrics?.lives ?? 0,
      totalValue: metrics?.value ?? 0,
      hasLives: metrics?.hasLives ?? false,
      hasValue: metrics?.hasValue ?? false,
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
    return enrichedClients.filter((cliente) => {
      const date = new Date(cliente.gainDate);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    });
  }, [enrichedClients, period]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; ganhos: number }>();
    periodClients.forEach((cliente) => {
      const date = new Date(cliente.gainDate);
      if (Number.isNaN(date.getTime())) return;
      const key = format(date, "yyyy-MM-dd");
      const current = buckets.get(key) ?? { label: format(date, "dd/MM"), ganhos: 0 };
      current.ganhos += 1;
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

  const openClient = (cliente: Cliente) => {
    if (!cliente.lead_id) return;
    navigate(`/admin/lead/${cliente.lead_id}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os clientes ganhos, vidas contratadas e valor total de cada venda.</p>
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

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Gráfico de ganhos no período</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Quantidade de clientes ganhos por data.</p>
            </div>
            <Badge variant="secondary">{period === "all" ? "Todo o período" : `Últimos ${period} dias`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Nenhum ganho encontrado neste período.</div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [Number(value), "Ganhos"]} />
                  <Bar dataKey="ganhos" name="Ganhos" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Clientes ganhos</p><TrendingUp className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{periodTotals.gains}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Vidas ganhas</p><Users className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{periodTotals.lives}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Valor total ganho</p><CircleDollarSign className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-bold">{money(periodTotals.value)}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista de clientes</h2>
            <p className="text-xs text-muted-foreground">Clique no cliente ou use o botão “Abrir cliente” para voltar ao cadastro completo.</p>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, empresa ou e-mail..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando clientes...</p>
        ) : isError ? (
          <Card className="p-8 text-center"><p className="text-sm text-destructive">Não foi possível carregar os dados dos clientes.</p></Card>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((cliente) => (
              <Card
                key={cliente.id}
                role={cliente.lead_id ? "button" : undefined}
                tabIndex={cliente.lead_id ? 0 : undefined}
                onClick={() => openClient(cliente)}
                onKeyDown={(event) => {
                  if (cliente.lead_id && (event.key === "Enter" || event.key === " ")) openClient(cliente);
                }}
                className={cliente.lead_id ? "cursor-pointer transition-all hover:border-primary/40 hover:bg-muted/30" : ""}
              >
                <CardContent className="p-4">
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr_.8fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold uppercase">{cliente.nome}</p>
                        <Badge variant={cliente.status === "em_implantacao" ? "outline" : "secondary"}>{clientStatusLabel[cliente.status] || cliente.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{cliente.empresa || "—"} · {cliente.email || "sem e-mail"}</p>
                      <p className="text-xs text-muted-foreground">Ganho em {format(new Date(cliente.gainDate), "dd/MM/yyyy", { locale: ptBR })}{cliente.pipeline_origem ? ` · Origem: ${cliente.pipeline_origem}` : ""}</p>
                    </div>

                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Vidas ganhas</p>
                      <p className="mt-1 text-xl font-bold">{cliente.hasLives ? cliente.lives : "—"}</p>
                      {!cliente.hasLives && <p className="text-[11px] text-muted-foreground">Não informado no histórico</p>}
                    </div>

                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Valor total do cliente</p>
                      <p className="mt-1 text-lg font-bold">{cliente.hasValue ? money(cliente.totalValue) : "—"}</p>
                      {!cliente.hasValue && <p className="text-[11px] text-muted-foreground">Não informado no histórico</p>}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={!cliente.lead_id}
                        onClick={(event) => {
                          event.stopPropagation();
                          openClient(cliente);
                        }}
                      >
                        Abrir cliente
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesPage;
