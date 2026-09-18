import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  birthDateValues,
  DynamicLeadFormFields,
  isBirthDatesField,
  isPeopleCountField,
  type LeadFormValues,
} from "@/components/leads/DynamicLeadFormFields";
import { useLeadForms } from "@/hooks/useLeadForms";
import { useLeadFormFields } from "@/hooks/useLeadFormFields";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CORE_KEYS = new Set(["empresa", "cnpj", "nome", "telefone", "email"]);

const AGE_RANGES = [
  { label: "0 a 18 anos de idade", min: 0, max: 18 },
  { label: "19 a 23 anos de idade", min: 19, max: 23 },
  { label: "24 a 28 anos de idade", min: 24, max: 28 },
  { label: "29 a 33 anos de idade", min: 29, max: 33 },
  { label: "34 a 38 anos de idade", min: 34, max: 38 },
  { label: "39 a 43 anos de idade", min: 39, max: 43 },
  { label: "44 a 48 anos de idade", min: 44, max: 48 },
  { label: "49 a 53 anos de idade", min: 49, max: 53 },
  { label: "54 a 58 anos de idade", min: 54, max: 58 },
  { label: "59 anos de idade e acima", min: 59, max: Number.POSITIVE_INFINITY },
];

const calculateAgeFromBirthDate = (value: string) => {
  if (!value) return null;
  const birth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
};

const NovoLeadPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: forms = [], isLoading: loadingForms } = useLeadForms();
  const defaultForm = useMemo(() => forms.find((form) => form.is_default && form.active) || null, [forms]);
  const { data: fields = [], isLoading: loadingFields } = useLeadFormFields({ formId: defaultForm?.id ?? null, onlyActive: true });
  const [values, setValues] = useState<LeadFormValues>({});
  const [saving, setSaving] = useState(false);

  const publicUrl = defaultForm ? `${window.location.origin}/formulario/${defaultForm.id}` : "";

  const ageDistribution = useMemo(() => {
    const peopleField = fields.find(isPeopleCountField);
    const birthField = fields.find(isBirthDatesField);
    if (!peopleField || !birthField) return { total: 0, rows: [] as Array<{ label: string; count: number }> };

    const peopleCount = Math.min(
      100,
      Math.max(0, Math.trunc(Number(values[peopleField.field_key] ?? peopleField.default_value ?? 0) || 0)),
    );
    const dates = birthDateValues(values[birthField.field_key], peopleCount);
    const ages = dates
      .map(calculateAgeFromBirthDate)
      .filter((age): age is number => age !== null);

    return {
      total: ages.length,
      rows: AGE_RANGES.map((range) => ({
        label: range.label,
        count: ages.filter((age) => age >= range.min && age <= range.max).length,
      })),
    };
  }, [fields, values]);

  const validate = () => {
    const peopleField = fields.find(isPeopleCountField);
    const birthField = fields.find(isBirthDatesField);
    const peopleCount = peopleField ? Math.max(0, Math.trunc(Number(values[peopleField.field_key] ?? peopleField.default_value ?? 0) || 0)) : 0;

    for (const field of fields) {
      if (!field.required) continue;

      if (birthField && field.id === birthField.id) {
        if (peopleCount <= 0) {
          toast.error("Informe primeiro a quantidade de pessoas.");
          return false;
        }
        const dates = birthDateValues(values[field.field_key], peopleCount);
        if (dates.some((date) => !date)) {
          toast.error(`Preencha a data de nascimento das ${peopleCount} pessoas.`);
          return false;
        }
        continue;
      }

      const value = values[field.field_key] ?? field.default_value ?? "";
      const empty = Array.isArray(value) ? value.length === 0 : String(value).trim() === "";
      if (empty) {
        toast.error(`Preencha: ${field.label}`);
        return false;
      }
    }

    const email = String(values.email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    const phoneDigits = String(values.telefone ?? "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      toast.error("Informe um telefone válido com DDD.");
      return false;
    }

    const documentDigits = String(values.cnpj ?? "").replace(/\D/g, "");
    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      toast.error("Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.");
      return false;
    }

    return true;
  };

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link público copiado.");
    } catch {
      toast.error("Não foi possível copiar o link automaticamente.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!defaultForm || !validate()) return;
    setSaving(true);

    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      const p = profile as { organization_id: string | null; display_name: string | null } | null;
      if (!p?.organization_id) throw new Error("Organização não configurada.");

      const directPatch: Record<string, unknown> = {
        nome: String(values.nome ?? "").trim(),
        telefone: String(values.telefone ?? "").trim(),
        email: String(values.email ?? "").trim().toLowerCase(),
        empresa: String(values.empresa ?? "").trim(),
        cnpj: String(values.cnpj ?? "").trim(),
      };
      const customFields: Record<string, unknown> = {};

      fields.forEach((field) => {
        const value = values[field.field_key] ?? field.default_value ?? null;
        if (CORE_KEYS.has(field.field_key)) return;
        if (field.maps_to && ["porte_empresa", "departamento", "cargo"].includes(field.maps_to)) {
          directPatch[field.maps_to] = value == null ? "" : String(value);
        } else if (value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "")) {
          customFields[field.field_key] = value;
        }
      });

      if (ageDistribution.rows.length > 0) {
        customFields.distribuicao_faixa_etaria = {
          total: ageDistribution.total,
          faixas: ageDistribution.rows,
        };
      }

      const { data: inserted, error } = await supabase
        .from("leads")
        .insert({
          ...directPatch,
          porte_empresa: String(directPatch.porte_empresa ?? ""),
          departamento: String(directPatch.departamento ?? ""),
          cargo: String(directPatch.cargo ?? ""),
          custom_fields: customFields,
          lead_form_id: defaultForm.id,
          organization_id: p.organization_id,
          owner_id: user.id,
          fonte: "manual",
        } as never)
        .select("id, historico")
        .single();
      if (error) throw error;

      const row = inserted as { id: string; historico?: unknown[] };
      const actor = p.display_name || user.email || "usuário";
      const history = Array.isArray(row.historico) ? row.historico : [];
      const entry = {
        tipo: "manual",
        descricao: `Vida cadastrada manualmente por ${actor} usando o formulário ${defaultForm.name}`,
        data: new Date().toISOString(),
        autor: actor,
      };
      const { error: historyError } = await supabase
        .from("leads")
        .update({ historico: [...history, entry] } as never)
        .eq("id", row.id);
      if (historyError) throw historyError;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["leads-by-pipeline"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-v2-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events"] }),
      ]);

      toast.success("Vidas cadastradas com sucesso!");
      navigate(`/admin/lead/${row.id}`);
    } catch (error) {
      console.error("Erro ao cadastrar vidas:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar vidas.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingForms || loadingFields) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  if (!defaultForm) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-2xl font-display font-bold">Cadastrar Vidas</h1></div>
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Nenhum formulário padrão ativo foi configurado.</p><Button className="mt-4" onClick={() => navigate("/admin/configuracoes?tab=formulario")}>Configurar formulário</Button></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-2xl font-display font-bold">Cadastrar Vidas</h1><p className="text-sm text-muted-foreground">Formulário padrão: {defaultForm.name}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyPublicLink}><Copy className="h-4 w-4 mr-2" />Copiar link público</Button>
          <Button variant="outline" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /></Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Vidas</CardTitle>
            <CardDescription>{defaultForm.description || "Os campos marcados com * são obrigatórios."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <DynamicLeadFormFields
              fields={fields}
              values={values}
              onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
              disabled={saving}
              expandBirthDatesByPeople
            />

            {ageDistribution.total > 0 && (
              <div className="overflow-hidden rounded-xl border bg-background">
                <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Distribuição por faixa etária</h3>
                    <p className="text-sm text-muted-foreground">Atualizada automaticamente conforme as datas de nascimento.</p>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {ageDistribution.total} {ageDistribution.total === 1 ? "vida calculada" : "vidas calculadas"}
                  </div>
                </div>

                <div className="divide-y">
                  {ageDistribution.rows.map((row) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 transition-colors ${row.count > 0 ? "bg-primary/5" : ""}`}
                    >
                      <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-bold tabular-nums ${row.count > 0 ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}>
                        {row.count}
                      </span>
                      <span className={`text-sm font-medium sm:text-base ${row.count > 0 ? "text-primary" : "text-foreground"}`}>
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/leads")}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Cadastrar Vidas</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default NovoLeadPage;
