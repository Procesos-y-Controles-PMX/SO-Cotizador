import { supabase } from "../supabase";
import type { CtzSucursal } from "../types/db";

export type SucursalUpdatePatch = Pick<CtzSucursal, "terminos_adicionales" | "direccion" | "ciudad">;

export async function listSucursales(): Promise<CtzSucursal[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("ctz_sucursales")
    .select("*")
    .eq("activo", true)
    .order("nombre");
  return (data as CtzSucursal[] | null) ?? [];
}

export async function updateSucursal(id: string, patch: Partial<SucursalUpdatePatch>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("ctz_sucursales").update(patch).eq("id", id);
  return !error;
}

