/** Valor mostrado en formulario, PDF, etc. */
export type TipoPago = "Contado" | "Crédito";

/** Valor persistido en Supabase (CHECK sin acento en Crédito) */
export type TipoPagoDb = "Contado" | "Credito";

export const TIPO_PAGO_UI_CREDITO = "Crédito" as const;
export const TIPO_PAGO_DB_CREDITO = "Credito" as const;

/** Normaliza lecturas de BD al valor de UI */
export function normalizeTipoPago(value: string | null | undefined): TipoPago | null {
  if (!value) return null;
  if (value === TIPO_PAGO_DB_CREDITO || value === TIPO_PAGO_UI_CREDITO) return TIPO_PAGO_UI_CREDITO;
  if (value === "Contado") return "Contado";
  return null;
}

/** Alias explícito para lecturas desde queries */
export const fromDbTipoPago = normalizeTipoPago;

/** Convierte valor de UI (o legado) al formato aceptado por la BD */
export function toDbTipoPago(value: string | TipoPago | null | undefined): TipoPagoDb | null {
  const normalized = normalizeTipoPago(value);
  if (normalized === "Contado") return "Contado";
  if (normalized === TIPO_PAGO_UI_CREDITO) return TIPO_PAGO_DB_CREDITO;
  return null;
}

/** Texto para UI y PDF */
export function formatTipoPago(value: string | null | undefined): string {
  const normalized = normalizeTipoPago(value);
  if (normalized) return normalized;
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
}
