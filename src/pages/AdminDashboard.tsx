import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Calendar, TrendingUp, LogOut, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardMetrics } from "@/hooks/useLeads";
import MetricCard from "@/components/admin/MetricCard";
import LeadsChart from "@/components/admin/LeadsChart";
import LeadsTable from "@/components/admin/LeadsTable";
import DashboardFilters from "@/components/admin/DashboardFilters";
import DistributionCharts from "@/components/admin/DistributionCharts";
import AddUserDialog from "@/components/admin/AddUserDialog";
import allevoLogo from "@/assets/allevo-logo.png";
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

type FonteTab = "todos" | "organico" | "outbound";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const [filters, setFilters] = useState<FiltersState>({});
  const [fonteTab, setFonteTab] = useState<FonteTab>("todos");

  // Filter leads based on filters + fonte tab
  const filteredLeads = useMemo(() => {
    if (!metrics?.leads) return [];
    
    return metrics.leads.filter((lead) => {
      // Filter by fonte tab
      if (fonteTab !== "todos") {
        const leadFonte = (lead as any).fonte || "organico";
        if (leadFonte !== fonteTab) return false;
      }
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.startDate && new Date(lead.created_at) < filters.startDate) return false;
      if (filters.endDate && new Date(lead.created_at) > filters.endDate) return false;
      if (filters.porte && lead.porte_empresa !== filters.porte) return false;
      if (filters.departamento && lead.departamento !== filters.departamento) return false;
      if (filters.cargo && lead.cargo !== filters.cargo) return false;
      if (filters.searchName && !lead.nome.toLowerCase().includes(filters.searchName.toLowerCase())) return false;
      return true;
    });
  }, [metrics?.leads, filters, fonteTab]);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-login");
  };

  const handleExportCSV = () => {
    if (!filteredLeads.length) return;

    const headers = [
      "Data", "Nome", "Email", "Telefone", "Empresa",
      "Porte", "Departamento", "Cargo", "Score (%)", "Status", "Fonte",
    ];

    const rows = filteredLeads.map((lead) => [
      new Date(lead.created_at).toLocaleDateString("pt-BR"),
      lead.nome,
      lead.email,
      lead.telefone,
      lead.empresa,
      lead.porte_empresa,
      lead.departamento,
      lead.cargo,
      lead.resultado_diagnostico?.percentage?.toFixed(1) || "N/A",
      lead.status,
      lead.fonte || "organico",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${fonteTab}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <img src={allevoLogo} alt="Allevo for Business" className="h-8" />
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus leads do diagnóstico
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddUserDialog />
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredLeads.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
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
            <TabsTrigger value="organico">Orgânico</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
          </TabsList>
        </Tabs>

        <DashboardFilters filters={filters} onFiltersChange={setFilters} />

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
