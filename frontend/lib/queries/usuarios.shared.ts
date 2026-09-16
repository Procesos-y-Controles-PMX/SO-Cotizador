import type { CtzUsuario, UserRole } from "../types/db";

export type CreateUsuarioResult =
  | { ok: true; usuario: CtzUsuario }
  | { ok: false; error: "duplicate" | "invalid_password" | "unknown" };

export type UpdateUsuarioResult =
  | { ok: true; usuario: CtzUsuario }
  | { ok: false; error: "duplicate" | "self_modify" | "last_admin" | "invalid_password" | "unknown" };

export type DeleteUsuarioResult =
  | { ok: true }
  | { ok: false; error: "has_cotizaciones" | "unknown" };

export type UsuarioMutationError =
  | "duplicate"
  | "has_cotizaciones"
  | "self_modify"
  | "last_admin"
  | "invalid_password"
  | "unknown";

export type UsuarioBulkInsertRow = {
  email: string;
  nombre_completo: string | null;
};

export type CreateUsuariosBulkResult = {
  inserted: number;
  failed: number;
};

/** Bloquea que un admin se desactive o se baje de rol. */
export function canDeactivateOrDemoteAdmin(
  targetId: string,
  currentUserId: string,
  nextRol?: UserRole,
  nextActivo?: boolean
): boolean {
  if (targetId !== currentUserId) return true;
  if (nextActivo === false) return false;
  if (nextRol === "tienda") return false;
  return true;
}

/** true si la operacion dejaria cero admins activos. */
export function wouldRemoveLastAdmin(
  target: Pick<CtzUsuario, "id" | "rol" | "activo">,
  nextRol?: UserRole,
  nextActivo?: boolean
): boolean {
  if (target.rol !== "admin" || !target.activo) return false;
  const willStayAdmin =
    (nextActivo === undefined ? target.activo : nextActivo) &&
    (nextRol === undefined ? target.rol === "admin" : nextRol === "admin");
  return !willStayAdmin;
}

export function usuarioMutationErrorMessage(error: UsuarioMutationError): string {
  switch (error) {
    case "duplicate":
      return "Ese correo ya está registrado.";
    case "invalid_password":
      return "La contraseña debe tener al menos 4 caracteres.";
    case "has_cotizaciones":
      return "No se puede borrar: el usuario tiene cotizaciones. Desactívalo en su lugar.";
    case "self_modify":
      return "No puedes modificar tu propio correo, nombre, contraseña ni acceso de administrador.";
    case "last_admin":
      return "Debe quedar al menos un administrador activo.";
    default:
      return "No se pudo completar la operación.";
  }
}
