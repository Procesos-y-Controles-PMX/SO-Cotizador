import type { CtzUsuario, UserRole } from "../types/db";
import type {
  CreateUsuarioResult,
  CreateUsuariosBulkResult,
  DeleteUsuarioResult,
  UpdateUsuarioResult,
  UsuarioBulkInsertRow,
  UsuarioMutationError,
} from "../queries/usuarios.shared";
import { apiGet, apiSend } from "./http";

export type {
  CreateUsuarioResult,
  CreateUsuariosBulkResult,
  DeleteUsuarioResult,
  UpdateUsuarioResult,
  UsuarioBulkInsertRow,
  UsuarioMutationError,
} from "../queries/usuarios.shared";
export { usuarioMutationErrorMessage } from "../queries/usuarios.shared";

export async function getUsuarioByEmail(email: string): Promise<CtzUsuario | null> {
  const params = new URLSearchParams({ op: "by-email", email });
  return apiGet<CtzUsuario | null>(`/api/usuarios?${params.toString()}`, null);
}

export async function listUsuarios(search = ""): Promise<CtzUsuario[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const suffix = params.size ? `?${params.toString()}` : "";
  return apiGet<CtzUsuario[]>(`/api/usuarios${suffix}`, []);
}

export async function getExistingUsuarioEmails(): Promise<Set<string>> {
  const emails = await apiGet<string[]>("/api/usuarios?op=emails", []);
  return new Set(emails);
}

export async function createUsuariosBulk(rows: UsuarioBulkInsertRow[]): Promise<CreateUsuariosBulkResult> {
  return apiSend<CreateUsuariosBulkResult>("/api/usuarios", { op: "bulk", rows }, {
    inserted: 0,
    failed: rows.length,
  });
}

export async function createUsuario(payload: {
  email: string;
  nombre_completo?: string;
  rol: UserRole;
  password: string;
}): Promise<CreateUsuarioResult> {
  return apiSend<CreateUsuarioResult>("/api/usuarios", { op: "create", payload }, {
    ok: false,
    error: "unknown",
  });
}

export async function updateUsuario(
  id: string,
  payload: Partial<Pick<CtzUsuario, "email" | "nombre_completo" | "rol" | "activo">> & {
    password?: string;
  },
  options?: { currentUserId: string; target: CtzUsuario }
): Promise<UpdateUsuarioResult> {
  return apiSend<UpdateUsuarioResult>("/api/usuarios", { op: "update", id, payload, options }, {
    ok: false,
    error: "unknown",
  });
}

export async function deleteUsuario(id: string): Promise<DeleteUsuarioResult> {
  return apiSend<DeleteUsuarioResult>("/api/usuarios", { op: "delete", id }, {
    ok: false,
    error: "unknown",
  });
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
  const result = await apiSend<{ error: UsuarioMutationError | null }>("/api/usuarios", {
    op: "validate",
    target,
    currentUserId,
    changes,
  }, { error: "unknown" });
  return result.error;
}
