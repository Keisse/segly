/**
 * Capitalizes each word in a name (first letter uppercase, rest lowercase)
 */
export function capitalizeWords(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Validates that a string contains at least two words (for responsible name validation)
 */
export function hasAtLeastTwoWords(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
}
