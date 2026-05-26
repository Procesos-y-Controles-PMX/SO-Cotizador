/** Valor canónico guardado en cotizaciones nuevas/actualizadas */
export type TipoPago = "Contado" | "Crédito";

const LEGACY_CREDITO = "Credito";

/** Normaliza lecturas de BD (p. ej. "Credito" sin acento) al valor canónico */
export function normalizeTipoPago(value: string | null | undefined): TipoPago | null {
  if (!value) return null;
  if (value === LEGACY_CREDITO || value === "Crédito") return "Crédito";
  if (value === "Contado") return "Contado";
  return null;
}

/** Texto para UI y PDF */
export function formatTipoPago(value: string | null | undefined): string {
  const normalized = normalizeTipoPago(value);
  if (normalized) return normalized;
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
}
