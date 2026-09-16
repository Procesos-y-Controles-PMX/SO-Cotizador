import type { CtzSucursal } from "../types/db";

export type SucursalUpdatePatch = Pick<
  CtzSucursal,
  "terminos_adicionales" | "direccion" | "ciudad" | "activo"
>;

export type DeleteSucursalResult =
  | { ok: true }
  | { ok: false; error: "has_related" | "unknown" };

export type SucursalMutationError = "has_related" | "unknown";

export function sucursalMutationErrorMessage(error: SucursalMutationError): string {
  switch (error) {
    case "has_related":
      return "No se puede borrar: la sucursal tiene clientes o cotizaciones. Desactívala en su lugar.";
    default:
      return "No se pudo completar la operación.";
  }
}
