import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Calendar, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total de Leads" value={isLoading ? "..." : metrics?.total || 0} icon={Users} delay={0} />
          <MetricCard title="Leads Hoje" value={isLoading ? "..." : metrics?.today || 0} icon={UserPlus} delay={0.1} />
          <MetricCard title="Esta Semana" value={isLoading ? "..." : metrics?.thisWeek || 0} icon={Calendar} delay={0.2} />
          <MetricCard title="Este Mês" value={isLoading ? "..." : metrics?.thisMonth || 0} icon={TrendingUp} delay={0.3} />
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

        {/* Fonte Tabs + Filters */}
        <Tabs value={fonteTab} onValueChange={(v) => setFonteTab(v as FonteTab)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
          </TabsList>
        </Tabs>

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
