/** Debounce y mínimo de caracteres alineados con inventario / cotización. */
export const SEARCH_DEBOUNCE_MS = 350;
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_RESULT_LIMIT = 50;

/** Patrón ILIKE seguro para PostgREST (evita comas y comodines arbitrarios). */
export function ilikePattern(raw: string): string | null {
  const core = raw.replace(/,/g, " ").replace(/%/g, "").replace(/_/g, "").trim();
  if (!core) return null;
  return `%${core}%`;
}
