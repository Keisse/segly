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

export function DynamicLeadFormFields({
  fields,
  values,
  onChange,
  disabled = false,
}: {
  fields: LeadFormField[];
  values: LeadFormValues;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => {
        const id = `lead-field-${field.id}`;
        const value = values[field.field_key];
        const long = field.type === "long_text";

        return (
          <div key={field.id} className={long ? "space-y-2 md:col-span-2" : "space-y-2"}>
            <Label htmlFor={id}>
              {field.label}{field.required ? " *" : ""}
            </Label>

            {field.type === "long_text" ? (
              <Textarea
                id={id}
                rows={4}
                value={String(value ?? field.default_value ?? "")}
                placeholder={field.placeholder ?? undefined}
                disabled={disabled}
                onChange={(event) => onChange(field.field_key, event.target.value)}
              />
            ) : field.type === "select" ? (
              <Select
                value={String(value ?? field.default_value ?? "")}
                disabled={disabled}
                onValueChange={(next) => onChange(field.field_key, next)}
              >
                <SelectTrigger id={id}><SelectValue placeholder={field.placeholder ?? "Selecione..."} /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : field.type === "multiselect" ? (
              <div id={id} className="rounded-md border border-border p-3 space-y-2">
                {(field.options ?? []).length === 0 ? (
                  <Input
                    value={String(value ?? "")}
                    placeholder={field.placeholder ?? undefined}
                    disabled={disabled}
                    onChange={(event) => onChange(field.field_key, event.target.value)}
                  />
                ) : (field.options ?? []).map((option) => {
                  const current = Array.isArray(value) ? value.map(String) : [];
                  const checked = current.includes(option);
                  return (
                    <label key={option} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...current, option]
                            : current.filter((item) => item !== option);
                          onChange(field.field_key, next);
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : field.type === "checkbox" ? (
              <label id={id} className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={disabled}
                  onChange={(event) => onChange(field.field_key, event.target.checked)}
                />
                <span className="text-sm">Sim</span>
              </label>
            ) : (
              <Input
                id={id}
                type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
                inputMode={field.field_key === "cnpj" ? "numeric" : undefined}
                value={String(value ?? field.default_value ?? "")}
                placeholder={field.placeholder ?? undefined}
                disabled={disabled}
                onChange={(event) => onChange(field.field_key, normalizeInputValue(field, event.target.value))}
              />
            )}

            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );
      })}
    </div>
  );
}
