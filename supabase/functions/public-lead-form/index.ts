import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const coreKeys = ["empresa", "cnpj", "nome", "telefone", "email"] as const;
const directKeys = new Set(["empresa", "cnpj", "nome", "telefone", "email"]);
const allowedMappedColumns = new Set(["porte_empresa", "departamento", "cargo"]);

const clean = (value: unknown, max = 5000) => String(value ?? "").trim().slice(0, max);

const isEmpty = (value: unknown) => {
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => clean(item) === "");
  return clean(value) === "";
};

const semanticText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const isPeopleCountField = (field: { field_key: string; label: string }) => {
  const key = semanticText(field.field_key).replace(/\s+/g, "_");
  const label = semanticText(field.label);
  return ["quantidade_pessoas", "quantas_pessoas", "numero_pessoas", "qtd_pessoas"].includes(key)
    || label.includes("quantas pessoas")
    || label.includes("quantidade de pessoas");
};

const isBirthDatesField = (field: { field_key: string; label: string }) => {
  const key = semanticText(field.field_key).replace(/\s+/g, "_");
  const label = semanticText(field.label);
  return key.includes("data_nascimento_todos")
    || key.includes("datas_nascimento")
    || label.includes("data de nascimento de todos")
    || label.includes("datas de nascimento de todos");
};

const normalizedBirthDate = (value: unknown) => {
  const raw = clean(value, 20);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!br) return "";
  return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
};

const normalizeBirthDates = (value: unknown, count: number) => {
  const source = Array.isArray(value)
    ? value
    : clean(value).split(/[;,\n]+/).map((item) => item.trim()).filter(Boolean);
  return Array.from({ length: Math.max(0, count) }, (_, index) => normalizedBirthDate(source[index]));
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const formId = url.searchParams.get("form_id") || "";
  if (!formId) return json({ error: "Formulário inválido." }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: form, error: formError } = await supabase
    .from("lead_forms")
    .select("id,organization_id,name,description,active")
    .eq("id", formId)
    .maybeSingle();

  if (formError || !form || !form.active) return json({ error: "Formulário não encontrado ou inativo." }, 404);

  const { data: fields, error: fieldsError } = await supabase
    .from("lead_form_fields")
    .select("id,field_key,label,type,required,active,ordem,placeholder,help_text,default_value,options,is_system,maps_to")
    .eq("form_id", formId)
    .eq("active", true)
    .order("ordem");

  if (fieldsError) return json({ error: "Não foi possível carregar o formulário." }, 500);

  if (req.method === "GET") {
    return json({ form: { id: form.id, name: form.name, description: form.description }, fields: fields ?? [] });
  }

  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 100_000) return json({ error: "Dados enviados excedem o limite permitido." }, 413);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dados inválidos." }, 400);
  }

  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const activeFields = fields ?? [];

  for (const key of coreKeys) {
    if (!clean(answers[key])) return json({ error: `Campo obrigatório não preenchido: ${key}.` }, 400);
  }

  const peopleField = activeFields.find(isPeopleCountField);
  const birthField = activeFields.find(isBirthDatesField);
  const peopleCount = peopleField
    ? Math.min(100, Math.max(0, Math.trunc(Number(answers[peopleField.field_key] ?? peopleField.default_value ?? 0) || 0)))
    : 0;

  for (const field of activeFields) {
    const rawValue = answers[field.field_key] ?? field.default_value ?? "";

    if (field.required && birthField && field.id === birthField.id) {
      if (peopleCount <= 0) return json({ error: "Informe primeiro a quantidade de pessoas." }, 400);
      const dates = normalizeBirthDates(rawValue, peopleCount);
      if (dates.some((date) => !date)) return json({ error: `Preencha a data de nascimento das ${peopleCount} pessoas.` }, 400);
      continue;
    }

    if (field.required && isEmpty(rawValue)) return json({ error: `Preencha: ${field.label}.` }, 400);
  }

  const email = clean(answers.email, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);

  const phoneDigits = clean(answers.telefone, 30).replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 13) return json({ error: "Telefone inválido." }, 400);

  const docDigits = clean(answers.cnpj, 30).replace(/\D/g, "");
  if (docDigits.length !== 11 && docDigits.length !== 14) return json({ error: "CPF/CNPJ inválido." }, 400);

  const customFields: Record<string, unknown> = {};
  const leadData: Record<string, unknown> = {
    organization_id: form.organization_id,
    lead_form_id: form.id,
    nome: clean(answers.nome, 100),
    telefone: clean(answers.telefone, 30),
    email,
    empresa: clean(answers.empresa, 200),
    cnpj: clean(answers.cnpj, 30),
    porte_empresa: "",
    departamento: "",
    cargo: "",
    fonte: "form_publico",
    custom_fields: customFields,
  };

  for (const field of activeFields) {
    if (directKeys.has(field.field_key)) continue;
    let value = answers[field.field_key] ?? field.default_value ?? null;

    if (birthField && field.id === birthField.id) {
      value = normalizeBirthDates(value, peopleCount);
    }

    if (field.maps_to && allowedMappedColumns.has(field.maps_to)) {
      leadData[field.maps_to] = value == null ? "" : clean(value);
      continue;
    }

    if (!isEmpty(value)) customFields[field.field_key] = value;
  }

  const { data: settings } = await supabase
    .from("organization_settings")
    .select("default_lead_owner")
    .eq("organization_id", form.organization_id)
    .maybeSingle();

  if (settings?.default_lead_owner) leadData.owner_id = settings.default_lead_owner;

  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert(leadData)
    .select("id")
    .single();

  if (insertError) {
    console.error(insertError);
    return json({ error: "Não foi possível enviar o formulário." }, 500);
  }

  return json({ success: true, lead_id: inserted.id }, 201);
});
