import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PipelineStageField = {
  id: string;
  stage_id: string;
  field_key: string;
  label: string;
  field_type: string;
  required: boolean;
  ordem: number;
  placeholder: string | null;
  options: string[];
  maps_to: string | null;
  active: boolean;
};

export function usePipelineStageFields(stageId: string | null | undefined) {
  return useQuery({
    queryKey: ["pipeline-stage-fields", stageId],
    queryFn: async () => {
      if (!stageId) return [];
      const { data, error } = await supabase
        .from("pipeline_stage_fields" as never)
        .select("*")
        .eq("stage_id", stageId)
        .eq("active", true)
        .order("ordem");

      if (error) throw error;
      return ((data ?? []) as unknown as PipelineStageField[]).map((field) => ({
        ...field,
        options: Array.isArray(field.options) ? field.options : [],
      }));
    },
    enabled: !!stageId,
  });
}
