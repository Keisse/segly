import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Filter, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadStatus } from "@/types/lead";
import { statusLabels } from "@/types/lead";

const porteOptions = [
  "Autônomo",
  "2 - 10 funcionários",
  "11 - 50 funcionários",
  "51 - 200 funcionários",
  "201 - 500 funcionários",
  "501 - 1000 funcionários",
  "1001 - 5000 funcionários",
  "5001+ funcionários",
];

const departamentoOptions = [
  "Recursos Humanos",
  "Treinamento & Desenvolvimento",
  "Tecnologia",
  "Business Intelligence/Dados",
  "Produto",
  "Inovação",
  "Marketing",
  "Compras",
  "Não tem departamento",
  "Outros",
];

const cargoOptions = [
  "C-level",
  "Diretor(a)",
  "Gerente",
  "Coordenador(a)/Supervisor(a)",
  "Especialista",
  "Analista",
  "Estagiário / Estudante",
  "Outros",
];

interface FiltersState {
  status?: LeadStatus;
  startDate?: Date;
  endDate?: Date;
  porte?: string;
  departamento?: string;
  cargo?: string;
  searchName?: string;
}

interface DashboardFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

const DashboardFilters = ({ filters, onFiltersChange }: DashboardFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  const setQuickPeriod = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    onFiltersChange({ ...filters, startDate, endDate });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 space-y-4"
    >
      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search by name */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={filters.searchName || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                searchName: e.target.value || undefined,
              })
            }
            className="pl-9 w-[200px] h-9 bg-card"
          />
        </div>

        <div className="h-6 w-px bg-border/50" />

        <Button
          variant={isExpanded ? "default" : "outline"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {Object.values(filters).filter(v => v !== undefined && v !== "").length}
            </span>
          )}
        </Button>

        <div className="h-6 w-px bg-border/50" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickPeriod(0)}
          className="text-xs"
        >
          Hoje
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickPeriod(7)}
          className="text-xs"
        >
          Últimos 7 dias
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickPeriod(30)}
          className="text-xs"
        >
          Últimos 30 dias
        </Button>

        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground gap-1"
            >
              <X className="w-3 h-3" />
              Limpar filtros
            </Button>
          </>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/50"
        >
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Período</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate
                      ? format(filters.startDate, "dd/MM/yy", { locale: ptBR })
                      : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) =>
                      onFiltersChange({ ...filters, startDate: date || undefined })
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
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate
                      ? format(filters.endDate, "dd/MM/yy", { locale: ptBR })
                      : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) =>
                      onFiltersChange({ ...filters, endDate: date || undefined })
                    }
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value === "all" ? undefined : (value as LeadStatus),
                })
              }
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Porte */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Porte da Empresa</label>
            <Select
              value={filters.porte || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  porte: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                {porteOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Departamento</label>
            <Select
              value={filters.departamento || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  departamento: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                {departamentoOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DashboardFilters;
