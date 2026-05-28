import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Moneda MXN con separador de miles (coma) y 2 decimales, p. ej. $1,234.56 */
export function money(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Permite dígitos y un separador decimal (`.` o `,`) mientras se escribe. */
export const DECIMAL_INPUT_DRAFT_RE = /^\d*[.,]?\d*$/;

/** Parsea texto con punto o coma decimal; `null` si vacío o inválido. */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed || trimmed === ".") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function roundToDecimals(value: number, decimals = 2): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** Cantidad para BD (DECIMAL 12,2): redondeo a 2 decimales. */
export function roundQuantity(value: number): number {
  return roundToDecimals(value, 2);
}

/** Valor mostrado en input de cantidad (vacío si ≤ 0). */
export function formatCantidadDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(value);
}

/** Cantidad con separador de miles (coma), p. ej. 1,234.5 */
export function formatQuantity(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

