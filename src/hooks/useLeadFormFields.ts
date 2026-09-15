import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LeadFormFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "company";

export type LeadFormField = {
  id: string;
  organization_id: string;
  form_id: string;
  field_key: string;
  label: string;
  type: LeadFormFieldType;
  required: boolean;
  active: boolean;
  ordem: number;
  placeholder: string | null;
  help_text: string | null;
  default_value: string | null;
  options: string[];
  validation: Record<string, unknown>;
  is_system: boolean;
  maps_to: string | null;
};

function normalize(row: Record<string, unknown>): LeadFormField {
  return {
    ...(row as unknown as LeadFormField),
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    validation: (row.validation ?? {}) as Record<string, unknown>,
  };
}

export function useLeadFormFields(opts?: { onlyActive?: boolean; formId?: string | null }) {
  return useQuery({
    queryKey: ["lead-form-fields", opts?.formId ?? null, opts?.onlyActive ?? false],
    queryFn: async () => {
      let q = supabase.from("lead_form_fields").select("*").order("ordem");
      if (opts?.formId) q = q.eq("form_id", opts.formId);
      if (opts?.onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
    },
    enabled: opts?.formId === undefined || !!opts.formId,
  });
}

export function useUpsertLeadFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: Partial<LeadFormField> & { organization_id?: string; form_id?: string }) => {
      if (field.id) {
        const { error } = await supabase
          .from("lead_form_fields")
          .update(field as never)
          .eq("id", field.id);
        if (error) throw error;
        return;
      }
      if (!field.form_id) throw new Error("Selecione um formulário antes de adicionar campos.");
      const uRes = await supabase.auth.getUser();
      const uid = uRes.data.user?.id;
      if (!uid) throw new Error("Usuário não autenticado.");
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", uid)
        .maybeSingle();
      const orgId = (prof as { organization_id: string | null } | null)?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada");
      const payload = { ...(field as object), organization_id: orgId } as never;
      const { error } = await supabase.from("lead_form_fields").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-form-fields"] });
      toast.success("Campo salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLeadFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_form_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-form-fields"] });
      toast.success("Campo excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReorderLeadFormFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: LeadFormField[]) => {
      const results = await Promise.all(
        fields.map(async (field, index) => {
          const { error } = await supabase
            .from("lead_form_fields")
            .update({ ordem: index } as never)
            .eq("id", field.id)
            .eq("form_id", field.form_id);
          if (error) throw error;
          return { id: field.id, ordem: index };
        }),
      );
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-form-fields"] });
      toast.success("Ordem das perguntas atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
