import { supabase } from "../supabase";
import type { CtzProducto } from "../types/db";

const PAGE_SIZE = 1000;

export async function listProductos(search = ""): Promise<CtzProducto[]> {
  if (!supabase) return [];
  const query = supabase.from("ctz_productos").select("*").eq("activo", true).order("descripcion");
  if (!search.trim()) {
    const { data } = await query.limit(100);
    return (data as CtzProducto[] | null) ?? [];
  }
  const term = `%${search.trim()}%`;
  const { data } = await query.or(`descripcion.ilike.${term},sku.ilike.${term}`).limit(100);
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
