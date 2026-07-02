import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lead, LeadStatus, Nota, HistoricoItem, ResultadoDiagnostico } from "@/types/lead";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// Helper to transform database row to Lead type
function transformLead(row: any): Lead {
  return {
    id: row.id,
    created_at: row.created_at,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    empresa: row.empresa,
    porte_empresa: row.porte_empresa,
    departamento: row.departamento,
    cargo: row.cargo,
    resultado_diagnostico: row.resultado_diagnostico as ResultadoDiagnostico | null,
    status: row.status as LeadStatus,
    notas: (row.notas as Nota[]) || [],
    historico: (row.historico as HistoricoItem[]) || [],
    responsavel: row.responsavel || null,
    fonte: row.fonte || "inbound",
    campaign_id: row.campaign_id || null,
    campaign_slug: row.campaign_slug || null,
    campaign_name: row.campaign_name || null,
    owner_id: row.owner_id || null,
    pipeline_id: row.pipeline_id || null,
    stage_id: row.stage_id || null,
  };
}

// Type for inserting a new lead
interface InsertLead {
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  porte_empresa: string;
  departamento: string;
  cargo: string;
  resultado_diagnostico?: Json;
  fonte?: string;
}

// Fetch all leads
export function useLeads(filters?: {
  status?: LeadStatus;
  startDate?: Date;
  endDate?: Date;
  porte?: string;
  departamento?: string;
  cargo?: string;
}) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }
      if (filters?.porte) {
        query = query.eq("porte_empresa", filters.porte);
      }
      if (filters?.departamento) {
        query = query.eq("departamento", filters.departamento);
      }
      if (filters?.cargo) {
        query = query.eq("cargo", filters.cargo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(transformLead);
    },
  });
}

// Fetch single lead
export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return transformLead(data);
    },
    enabled: !!id,
  });
}

// Insert new lead via secure Edge Function with validation
export function useInsertLead() {
  return useMutation({
    mutationFn: async (lead: InsertLead) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lead),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details?.join(", ") || result.error || "Erro ao salvar lead";
        throw new Error(errorMessage);
      }

      return transformLead(result.lead);
    },
    onSuccess: () => {
      toast.success("Diagnóstico salvo com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar diagnóstico. Tente novamente.");
    },
  });
}

// Update lead status
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformLead(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error updating lead status:", error);
      toast.error("Erro ao atualizar status.");
    },
  });
}

// Add note to lead
export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      nota 
    }: { 
      id: string; 
      nota: Omit<Nota, 'id'> 
    }) => {
      // First get current notes
      const { data: lead, error: fetchError } = await supabase
        .from("leads")
        .select("notas")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const currentNotas = (lead?.notas as unknown as Nota[]) || [];
      const newNota: Nota = {
        ...nota,
        id: crypto.randomUUID(),
      };

      const { data, error } = await supabase
        .from("leads")
        .update({ notas: [...currentNotas, newNota] as unknown as Json })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformLead(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
      toast.success("Nota adicionada!");
    },
    onError: (error) => {
      console.error("Error adding note:", error);
      toast.error("Erro ao adicionar nota.");
    },
  });
}

// Add history item to lead
export function useAddHistoricoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      item 
    }: { 
      id: string; 
      item: Omit<HistoricoItem, 'id'> 
    }) => {
      // First get current history
      const { data: lead, error: fetchError } = await supabase
        .from("leads")
        .select("historico")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const currentHistorico = (lead?.historico as unknown as HistoricoItem[]) || [];
      const newItem: HistoricoItem = {
        ...item,
        id: crypto.randomUUID(),
      };

      const { data, error } = await supabase
        .from("leads")
        .update({ historico: [...currentHistorico, newItem] as unknown as Json })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformLead(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
      toast.success("Interação registrada!");
    },
    onError: (error) => {
      console.error("Error adding history item:", error);
      toast.error("Erro ao registrar interação.");
    },
  });
}

// Get dashboard metrics
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all leads
      const { data: allLeads, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const leads = (allLeads || []).map(transformLead);

      // Calculate metrics
      const total = leads.length;
      const today = leads.filter(
        (l) => new Date(l.created_at) >= startOfToday
      ).length;
      const thisWeek = leads.filter(
        (l) => new Date(l.created_at) >= startOfWeek
      ).length;
      const thisMonth = leads.filter(
        (l) => new Date(l.created_at) >= startOfMonth
      ).length;

      // Group by date for chart (last 30 days)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      
      const dailyCounts: Record<string, number> = {};
      leads
        .filter((l) => new Date(l.created_at) >= last30Days)
        .forEach((l) => {
          const date = new Date(l.created_at).toISOString().split("T")[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

      // Fill in missing days
      const chartData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        chartData.push({
          date: dateStr,
          leads: dailyCounts[dateStr] || 0,
        });
      }

      // Distribution by cargo
      const cargoDistribution = leads.reduce((acc, l) => {
        acc[l.cargo] = (acc[l.cargo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Distribution by departamento
      const departamentoDistribution = leads.reduce((acc, l) => {
        acc[l.departamento] = (acc[l.departamento] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Distribution by status
      const statusDistribution = leads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        today,
        thisWeek,
        thisMonth,
        chartData,
        cargoDistribution,
        departamentoDistribution,
        statusDistribution,
        leads,
      };
    },
  });
}

// Update lead responsavel
export function useUpdateLeadResponsavel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, responsavel }: { id: string; responsavel: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ responsavel })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformLead(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", data.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Responsável atualizado!");
    },
    onError: (error) => {
      console.error("Error updating lead responsavel:", error);
      toast.error("Erro ao atualizar responsável.");
    },
  });
}

// Delete lead
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Lead excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting lead:", error);
      toast.error("Erro ao excluir lead.");
    },
  });
}
