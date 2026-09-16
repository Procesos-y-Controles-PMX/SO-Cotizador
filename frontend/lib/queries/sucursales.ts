import "server-only";

import { createSupabaseServerClient } from "../supabase-server";
import type { CtzSucursal } from "../types/db";
import type { DeleteSucursalResult, SucursalUpdatePatch } from "./sucursales.shared";

export type { DeleteSucursalResult, SucursalMutationError, SucursalUpdatePatch } from "./sucursales.shared";
export { sucursalMutationErrorMessage } from "./sucursales.shared";

/** Cotizador, dashboard y pickers: solo activas. Admin puede pedir inactivas. */
export async function listSucursales(options?: {
  includeInactive?: boolean;
}): Promise<CtzSucursal[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  let query = supabase.from("ctz_sucursales").select("*");
  if (!options?.includeInactive) {
    query = query.eq("activo", true);
  }
  const { data } = await query.order("activo", { ascending: false }).order("nombre");
  return (data as CtzSucursal[] | null) ?? [];
}

export async function updateSucursal(id: string, patch: Partial<SucursalUpdatePatch>): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;
  const { error } = await supabase.from("ctz_sucursales").update(patch).eq("id", id);
  return !error;
}

export async function setSucursalActivo(id: string, activo: boolean): Promise<boolean> {
  return updateSucursal(id, { activo });
}

export async function deleteSucursal(id: string): Promise<DeleteSucursalResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "unknown" };
  const { error } = await supabase.from("ctz_sucursales").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "has_related" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}
