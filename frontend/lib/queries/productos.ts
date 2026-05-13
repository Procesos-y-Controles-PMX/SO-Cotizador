import { supabase } from "../supabase";
import type { CtzProducto } from "../types/db";

const PAGE_SIZE = 1000;

const INVENTARIO_INITIAL_LIMIT = 10;
const INVENTARIO_SEARCH_LIMIT = 50;
/** Mínimo de caracteres para disparar búsqueda (reduce escaneos con términos de 1 letra). */
export const INVENTARIO_SEARCH_MIN_CHARS = 2;

const INVENTARIO_SELECT = "id,sku,descripcion,unidad_medida,precio_unitario_base,activo,created_at";

/** Patrón ILIKE: se eliminan comas (rompen `.or()`), % y _ del término para evitar comodines arbitrarios. */
function inventarioIlikePattern(raw: string): string | null {
  const core = raw.replace(/,/g, " ").replace(/%/g, "").replace(/_/g, "").trim();
  if (!core) return null;
  return `%${core}%`;
}

/**
 * Lista para la pantalla de inventario (activos e inactivos): sin texto, los primeros N por descripción;
 * con texto (≥ {@link INVENTARIO_SEARCH_MIN_CHARS}), búsqueda server-side por SKU, descripción, U.M.
 * y coincidencia exacta de precio base si el término es solo numérico.
 */
export async function listInventarioProductos(q: string): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const trimmed = q.trim();
  if (!trimmed) {
    const { data, error } = await supabase
      .from("ctz_productos")
      .select(INVENTARIO_SELECT)
      .order("activo", { ascending: false })
      .order("descripcion")
      .limit(INVENTARIO_INITIAL_LIMIT);
    if (error) return [];
    return (data as CtzProducto[] | null) ?? [];
  }
  if (trimmed.length < INVENTARIO_SEARCH_MIN_CHARS) {
    return [];
  }

  const pattern = inventarioIlikePattern(trimmed);
  const parts: string[] = [];
  if (pattern) {
    parts.push(`sku.ilike.${pattern}`, `descripcion.ilike.${pattern}`, `unidad_medida.ilike.${pattern}`);
  }

  const numCandidate = trimmed.replace(/\s/g, "").replace(/,/g, ".");
  if (/^\d+(\.\d+)?$/.test(numCandidate)) {
    const n = Number.parseFloat(numCandidate);
    if (Number.isFinite(n) && n >= 0) {
      parts.push(`precio_unitario_base.eq.${n}`);
    }
  }

  if (!parts.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("ctz_productos")
    .select(INVENTARIO_SELECT)
    .or(parts.join(","))
    .order("activo", { ascending: false })
    .order("descripcion")
    .limit(INVENTARIO_SEARCH_LIMIT);

  if (error) return [];
  return (data as CtzProducto[] | null) ?? [];
}

/** Todos los productos activos (paginado). Para cotizador e import Excel por SKU. */
export async function listAllProductosActivos(): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const all: CtzProducto[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ctz_productos")
      .select("*")
      .eq("activo", true)
      .order("descripcion")
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    const batch = (data as CtzProducto[] | null) ?? [];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function createProducto(payload: {
  sku?: string;
  descripcion: string;
  unidad_medida?: string;
  precio_unitario_base: number;
}): Promise<CtzProducto | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("ctz_productos")
    .insert({
      sku: payload.sku || null,
      descripcion: payload.descripcion,
      unidad_medida: payload.unidad_medida || null,
      precio_unitario_base: payload.precio_unitario_base,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as CtzProducto;
}

export async function updateProducto(
  id: string,
  payload: Partial<Pick<CtzProducto, "sku" | "descripcion" | "unidad_medida" | "precio_unitario_base" | "activo">>
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("ctz_productos").update(payload).eq("id", id);
  return !error;
}
