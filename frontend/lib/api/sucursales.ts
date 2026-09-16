import type { CtzSucursal } from "../types/db";
import type { DeleteSucursalResult, SucursalUpdatePatch } from "../queries/sucursales.shared";
import { apiGet, apiSend } from "./http";

export type { DeleteSucursalResult, SucursalMutationError, SucursalUpdatePatch } from "../queries/sucursales.shared";
export { sucursalMutationErrorMessage } from "../queries/sucursales.shared";

export async function listSucursales(options?: {
  includeInactive?: boolean;
}): Promise<CtzSucursal[]> {
  const params = new URLSearchParams();
  if (options?.includeInactive) params.set("includeInactive", "1");
  const suffix = params.size ? `?${params.toString()}` : "";
  return apiGet<CtzSucursal[]>(`/api/sucursales${suffix}`, []);
}

export async function updateSucursal(id: string, patch: Partial<SucursalUpdatePatch>): Promise<boolean> {
  const result = await apiSend<{ ok: boolean }>("/api/sucursales", { op: "update", id, patch }, {
    ok: false,
  });
  return result.ok;
}

export async function setSucursalActivo(id: string, activo: boolean): Promise<boolean> {
  return updateSucursal(id, { activo });
}

export async function deleteSucursal(id: string): Promise<DeleteSucursalResult> {
  return apiSend<DeleteSucursalResult>("/api/sucursales", { op: "delete", id }, {
    ok: false,
    error: "unknown",
  });
}
