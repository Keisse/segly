import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, CalendarDays, TrendingUp, CalendarIcon, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardMetrics } from "@/hooks/useLeads";
import { useCampaigns } from "@/hooks/useCampaigns";
import MetricCard from "@/components/admin/MetricCard";
import LeadsChart from "@/components/admin/LeadsChart";
import LeadsTable from "@/components/admin/LeadsTable";
import DashboardFilters from "@/components/admin/DashboardFilters";
import DistributionCharts from "@/components/admin/DistributionCharts";
import type { LeadStatus } from "@/types/lead";

interface FiltersState {
  status?: LeadStatus;
  startDate?: Date;
  endDate?: Date;
  porte?: string;
  departamento?: string;
  cargo?: string;
  searchName?: string;
}

type FonteTab = "todos" | "inbound" | "outbound";

const AdminDashboard = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { data: campaigns = [] } = useCampaigns();
  const [filters, setFilters] = useState<FiltersState>({});
  const [fonteTab, setFonteTab] = useState<FonteTab>("todos");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const filteredLeads = useMemo(() => {
    if (!metrics?.leads) return [];
    return metrics.leads.filter((lead) => {
      if (fonteTab !== "todos") {
        const leadFonte = (lead as any).fonte || "inbound";
        if (fonteTab === "outbound" && leadFonte !== "outbound") return false;
        if (fonteTab === "inbound" && leadFonte !== "inbound" && leadFonte !== "organico") return false;
      }
      if (campaignFilter !== "all" && lead.campaign_id !== campaignFilter) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.startDate && new Date(lead.created_at) < filters.startDate) return false;
      if (filters.endDate && new Date(lead.created_at) > filters.endDate) return false;
      if (filters.porte && lead.porte_empresa !== filters.porte) return false;
      if (filters.departamento && lead.departamento !== filters.departamento) return false;
      if (filters.cargo && lead.cargo !== filters.cargo) return false;
      if (filters.searchName && !lead.nome.toLowerCase().includes(filters.searchName.toLowerCase())) return false;
      return true;
    });
  }, [metrics?.leads, filters, fonteTab, campaignFilter]);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  }, []);
  const weekStart = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d;
  }, []);
  const monthStart = useMemo(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const computedMetrics = useMemo(() => ({
    total: filteredLeads.length,
    today: filteredLeads.filter((l) => new Date(l.created_at) >= todayStart).length,
    thisWeek: filteredLeads.filter((l) => new Date(l.created_at) >= weekStart).length,
    thisMonth: filteredLeads.filter((l) => new Date(l.created_at) >= monthStart).length,
  }), [filteredLeads, todayStart, weekStart, monthStart]);

  const setQuickPeriod = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    setFilters({ ...filters, startDate, endDate });
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    setFilters({ ...filters, startDate, endDate });
  };

  const isPeriodActive = (days: number) => {
    if (!filters.startDate || !filters.endDate) return false;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return (
      format(filters.startDate, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") &&
      format(filters.endDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")
    );
  };

  const isCurrentMonthActive = () => {
    if (!filters.startDate || !filters.endDate) return false;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return (
      format(filters.startDate, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") &&
      format(filters.endDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")
    );
  };

  const hasDateFilters = filters.startDate || filters.endDate;

  const clearDateFilters = () => {
    setFilters({ ...filters, startDate: undefined, endDate: undefined });
  };

  return (
    <div className="py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus leads do diagnóstico
          </p>
        </motion.div>

        {/* Date Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Período:</span>

            <Button
              variant={isPeriodActive(0) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPeriod(0)}
            >
              Hoje
            </Button>
            <Button
              variant={isPeriodActive(7) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPeriod(7)}
            >
              7 dias
            </Button>
            <Button
              variant={isPeriodActive(30) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPeriod(30)}
            >
              30 dias
            </Button>
            <Button
              variant={isCurrentMonthActive() ? "default" : "outline"}
              size="sm"
              onClick={setCurrentMonth}
            >
              Este mês
            </Button>

            <div className="h-6 w-px bg-border/50" />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left font-normal gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {filters.startDate
                    ? format(filters.startDate, "dd/MM/yy", { locale: ptBR })
                    : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) =>
                    setFilters({ ...filters, startDate: date || undefined })
                  }
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left font-normal gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {filters.endDate
                    ? format(filters.endDate, "dd/MM/yy", { locale: ptBR })
                    : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) =>
                    setFilters({ ...filters, endDate: date || undefined })
                  }
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {hasDateFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateFilters}
                className="text-xs text-muted-foreground gap-1"
              >
                <X className="w-3 h-3" />
                Limpar
              </Button>
            )}
          </div>
        </motion.div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total de Leads" value={isLoading ? "..." : computedMetrics.total} icon={Users} delay={0} />
          <MetricCard title="Leads Hoje" value={isLoading ? "..." : computedMetrics.today} icon={UserPlus} delay={0.1} />
          <MetricCard title="Esta Semana" value={isLoading ? "..." : computedMetrics.thisWeek} icon={CalendarDays} delay={0.2} />
          <MetricCard title="Este Mês" value={isLoading ? "..." : computedMetrics.thisMonth} icon={TrendingUp} delay={0.3} />
        </div>

        {/* Chart */}
        {metrics?.chartData && <LeadsChart data={metrics.chartData} />}

        {/* Distribution Charts */}
        {metrics && (
          <DistributionCharts
            cargoDistribution={metrics.cargoDistribution}
            departamentoDistribution={metrics.departamentoDistribution}
          />
        )}

        {/* Campaign Filter */}
        <h2 className="text-lg font-semibold text-foreground">Campanhas</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[260px] bg-card">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DashboardFilters filters={filters} onFiltersChange={setFilters} filteredLeads={filteredLeads} fonteTab={fonteTab} />

        {/* Leads Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Leads ({filteredLeads.length})
            </h2>
          </div>
          <LeadsTable leads={filteredLeads} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
