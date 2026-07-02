import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLeadFormFields, LeadFormField } from "@/hooks/useLeadFormFields";

const STANDARD_KEYS: Record<string, string> = {
  nome: "nome",
  telefone: "telefone",
  email: "email",
  empresa: "empresa",
  porte_empresa: "porte_empresa",
  departamento: "departamento",
  cargo: "cargo",
};

function initialValues(fields: LeadFormField[]): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.type === "multiselect") v[f.field_key] = [];
    else if (f.type === "checkbox") v[f.field_key] = f.default_value === "true";
    else v[f.field_key] = f.default_value ?? "";
  });
  return v;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (leadId: string) => void;
}

export function NovoLeadDialog({ open, onOpenChange, onCreated }: Props) {
  const { data: fields = [], isLoading } = useLeadFormFields({ onlyActive: true });
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Reset when opening
  useMemo(() => {
    if (open) setValues(initialValues(fields));
  }, [open, fields]);

  const setVal = (k: string, v: unknown) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    // Validate required
    for (const f of fields) {
      const val = values[f.field_key];
      if (f.required) {
        const empty =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0) ||
          (f.type === "checkbox" && val === false);
        if (empty) {
          toast.error(`Preencha: ${f.label}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const uRes = await supabase.auth.getUser();
      const uid = uRes.data.user?.id;
      if (!uid) throw new Error("Não autenticado");
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id, display_name")
        .eq("id", uid)
        .maybeSingle();
      const p = prof as { organization_id: string | null; display_name: string | null } | null;
      if (!p?.organization_id) throw new Error("Organização não configurada");

      const standard: Record<string, string> = {
        nome: "",
        telefone: "",
        email: "",
        empresa: "",
        porte_empresa: "",
        departamento: "",
        cargo: "",
      };
      const custom: Record<string, unknown> = {};
      fields.forEach((f) => {
        const key = f.maps_to && STANDARD_KEYS[f.maps_to] ? f.maps_to : f.field_key;
        const val = values[f.field_key];
        if (STANDARD_KEYS[key]) {
          standard[key] = val == null ? "" : String(val);
        } else {
          custom[f.field_key] = val ?? null;
        }
      });

      const { data: inserted, error } = await supabase
        .from("leads")
        .insert({
          ...standard,
          custom_fields: custom,
          organization_id: p.organization_id,
          owner_id: uid,
          fonte: "manual",
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      const leadId = (inserted as { id: string }).id;
      // Append history entry
      const actor = p.display_name || uRes.data.user?.email || "usuário";
      const entry = {
        tipo: "manual",
        descricao: `Lead cadastrado manualmente por ${actor}`,
        data: new Date().toISOString(),
        autor: actor,
      };
      const { data: current } = await supabase
        .from("leads")
        .select("historico")
        .eq("id", leadId)
        .maybeSingle();
      const hist = Array.isArray((current as { historico?: unknown[] } | null)?.historico)
        ? ((current as { historico: unknown[] }).historico as unknown[])
        : [];
      await supabase.from("leads").update({ historico: [...hist, entry] } as never).eq("id", leadId);

      toast.success("Lead cadastrado!");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["pipeline-leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onCreated?.(leadId);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados do prospecto</DialogTitle>
          <DialogDescription>Cadastre um novo lead manualmente.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando formulário…</p>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => {
              const v = values[f.field_key];
              const common = (
                <>
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {f.help_text && (
                    <p className="text-[11px] text-muted-foreground">{f.help_text}</p>
                  )}
                </>
              );
              return (
                <div key={f.id} className="space-y-1.5">
                  {common}
                  {f.type === "long_text" ? (
                    <Textarea
                      rows={3}
                      placeholder={f.placeholder ?? ""}
                      value={(v as string) ?? ""}
                      onChange={(e) => setVal(f.field_key, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={(v as string) ?? ""}
                      onValueChange={(val) => setVal(f.field_key, val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={f.placeholder ?? "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "multiselect" ? (
                    <div className="space-y-1.5 border rounded-md p-2">
                      {(f.options || []).map((o) => {
                        const arr = (v as string[]) ?? [];
                        const checked = arr.includes(o);
                        return (
                          <div key={o} className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) =>
                                setVal(
                                  f.field_key,
                                  c ? [...arr, o] : arr.filter((x) => x !== o)
                                )
                              }
                            />
                            <span className="text-sm">{o}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : f.type === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!v}
                        onCheckedChange={(c) => setVal(f.field_key, !!c)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {f.placeholder ?? "Sim"}
                      </span>
                    </div>
                  ) : (
                    <Input
                      type={
                        f.type === "email"
                          ? "email"
                          : f.type === "number"
                          ? "number"
                          : f.type === "date"
                          ? "date"
                          : f.type === "phone"
                          ? "tel"
                          : "text"
                      }
                      placeholder={f.placeholder ?? ""}
                      value={(v as string) ?? ""}
                      onChange={(e) => setVal(f.field_key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || isLoading}>
            {saving ? "Salvando…" : "Cadastrar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
