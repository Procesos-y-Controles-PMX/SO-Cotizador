import { matchesSearch } from "../search";
import { supabase } from "../supabase";
import type { CtzUsuario, UserRole } from "../types/db";

export type CreateUsuarioResult =
  | { ok: true; usuario: CtzUsuario }
  | { ok: false; error: "duplicate" | "unknown" };

export type UpdateUsuarioResult =
  | { ok: true; usuario: CtzUsuario }
  | { ok: false; error: "duplicate" | "unknown" };

export type DeleteUsuarioResult =
  | { ok: true }
  | { ok: false; error: "has_cotizaciones" | "unknown" };

export type UsuarioMutationError =
  | "duplicate"
  | "has_cotizaciones"
  | "self_modify"
  | "last_admin"
  | "unknown";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUsuarioByEmail(email: string): Promise<CtzUsuario | null> {
  if (!supabase) return null;
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select("*")
    .ilike("email", normalized)
    .eq("activo", true)
    .maybeSingle();

  if (error) return null;
  return (data as CtzUsuario | null) ?? null;
}

export async function listUsuarios(search = ""): Promise<CtzUsuario[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select("*")
    .order("activo", { ascending: false })
    .order("email");

  if (error) return [];
  const rows = (data as CtzUsuario[] | null) ?? [];
  const trimmed = search.trim();
  if (!trimmed) return rows;

  return rows.filter(
    (u) =>
      matchesSearch(u.email, trimmed) ||
      (u.nombre_completo ? matchesSearch(u.nombre_completo, trimmed) : false)
  );
}

export async function createUsuario(payload: {
  email: string;
  nombre_completo?: string;
  rol: UserRole;
}): Promise<CreateUsuarioResult> {
  if (!supabase) return { ok: false, error: "unknown" };
  const email = normalizeEmail(payload.email);
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .insert({
      email,
      nombre_completo: payload.nombre_completo?.trim() || null,
      rol: payload.rol,
      activo: true,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, usuario: data as CtzUsuario };
}

export async function updateUsuario(
  id: string,
  payload: Partial<Pick<CtzUsuario, "email" | "nombre_completo" | "rol" | "activo">>
): Promise<UpdateUsuarioResult> {
  if (!supabase) return { ok: false, error: "unknown" };
  const patch: Partial<Pick<CtzUsuario, "email" | "nombre_completo" | "rol" | "activo">> = {};
  if (payload.email !== undefined) patch.email = normalizeEmail(payload.email);
  if (payload.nombre_completo !== undefined) {
    patch.nombre_completo = payload.nombre_completo?.trim() || null;
  }
  if (payload.rol !== undefined) patch.rol = payload.rol;
  if (payload.activo !== undefined) patch.activo = payload.activo;

  const { data, error } = await supabase.from("ctz_usuarios").update(patch).eq("id", id).select("*").single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, usuario: data as CtzUsuario };
}

export async function deleteUsuario(id: string): Promise<DeleteUsuarioResult> {
  if (!supabase) return { ok: false, error: "unknown" };
  const { error } = await supabase.from("ctz_usuarios").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "has_cotizaciones" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}

export async function countActiveAdmins(excludeId?: string): Promise<number> {
  if (!supabase) return 0;
  let query = supabase
    .from("ctz_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("rol", "admin")
    .eq("activo", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function usuarioHasCotizaciones(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("ctz_cotizaciones")
    .select("id")
    .eq("id_usuario", id)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data != null;
}

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

export async function validateUsuarioMutation(
  target: CtzUsuario,
  currentUserId: string,
  changes: { rol?: UserRole; activo?: boolean }
): Promise<UsuarioMutationError | null> {
  if (!canDeactivateOrDemoteAdmin(target.id, currentUserId, changes.rol, changes.activo)) {
    return "self_modify";
  }
  if (wouldRemoveLastAdmin(target, changes.rol, changes.activo)) {
    const otherAdmins = await countActiveAdmins(target.id);
    if (otherAdmins === 0) return "last_admin";
  }
  return null;
}

export function usuarioMutationErrorMessage(error: UsuarioMutationError): string {
  switch (error) {
    case "duplicate":
      return "Ese correo ya esta registrado.";
    case "has_cotizaciones":
      return "No se puede borrar: el usuario tiene cotizaciones. Desactivalo en su lugar.";
    case "self_modify":
      return "No puedes modificar tu propio acceso de administrador.";
    case "last_admin":
      return "Debe quedar al menos un administrador activo.";
    default:
      return "No se pudo completar la operacion.";
  }
}
