import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhone } from "@/lib/phone";
import type { LeadFormField } from "@/hooks/useLeadFormFields";

export type LeadFormValues = Record<string, unknown>;

export const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const normalizeInputValue = (field: LeadFormField, value: string) => {
  if (field.field_key === "telefone" || field.type === "phone") return formatPhone(value);
  if (field.field_key === "cnpj") return formatCpfCnpj(value);
  return value;
};

const semanticText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

export const isPeopleCountField = (field: LeadFormField) => {
  const key = semanticText(field.field_key).replace(/\s+/g, "_");
  const label = semanticText(field.label);
  return ["quantidade_pessoas", "quantas_pessoas", "numero_pessoas", "qtd_pessoas"].includes(key)
    || label.includes("quantas pessoas")
    || label.includes("quantidade de pessoas");
};

export const isBirthDatesField = (field: LeadFormField) => {
  const key = semanticText(field.field_key).replace(/\s+/g, "_");
  const label = semanticText(field.label);
  return key.includes("data_nascimento_todos")
    || key.includes("datas_nascimento")
    || label.includes("data de nascimento de todos")
    || label.includes("datas de nascimento de todos");
};

const normalizedBirthDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!br) return "";
  return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
};

export const birthDateValues = (value: unknown, count: number) => {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[;,\n]+/).map((item) => item.trim()).filter(Boolean);
  return Array.from({ length: Math.max(0, count) }, (_, index) => normalizedBirthDate(source[index]));
};

const calculateAge = (value: string) => {
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

const localToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function ExpandedBirthDateInputs({
  fieldId,
  count,
  value,
  disabled = false,
  onChange,
}: {
  fieldId: string;
  count: number;
  value: unknown;
  disabled?: boolean;
  onChange: (dates: string[]) => void;
}) {
  const dates = birthDateValues(value, count);
  const maxBirthDate = localToday();

  if (count <= 0) {
    return (
      <div id={fieldId} className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Informe primeiro quantas pessoas serão cadastradas para abrir os campos de data de nascimento.
      </div>
    );
  }

  return (
    <div id={fieldId} className="space-y-2.5 rounded-lg border bg-muted/10 p-3 sm:p-4">
      {dates.map((date, index) => {
        const age = calculateAge(date);
        return (
          <div key={`${fieldId}-${index}`} className="grid gap-2 sm:grid-cols-[72px_minmax(0,240px)_1fr] sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Pessoa {index + 1}</span>
            <Input
              type="date"
              value={date}
              max={maxBirthDate}
              disabled={disabled}
              aria-label={`Data de nascimento da pessoa ${index + 1}`}
              onChange={(event) => {
                const selected = event.target.value;
                if (selected && selected > maxBirthDate) return;
                const next = [...dates];
                next[index] = selected;
                onChange(next);
              }}
            />
            <span className="min-h-5 text-sm font-medium text-foreground">
              {date ? (age === null ? "Data inválida" : `${age} ${age === 1 ? "ano" : "anos"}`) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DynamicLeadFormFields({
  fields,
  values,
  onChange,
  disabled = false,
  expandBirthDatesByPeople = false,
}: {
  fields: LeadFormField[];
  values: LeadFormValues;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
  expandBirthDatesByPeople?: boolean;
}) {
  const peopleCountField = expandBirthDatesByPeople ? fields.find(isPeopleCountField) : undefined;
  const birthDatesField = expandBirthDatesByPeople ? fields.find(isBirthDatesField) : undefined;
  const peopleCount = peopleCountField
    ? Math.min(100, Math.max(0, Math.trunc(Number(values[peopleCountField.field_key] ?? peopleCountField.default_value ?? 0) || 0)))
    : 0;

  const changeField = (field: LeadFormField, nextValue: unknown) => {
    onChange(field.field_key, nextValue);
    if (peopleCountField && birthDatesField && field.id === peopleCountField.id) {
      const nextCount = Math.min(100, Math.max(0, Math.trunc(Number(nextValue) || 0)));
      onChange(birthDatesField.field_key, birthDateValues(values[birthDatesField.field_key], nextCount));
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => {
        const id = `lead-field-${field.id}`;
        const value = values[field.field_key];
        const long = field.type === "long_text";
        const expandedBirthDates = !!birthDatesField && field.id === birthDatesField.id;

        return (
          <div key={field.id} className={long || expandedBirthDates ? "space-y-2 md:col-span-2" : "space-y-2"}>
            <Label htmlFor={id}>
              {field.label}{field.required ? " *" : ""}
            </Label>

            {expandedBirthDates ? (
              <ExpandedBirthDateInputs
                fieldId={id}
                count={peopleCount}
                value={value}
                disabled={disabled}
                onChange={(next) => onChange(field.field_key, next)}
              />
            ) : field.type === "long_text" ? (
              <Textarea
                id={id}
                rows={4}
                value={String(value ?? field.default_value ?? "")}
                placeholder={field.placeholder ?? undefined}
                disabled={disabled}
                onChange={(event) => changeField(field, event.target.value)}
              />
            ) : field.type === "select" ? (
              <Select
                value={String(value ?? field.default_value ?? "")}
                disabled={disabled}
                onValueChange={(next) => changeField(field, next)}
              >
                <SelectTrigger id={id}><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : field.type === "multiselect" ? (
              <div id={id} className="h-10 flex items-center">
                {(field.options ?? []).length === 0 ? (
                  <Input
                    value={String(value ?? "")}
                    placeholder={field.placeholder ?? undefined}
                    disabled={disabled}
                    onChange={(event) => changeField(field, event.target.value)}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {(field.options ?? []).map((option) => {
                      const current = Array.isArray(value)
                        ? String(value[0] ?? "")
                        : String(value ?? field.default_value ?? "");
                      const checked = current === option;
                      return (
                        <label key={option} className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="radio"
                            name={`choice-${field.id}`}
                            value={option}
                            checked={checked}
                            disabled={disabled}
                            className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                            onChange={() => changeField(field, option)}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : field.type === "checkbox" ? (
              <label id={id} className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={disabled}
                  onChange={(event) => changeField(field, event.target.checked)}
                />
                <span className="text-sm">Sim</span>
              </label>
            ) : (
              <Input
                id={id}
                type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
                inputMode={field.field_key === "cnpj" ? "numeric" : undefined}
                min={peopleCountField && field.id === peopleCountField.id ? 1 : undefined}
                max={peopleCountField && field.id === peopleCountField.id ? 100 : undefined}
                step={peopleCountField && field.id === peopleCountField.id ? 1 : undefined}
                value={String(value ?? field.default_value ?? "")}
                placeholder={field.placeholder ?? undefined}
                disabled={disabled}
                onChange={(event) => changeField(field, normalizeInputValue(field, event.target.value))}
              />
            )}

            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );
      })}
    </div>
  );
}
