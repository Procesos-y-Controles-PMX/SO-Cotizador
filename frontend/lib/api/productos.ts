import type { CtzProducto } from "../types/db";
import type { ProductoBulkInsertRow } from "../queries/productos.shared";
import { apiGet, apiSend } from "./http";

export { INVENTARIO_SEARCH_MIN_CHARS } from "../queries/productos.shared";
export type { ProductoBulkInsertRow } from "../queries/productos.shared";

export async function listInventarioProductos(q: string): Promise<CtzProducto[]> {
  const params = new URLSearchParams({ op: "inventario", q });
  return apiGet<CtzProducto[]>(`/api/productos?${params.toString()}`, []);
}

export async function searchProductosActivosPorSku(q: string): Promise<CtzProducto[]> {
  const params = new URLSearchParams({ op: "search-sku", q });
  return apiGet<CtzProducto[]>(`/api/productos?${params.toString()}`, []);
}

export async function searchProductosActivosPorDescripcion(q: string): Promise<CtzProducto[]> {
  const params = new URLSearchParams({ op: "search-descripcion", q });
  return apiGet<CtzProducto[]>(`/api/productos?${params.toString()}`, []);
}

export async function getProductoById(id: string): Promise<CtzProducto | null> {
  return apiGet<CtzProducto | null>(`/api/productos?op=get&id=${encodeURIComponent(id)}`, null);
}

export async function getProductosByIds(ids: string[]): Promise<CtzProducto[]> {
  if (!ids.length) return [];
  return apiSend<CtzProducto[]>("/api/productos", { op: "by-ids", ids }, []);
}

export async function listAllProductosActivos(): Promise<CtzProducto[]> {
  return apiGet<CtzProducto[]>("/api/productos?op=all-activos", []);
}

export async function listAllProductos(): Promise<CtzProducto[]> {
  return apiGet<CtzProducto[]>("/api/productos?op=all", []);
}

export async function getExistingProductoSkus(): Promise<Set<string>> {
  const skus = await apiGet<string[]>("/api/productos?op=skus", []);
  return new Set(skus);
}

export async function createProductosBulk(
  rows: ProductoBulkInsertRow[]
): Promise<{ inserted: number; failed: number }> {
  return apiSend<{ inserted: number; failed: number }>("/api/productos", { op: "bulk", rows }, {
    inserted: 0,
    failed: rows.length,
  });
}

export async function createProducto(payload: {
  sku?: string;
  descripcion: string;
  unidad_medida?: string;
  precio_unitario_base?: number;
}): Promise<CtzProducto | null> {
  return apiSend<CtzProducto | null>("/api/productos", { op: "create", payload }, null);
}

export async function updateProducto(
  id: string,
  payload: Partial<Pick<CtzProducto, "sku" | "descripcion" | "unidad_medida" | "precio_unitario_base" | "activo">>
): Promise<boolean> {
  const result = await apiSend<{ ok: boolean }>("/api/productos", { op: "update", id, payload }, {
    ok: false,
  });
  return result.ok;
}
