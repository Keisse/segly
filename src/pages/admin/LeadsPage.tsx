import { useState, useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import LeadsTable from "@/components/admin/LeadsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { NovoLeadDialog } from "@/components/leads/NovoLeadDialog";

const LeadsPage = () => {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.nome?.toLowerCase().includes(q) ||
        l.empresa?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Lista centralizada com busca, filtros e ordenação. O acesso respeita seu papel.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo Lead
        </Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, empresa ou e-mail..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <LeadsTable leads={filtered} isLoading={isLoading} />
      <NovoLeadDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
};

export default LeadsPage;

