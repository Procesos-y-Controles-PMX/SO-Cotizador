import { ilikePattern, SEARCH_MIN_CHARS, SEARCH_RESULT_LIMIT, stripAccents } from "../search";
import { supabase } from "../supabase";
import type { CtzProducto } from "../types/db";

const PAGE_SIZE = 1000;

const INVENTARIO_INITIAL_LIMIT = 10;
/** Cuántos productos escanear para elegir los 10 iniciales con descripción textual. */
const INVENTARIO_INITIAL_SCAN = 800;
const INVENTARIO_SEARCH_LIMIT = SEARCH_RESULT_LIMIT;

/** true si la descripción incluye al menos una letra (no solo números/símbolos). */
function descripcionPareceTexto(descripcion: string): boolean {
  const plain = stripAccents(descripcion.trim());
  return /[a-zA-Z]/.test(plain);
}

async function listInventarioProductosIniciales(): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ctz_productos")
    .select(INVENTARIO_SELECT)
    .order("activo", { ascending: false })
    .order("descripcion")
    .limit(INVENTARIO_INITIAL_SCAN);
  if (error) return [];
  const rows = (data as CtzProducto[] | null) ?? [];
  const conTexto = rows.filter((p) => descripcionPareceTexto(p.descripcion));
  return conTexto.slice(0, INVENTARIO_INITIAL_LIMIT);
}
/** Mínimo de caracteres para disparar búsqueda (reduce escaneos con términos de 1 letra). */
export const INVENTARIO_SEARCH_MIN_CHARS = SEARCH_MIN_CHARS;

const INVENTARIO_SELECT = "id,sku,descripcion,unidad_medida,precio_unitario_base,activo,created_at";

function inventarioIlikePattern(raw: string): string | null {
  return ilikePattern(raw);
}

/**
 * Lista para la pantalla de inventario (activos e inactivos): sin texto, los primeros N con descripción textual;
 * con texto (≥ {@link INVENTARIO_SEARCH_MIN_CHARS}), búsqueda server-side por SKU, descripción, U.M.
 * y coincidencia exacta de precio base si el término es solo numérico.
 */
export async function listInventarioProductos(q: string): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const trimmed = q.trim();
  if (!trimmed) {
    return listInventarioProductosIniciales();
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

const COTIZACION_PRODUCTO_SELECT =
  "id,sku,descripcion,unidad_medida,precio_unitario_base,activo,created_at";

async function searchProductosActivos(field: "sku" | "descripcion", q: string): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const trimmed = q.trim();
  if (trimmed.length < SEARCH_MIN_CHARS) return [];
  const pattern = ilikePattern(trimmed);
  if (!pattern) return [];

  const { data, error } = await supabase
    .from("ctz_productos")
    .select(COTIZACION_PRODUCTO_SELECT)
    .eq("activo", true)
    .ilike(field, pattern)
    .order("descripcion")
    .limit(SEARCH_RESULT_LIMIT);

  if (error) return [];
  return (data as CtzProducto[] | null) ?? [];
}

export function searchProductosActivosPorSku(q: string): Promise<CtzProducto[]> {
  return searchProductosActivos("sku", q);
}

export function searchProductosActivosPorDescripcion(q: string): Promise<CtzProducto[]> {
  return searchProductosActivos("descripcion", q);
}

export async function getProductoById(id: string): Promise<CtzProducto | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("ctz_productos").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as CtzProducto | null) ?? null;
}

export async function getProductosByIds(ids: string[]): Promise<CtzProducto[]> {
  if (!supabase || !ids.length) return [];
  const unique = [...new Set(ids)];
  const all: CtzProducto[] = [];
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("ctz_productos").select("*").in("id", chunk);
    if (error) break;
    const batch = (data as CtzProducto[] | null) ?? [];
    all.push(...batch);
  }
  return all;
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
