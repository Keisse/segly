import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  birthDateValues,
  DynamicLeadFormFields,
  isBirthDatesField,
  isPeopleCountField,
  type LeadFormValues,
} from "@/components/leads/DynamicLeadFormFields";
import type { LeadFormField } from "@/hooks/useLeadFormFields";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PublicFormResponse = {
  form: { id: string; name: string; description: string | null };
  fields: Array<Partial<LeadFormField> & { id: string; field_key: string; label: string; type: LeadFormField["type"]; required: boolean; active: boolean; ordem: number }>;
};

const valueIsEmpty = (value: unknown) => {
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => String(item ?? "").trim() === "");
  return String(value ?? "").trim() === "";
};

export default function PublicLeadFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [data, setData] = useState<PublicFormResponse | null>(null);
  const [values, setValues] = useState<LeadFormValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/public-lead-form?form_id=${encodeURIComponent(formId)}`, {
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Não foi possível carregar o formulário.");
        setData(body as PublicFormResponse);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(err instanceof Error ? err.message : "Não foi possível carregar o formulário.");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [formId]);

  const fields: LeadFormField[] = useMemo(() => (data?.fields ?? []).map((field) => ({
    id: field.id,
    organization_id: "",
    form_id: data?.form.id ?? "",
    field_key: field.field_key,
    label: field.label,
    type: field.type,
    required: field.required,
    active: field.active,
    ordem: field.ordem,
    placeholder: field.placeholder ?? null,
    help_text: field.help_text ?? null,
    default_value: field.default_value ?? null,
    options: Array.isArray(field.options) ? field.options : [],
    validation: {},
    is_system: !!field.is_system,
    maps_to: field.maps_to ?? null,
  })), [data]);

  const validate = () => {
    const peopleField = fields.find(isPeopleCountField);
    const birthField = fields.find(isBirthDatesField);
    const peopleCount = peopleField
      ? Math.max(0, Math.trunc(Number(values[peopleField.field_key] ?? peopleField.default_value ?? 0) || 0))
      : 0;

    for (const field of fields) {
      if (!field.required) continue;

      if (birthField && field.id === birthField.id) {
        if (peopleCount <= 0) return "Informe primeiro a quantidade de pessoas.";
        const dates = birthDateValues(values[field.field_key] ?? field.default_value, peopleCount);
        if (dates.some((date) => !date)) return `Preencha a data de nascimento das ${peopleCount} pessoas.`;
        continue;
      }

      const value = values[field.field_key] ?? field.default_value ?? "";
      if (valueIsEmpty(value)) return `Preencha: ${field.label}`;
    }

    const email = String(values.email ?? fields.find((field) => field.field_key === "email")?.default_value ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido.";

    const phone = String(values.telefone ?? fields.find((field) => field.field_key === "telefone")?.default_value ?? "").replace(/\D/g, "");
    if (phone && (phone.length < 10 || phone.length > 13)) return "Informe um telefone válido com DDD.";

    const document = String(values.cnpj ?? fields.find((field) => field.field_key === "cnpj")?.default_value ?? "").replace(/\D/g, "");
    if (document && document.length !== 11 && document.length !== 14) return "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.";

    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formId || !data) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const answers = Object.fromEntries(fields.map((field) => [
        field.field_key,
        values[field.field_key] ?? field.default_value ?? "",
      ]));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/public-lead-form?form_id=${encodeURIComponent(formId)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar o formulário.");
      setSuccess(true);
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o formulário.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (error && !data) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full"><CardContent className="py-10 text-center"><p className="text-destructive font-medium">{error}</p></CardContent></Card>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="py-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div>
            <h1 className="text-2xl font-semibold">Vidas cadastradas com sucesso</h1>
            <p className="text-muted-foreground mt-2">Recebemos suas informações. Elas já foram adicionadas ao atendimento.</p>
          </div>
          <Button variant="outline" onClick={() => setSuccess(false)}>Cadastrar outras vidas</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 py-6 px-4 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex justify-center">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-border/60">
            <img src="/segly-logo.png" alt="Segly" className="h-11" />
          </div>
        </div>

        <form onSubmit={submit}>
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Heart className="h-5 w-5" />
                <span className="text-sm font-semibold">Segly</span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl">Cadastrar Vidas</CardTitle>
              <CardDescription>{data?.form.description || "Preencha os dados abaixo para cadastrar as vidas do plano de saúde."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DynamicLeadFormFields
                fields={fields}
                values={values}
                onChange={(key, value) => {
                  setError(null);
                  setValues((prev) => ({ ...prev, [key]: value }));
                }}
                disabled={saving}
                expandBirthDatesByPeople
              />

              {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />}
                  Cadastrar Vidas
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
