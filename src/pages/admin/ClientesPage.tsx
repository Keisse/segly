import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  pipeline_origem: string | null;
  data_conversao: string;
  status: string;
  owner_id: string | null;
  historico: any[];
};

const ClientesPage = () => {
  const [search, setSearch] = useState("");

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes" as any)
        .select("*")
        .order("data_conversao", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Cliente[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Contatos que se tornaram clientes. Acesso respeita seu papel.
        </p>
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium uppercase">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {c.empresa || "—"} · {c.email || "sem e-mail"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Convertido em {format(new Date(c.data_conversao), "dd/MM/yyyy", { locale: ptBR })}
                  {c.pipeline_origem ? ` · Origem: ${c.pipeline_origem}` : ""}
                </p>
              </div>
              <Badge variant="secondary">{c.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
