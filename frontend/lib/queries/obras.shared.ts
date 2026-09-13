import type { SearchComboboxOption } from "@/components/ui/SearchCombobox";
import type { CtzObra } from "../types/db";

export type CreateObraResult =
  | { ok: true; obra: CtzObra }
  | { ok: false; error: "duplicate" | "unknown" };

export function obraToOption(obra: CtzObra): SearchComboboxOption {
  const num = obra.num_obra?.trim();
  const label = `${num || "-"} ${obra.nombre_obra}`;
  return { id: obra.id, label, sublabel: obra.referencia_pago ?? undefined };
}

export function obraNombreCotizacion(cotizacion: {
  nombre_obra: string | null;
  ctz_obras?: { nombre_obra: string } | null;
}): string {
  return cotizacion.ctz_obras?.nombre_obra ?? cotizacion.nombre_obra ?? "-";
}

export function obraLabelCotizacion(cotizacion: {
  nombre_obra: string | null;
  ctz_obras?: { nombre_obra: string; num_obra: string | null } | null;
}): string {
  const nombre = cotizacion.ctz_obras?.nombre_obra ?? cotizacion.nombre_obra;
  if (!nombre) return "-";
  const num = cotizacion.ctz_obras?.num_obra?.trim();
  return `${num || "-"} ${nombre}`;
}
