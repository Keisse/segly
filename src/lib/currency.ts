export function parseCurrencyBRL(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const clean = raw.replace(/\s/g, "").replace(/R\$/gi, "");
  let normalized = clean;

  if (clean.includes(",") && clean.includes(".")) {
    normalized = clean.lastIndexOf(",") > clean.lastIndexOf(".")
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(/,/g, "");
  } else if (clean.includes(",")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrencyBRL(value: unknown, emptyValue = "") {
  const parsed = parseCurrencyBRL(value);
  if (!parsed && (value === "" || value === null || value === undefined)) return emptyValue;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function maskCurrencyBRLInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents);
}

function normalizeSemantic(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const MONEY_FIELD_KEYS = new Set([
  "valor_medio_fatura",
  "valor_apresentado",
  "valor_fechado",
  "valor_final_fechado",
  "valor_negociado",
  "negotiated_value",
  "premio",
]);

export function isMoneyField(fieldKey: unknown, _label?: unknown) {
  return MONEY_FIELD_KEYS.has(normalizeSemantic(fieldKey));
}
