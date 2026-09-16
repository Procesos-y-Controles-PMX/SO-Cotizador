import type { CtzObra } from "../types/db";
import type { CreateObraResult } from "../queries/obras.shared";
import { apiGet, apiSend } from "./http";

export type { CreateObraResult } from "../queries/obras.shared";
export { obraLabelCotizacion, obraNombreCotizacion, obraToOption } from "../queries/obras.shared";

export async function listObras(search: string, idCliente: string): Promise<CtzObra[]> {
  if (!idCliente) return [];
  const params = new URLSearchParams({ idCliente });
  if (search) params.set("search", search);
  return apiGet<CtzObra[]>(`/api/obras?${params.toString()}`, []);
}

export async function getObraById(id: string): Promise<CtzObra | null> {
  return apiGet<CtzObra | null>(`/api/obras?id=${encodeURIComponent(id)}`, null);
}

export async function createObra(payload: {
  id_cliente: string;
  nombre_obra: string;
  num_obra?: string;
  referencia_pago?: string;
}): Promise<CreateObraResult> {
  return apiSend<CreateObraResult>("/api/obras", { op: "create", payload }, {
    ok: false,
    error: "unknown",
  });
}
