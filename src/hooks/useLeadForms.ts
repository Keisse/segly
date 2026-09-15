import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LeadForm = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function useLeadForms() {
  return useQuery({
    queryKey: ["lead-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms" as never)
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LeadForm[];
    },
  });
}

export function useCreateLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const auth = await supabase.auth.getUser();
      const uid = auth.data.user?.id;
      if (!uid) throw new Error("Usuário não autenticado.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", uid)
        .maybeSingle();
      if (profileError) throw profileError;
      const orgId = (profile as { organization_id?: string | null } | null)?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada.");
      const { data, error } = await supabase
        .from("lead_forms" as never)
        .insert({ organization_id: orgId, name: name.trim(), description: description?.trim() || null, active: true, is_default: false } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as LeadForm;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-forms"] });
      toast.success("Formulário criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<LeadForm, "name" | "description" | "active" | "is_default">> }) => {
      const { error } = await supabase.from("lead_forms" as never).update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-forms"] });
      qc.invalidateQueries({ queryKey: ["lead-form-fields"] });
      toast.success("Formulário atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: LeadForm) => {
      if (form.is_default) throw new Error("O formulário padrão não pode ser excluído. Marque outro como padrão primeiro.");
      const { error } = await supabase.from("lead_forms" as never).delete().eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-forms"] });
      toast.success("Formulário excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
