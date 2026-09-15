import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicLeadFormFields, type LeadFormValues } from "@/components/leads/DynamicLeadFormFields";
import type { LeadFormField } from "@/hooks/useLeadFormFields";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PublicFormResponse = {
  form: { id: string; name: string; description: string | null };
  fields: Array<Partial<LeadFormField> & { id: string; field_key: string; label: string; type: LeadFormField["type"]; required: boolean; active: boolean; ordem: number }>;
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

  const fields: LeadFormField[] = (data?.fields ?? []).map((field) => ({
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
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formId || !data) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/public-lead-form?form_id=${encodeURIComponent(formId)}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: values }),
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
          <div><h1 className="text-2xl font-semibold">Dados enviados com sucesso</h1><p className="text-muted-foreground mt-2">Recebemos suas informações. Elas já foram adicionadas ao atendimento.</p></div>
          <Button variant="outline" onClick={() => setSuccess(false)}>Enviar outra resposta</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-6"><img src="/segly-logo.png" alt="Segly" className="h-10" /></div>
        <form onSubmit={submit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{data?.form.name}</CardTitle>
              <CardDescription>{data?.form.description || "Preencha os dados abaixo para continuar."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DynamicLeadFormFields fields={fields} values={values} onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))} disabled={saving} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar</Button></div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
