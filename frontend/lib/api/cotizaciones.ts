import type { PaginatedResult } from "../pagination";
import type { CtzCotizacion, CtzUsuario } from "../types/db";
import type {
  CotizacionWithRelations,
  CreateCotizacionResult,
  ProductoInput,
  UpdateVentaCerradaResult,
} from "../queries/cotizaciones.shared";
import { apiGet, apiSend } from "./http";

export type {
  CotizacionWithRelations,
  CreateCotizacionError,
  CreateCotizacionResult,
  ProductoInput,
  UpdateVentaCerradaResult,
} from "../queries/cotizaciones.shared";
export { toProductoInput } from "../queries/cotizaciones.shared";

export async function listCotizaciones(
  user: CtzUsuario,
  search?: string,
  options?: { unlimited: true }
): Promise<CotizacionWithRelations[]>;
export async function listCotizaciones(
  user: CtzUsuario,
  search?: string,
  options?: { page?: number; pageSize?: number }
): Promise<PaginatedResult<CotizacionWithRelations>>;
export async function listCotizaciones(
  _user: CtzUsuario,
  search = "",
  options?: { unlimited?: boolean; page?: number; pageSize?: number }
): Promise<CotizacionWithRelations[] | PaginatedResult<CotizacionWithRelations>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (options?.unlimited) params.set("unlimited", "1");
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  const path = `/api/cotizaciones${params.size ? `?${params.toString()}` : ""}`;
  if (options?.unlimited) {
    return apiGet<CotizacionWithRelations[]>(path, []);
  }
  return apiGet<PaginatedResult<CotizacionWithRelations>>(path, { rows: [], total: 0 });
}

export async function getCotizacionById(id: string): Promise<CotizacionWithRelations | null> {
  return apiGet<CotizacionWithRelations | null>(`/api/cotizaciones/${id}`, null);
}

export async function createCotizacion(payload: {
  cotizacion: Omit<CtzCotizacion, "id" | "created_at" | "updated_at">;
  productos: ProductoInput[];
}): Promise<CreateCotizacionResult> {
  return apiSend<CreateCotizacionResult>("/api/cotizaciones", { op: "create", payload }, {
    ok: false,
    error: "unknown",
  });
}

export async function updateCotizacion(
  id: string,
  payload: Partial<CtzCotizacion>,
  productos: ProductoInput[]
): Promise<boolean> {
  const result = await apiSend<{ ok: boolean }>(`/api/cotizaciones/${id}`, {
    op: "update",
    payload,
    productos,
  }, { ok: false });
  return result.ok;
}

export async function deleteCotizacion(id: string): Promise<boolean> {
  const result = await apiSend<{ ok: boolean }>(`/api/cotizaciones/${id}`, { op: "delete" }, {
    ok: false,
  });
  return result.ok;
}

export async function updateVentaCerradaCotizacion(
  _user: CtzUsuario,
  id: string,
  ventaCerrada: boolean
): Promise<UpdateVentaCerradaResult> {
  return apiSend<UpdateVentaCerradaResult>(`/api/cotizaciones/${id}`, {
    op: "venta_cerrada",
    ventaCerrada,
  }, { ok: false, error: "unknown" });
}
