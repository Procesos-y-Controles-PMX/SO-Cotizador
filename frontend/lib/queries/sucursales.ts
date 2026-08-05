import { supabase } from "../supabase";
import type { CtzSucursal } from "../types/db";

export type SucursalUpdatePatch = Pick<
  CtzSucursal,
  "terminos_adicionales" | "direccion" | "ciudad" | "activo"
>;

export type DeleteSucursalResult =
  | { ok: true }
  | { ok: false; error: "has_related" | "unknown" };

export type SucursalMutationError = "has_related" | "unknown";

/** Cotizador, dashboard y pickers: solo activas. Admin puede pedir inactivas. */
export async function listSucursales(options?: {
  includeInactive?: boolean;
}): Promise<CtzSucursal[]> {
  if (!supabase) return [];
  let query = supabase.from("ctz_sucursales").select("*");
  if (!options?.includeInactive) {
    query = query.eq("activo", true);
  }
  const { data } = await query.order("activo", { ascending: false }).order("nombre");
  return (data as CtzSucursal[] | null) ?? [];
}

export async function updateSucursal(id: string, patch: Partial<SucursalUpdatePatch>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("ctz_sucursales").update(patch).eq("id", id);
  return !error;
}

export async function setSucursalActivo(id: string, activo: boolean): Promise<boolean> {
  return updateSucursal(id, { activo });
}

export async function deleteSucursal(id: string): Promise<DeleteSucursalResult> {
  if (!supabase) return { ok: false, error: "unknown" };
  const { error } = await supabase.from("ctz_sucursales").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "has_related" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}

export function sucursalMutationErrorMessage(error: SucursalMutationError): string {
  switch (error) {
    case "has_related":
      return "No se puede borrar: la sucursal tiene clientes o cotizaciones. Desactívala en su lugar.";
    default:
      return "No se pudo completar la operación.";
  }
}
