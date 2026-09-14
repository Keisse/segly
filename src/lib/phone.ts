export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  // Aceita números brasileiros com ou sem +55.
  if (digits.startsWith("55") && digits.length > 11) {
    const local = digits.slice(2, 13);
    return `+55 ${formatLocalPhone(local)}`;
  }

  return formatLocalPhone(digits.slice(0, 11));
}

function formatLocalPhone(digits: string): string {
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) return `(${ddd}) ${number}`;

  if (number.length <= 8) {
    return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  }

  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}
