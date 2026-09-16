import "server-only";

import { generateSimplePassword, isValidUsuarioPassword } from "../usuarioPassword";
import { matchesSearch } from "../search";
import { createSupabaseServerClient } from "../supabase-server";
import type { CtzUsuario, UserRole } from "../types/db";
import {
  canDeactivateOrDemoteAdmin,
  wouldRemoveLastAdmin,
  type CreateUsuarioResult,
  type CreateUsuariosBulkResult,
  type DeleteUsuarioResult,
  type UpdateUsuarioResult,
  type UsuarioBulkInsertRow,
  type UsuarioMutationError,
} from "./usuarios.shared";

export type {
  CreateUsuarioResult,
  CreateUsuariosBulkResult,
  DeleteUsuarioResult,
  UpdateUsuarioResult,
  UsuarioBulkInsertRow,
  UsuarioMutationError,
};
export {
  canDeactivateOrDemoteAdmin,
  usuarioMutationErrorMessage,
  wouldRemoveLastAdmin,
} from "./usuarios.shared";

export const USUARIO_SESSION_SELECT =
  "id, email, nombre_completo, rol, activo, created_at";

type UsuarioRow = CtzUsuario & { password?: string | null };

function stripPassword(row: UsuarioRow): CtzUsuario {
  const { password: _p, ...rest } = row;
  return rest;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function verifyUsuarioLogin(email: string, password: string): Promise<CtzUsuario | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const normalized = normalizeEmail(email);
  const pwd = password.trim();
  if (!pwd) return null;

  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select(`${USUARIO_SESSION_SELECT}, password`)
    .ilike("email", normalized)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as UsuarioRow;
  const stored = row.password ? String(row.password).trim() : "";
  if (!stored || stored !== pwd) return null;
  return stripPassword(row);
}

/** @deprecated Usar verifyUsuarioLogin. Mantener solo si hace falta en otro flujo. */
export async function getUsuarioByEmail(email: string): Promise<CtzUsuario | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select(USUARIO_SESSION_SELECT)
    .ilike("email", normalized)
    .eq("activo", true)
    .maybeSingle();

  if (error) return null;
  return (data as CtzUsuario | null) ?? null;
}

export async function listUsuarios(search = ""): Promise<CtzUsuario[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select(USUARIO_SESSION_SELECT)
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

const BULK_CHUNK_SIZE = 50;

export async function getExistingUsuarioEmails(): Promise<Set<string>> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return new Set();
  const { data, error } = await supabase.from("ctz_usuarios").select("email");
  if (error) return new Set();
  const emails = (data ?? []).map((row) => normalizeEmail(String(row.email ?? "")));
  return new Set(emails);
}

export async function createUsuariosBulk(rows: UsuarioBulkInsertRow[]): Promise<CreateUsuariosBulkResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !rows.length) return { inserted: 0, failed: 0 };

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BULK_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BULK_CHUNK_SIZE);
    const payload = chunk.map((r) => ({
      email: normalizeEmail(r.email),
      nombre_completo: r.nombre_completo?.trim() || null,
      rol: "tienda" as const,
      activo: true,
      password: generateSimplePassword(),
    }));

    const { data, error } = await supabase.from("ctz_usuarios").insert(payload).select("id");
    if (!error && data) {
      inserted += data.length;
      continue;
    }

    for (const row of payload) {
      const { data: one, error: oneError } = await supabase
        .from("ctz_usuarios")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (!oneError && one) inserted += 1;
      else failed += 1;
    }
  }

  return { inserted, failed };
}

export async function createUsuario(payload: {
  email: string;
  nombre_completo?: string;
  rol: UserRole;
  password: string;
}): Promise<CreateUsuarioResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "unknown" };
  const pwd = payload.password.trim();
  if (!isValidUsuarioPassword(pwd)) return { ok: false, error: "invalid_password" };

  const email = normalizeEmail(payload.email);
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .insert({
      email,
      nombre_completo: payload.nombre_completo?.trim() || null,
      rol: payload.rol,
      activo: true,
      password: pwd,
    })
    .select(USUARIO_SESSION_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, usuario: data as CtzUsuario };
}

export async function updateUsuario(
  id: string,
  payload: Partial<Pick<CtzUsuario, "email" | "nombre_completo" | "rol" | "activo">> & {
    password?: string;
  },
  options?: { currentUserId: string; target: CtzUsuario }
): Promise<UpdateUsuarioResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "unknown" };

  if (payload.password !== undefined && !isValidUsuarioPassword(payload.password)) {
    return { ok: false, error: "invalid_password" };
  }

  if (options) {
    const guardError = await validateUsuarioMutation(options.target, options.currentUserId, {
      rol: payload.rol,
      activo: payload.activo,
      email: payload.email,
      nombre_completo: payload.nombre_completo,
      password: payload.password,
    });
    if (guardError === "self_modify" || guardError === "last_admin") {
      return { ok: false, error: guardError };
    }
  }

  const patch: Partial<Pick<CtzUsuario, "email" | "nombre_completo" | "rol" | "activo">> & {
    password?: string;
  } = {};
  if (payload.email !== undefined) patch.email = normalizeEmail(payload.email);
  if (payload.nombre_completo !== undefined) {
    patch.nombre_completo = payload.nombre_completo?.trim() || null;
  }
  if (payload.rol !== undefined) patch.rol = payload.rol;
  if (payload.activo !== undefined) patch.activo = payload.activo;
  if (payload.password !== undefined) patch.password = payload.password.trim();

  const { data, error } = await supabase
    .from("ctz_usuarios")
    .update(patch)
    .eq("id", id)
    .select(USUARIO_SESSION_SELECT)
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, usuario: data as CtzUsuario };
}

export async function deleteUsuario(id: string): Promise<DeleteUsuarioResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "unknown" };
  const { error } = await supabase.from("ctz_usuarios").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "has_cotizaciones" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}

export async function countActiveAdmins(excludeId?: string): Promise<number> {
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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

export async function validateUsuarioMutation(
  target: CtzUsuario,
  currentUserId: string,
  changes: {
    rol?: UserRole;
    activo?: boolean;
    email?: string;
    nombre_completo?: string | null;
    password?: string;
  }
): Promise<UsuarioMutationError | null> {
  if (target.id === currentUserId) {
    if (changes.email !== undefined) return "self_modify";
    if (changes.nombre_completo !== undefined) return "self_modify";
    if (changes.password !== undefined) return "self_modify";
  }
  if (!canDeactivateOrDemoteAdmin(target.id, currentUserId, changes.rol, changes.activo)) {
    return "self_modify";
  }
  if (wouldRemoveLastAdmin(target, changes.rol, changes.activo)) {
    const otherAdmins = await countActiveAdmins(target.id);
    if (otherAdmins === 0) return "last_admin";
  }
  return null;
}
