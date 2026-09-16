import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle2, CircleDollarSign, Search, TrendingUp, Users } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

type Period = "7" | "30" | "90" | "all" | "custom";

type DateRange = {
  start: Date | null;
  end: Date | null;
};

const clientStatusLabel: Record<string, string> = {
  ativo: "Ativo",
  em_implantacao: "Em implantação",
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const dateInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

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
  const [customStart, setCustomStart] = useState(() => dateInputValue(subDays(new Date(), 29)));
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));

  const range = useMemo<DateRange>(() => {
    if (period === "all") return { start: null, end: null };

    if (period === "custom") {
      const first = new Date(`${customStart}T00:00:00`);
      const second = new Date(`${customEnd}T23:59:59.999`);
      if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return { start: null, end: null };
      if (first <= second) return { start: first, end: second };
      return { start: startOfDay(second), end: endOfDay(first) };
    }

    return {
      start: startOfDay(subDays(new Date(), Number(period) - 1)),
      end: endOfDay(new Date()),
    };
  }, [period, customStart, customEnd]);

  const periodLabel = useMemo(() => {
    if (period === "all") return "Todo o período";
    if (period === "custom" && range.start && range.end) return `${format(range.start, "dd/MM/yyyy")} a ${format(range.end, "dd/MM/yyyy")}`;
    return `Últimos ${period} dias`;
  }, [period, range]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["clientes-page-complete-v3"],
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

  const periodClients = useMemo(() => enrichedClients.filter((cliente) => {
    const date = new Date(cliente.gainDate);
    if (Number.isNaN(date.getTime())) return false;
    if (range.start && date < range.start) return false;
    if (range.end && date > range.end) return false;
    return true;
  }), [enrichedClients, range]);

  const chartData = useMemo(() => {
    if (!periodClients.length) return [];

    const counts = new Map<string, number>();
    periodClients.forEach((cliente) => {
      const date = startOfDay(new Date(cliente.gainDate));
      const key = format(date, "yyyy-MM-dd");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const earliest = periodClients.reduce((current, cliente) => {
      const date = startOfDay(new Date(cliente.gainDate));
      return date < current ? date : current;
    }, startOfDay(new Date(periodClients[0].gainDate)));

    const latest = periodClients.reduce((current, cliente) => {
      const date = startOfDay(new Date(cliente.gainDate));
      return date > current ? date : current;
    }, startOfDay(new Date(periodClients[0].gainDate)));

    const chartStart = range.start ? startOfDay(range.start) : earliest;
    const chartEnd = range.end ? startOfDay(range.end) : latest;
    const points: { date: string; label: string; ganhos: number }[] = [];

    for (let cursor = new Date(chartStart); cursor <= chartEnd; cursor.setDate(cursor.getDate() + 1)) {
      const key = format(cursor, "yyyy-MM-dd");
      points.push({ date: key, label: format(cursor, "dd/MM"), ganhos: counts.get(key) ?? 0 });
    }

    return points;
  }, [periodClients, range]);

  const periodTotals = useMemo(() => {
    const implanted = periodClients.filter((cliente) => cliente.status === "ativo").length;
    return {
      gains: periodClients.length,
      lives: periodClients.reduce((sum, cliente) => sum + cliente.lives, 0),
      value: periodClients.reduce((sum, cliente) => sum + cliente.totalValue, 0),
      implanted,
      implementing: Math.max(0, periodClients.length - implanted),
    };
  }, [periodClients]);

  const openClient = (cliente: Cliente) => {
    if (!cliente.lead_id) return;
    navigate(`/admin/lead/${cliente.lead_id}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os clientes ganhos, vidas contratadas, valor total e implantação.</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-full xl:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="custom">Período personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Data inicial</span>
                <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Data final</span>
                <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Ganhos no período</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Quantidade de clientes ganhos por dia.</p>
            </div>
            <Badge variant="secondary">{periodLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Nenhum ganho encontrado neste período.</div>
          ) : (
            <div className="h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={22} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(label) => String(label)} formatter={(value) => [Number(value), "Ganhos"]} />
                  <Line type="monotone" dataKey="ganhos" name="Ganhos" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Clientes ganhos</p><p className="mt-2 text-3xl font-bold">{periodTotals.gains}</p><p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><TrendingUp className="h-5 w-5" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Vidas ganhas</p><p className="mt-2 text-3xl font-bold">{periodTotals.lives}</p><p className="mt-1 text-xs text-muted-foreground">Somatório das vidas informadas</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Users className="h-5 w-5" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Valor total ganho</p><p className="mt-2 text-2xl font-bold">{money(periodTotals.value)}</p><p className="mt-1 text-xs text-muted-foreground">Valor contratado no período</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><CircleDollarSign className="h-5 w-5" /></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Já implantados</p><p className="mt-2 text-3xl font-bold">{periodTotals.implanted}</p><p className="mt-1 text-xs text-muted-foreground">{periodTotals.implementing} ainda em implantação</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><CheckCircle2 className="h-5 w-5" /></div></div></CardContent></Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista de clientes</h2>
            <p className="text-xs text-muted-foreground">Clique no cliente ou use o botão “Abrir cliente” para voltar ao cadastro completo.</p>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Buscar por nome, empresa ou e-mail..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
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
