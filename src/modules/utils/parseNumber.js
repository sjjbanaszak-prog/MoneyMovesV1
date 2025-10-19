// utils/parseNumber.js

export function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  // Remove £, commas, and whitespace
  const cleaned = value.replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
