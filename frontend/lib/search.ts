/** Debounce y mínimo de caracteres alineados con inventario / cotización. */
export const SEARCH_DEBOUNCE_MS = 350;
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_RESULT_LIMIT = 50;

/** Quita diacríticos para búsquedas insensibles a acentos (Mérida ~ merida). */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeForSearch(s: string): string {
  return stripAccents(s).toLowerCase().trim();
}

/** true si `text` contiene `query` ignorando acentos y mayúsculas. */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(text).includes(q);
}

/** Patrón ILIKE seguro para PostgREST (evita comas y comodines arbitrarios). */
export function ilikePattern(raw: string): string | null {
  const core = raw.replace(/,/g, " ").replace(/%/g, "").replace(/_/g, "").trim();
  if (!core) return null;
  return `%${core}%`;
}
