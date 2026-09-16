import type { CtzUsuario, UserRole } from "./types/db";

export const SESSION_STORAGE_KEY = "ctz_session";
export const CTZ_USER_HEADER = "x-ctz-user";

export type SessionActor = Pick<CtzUsuario, "id" | "email" | "rol">;

export function actorAsUsuario(actor: SessionActor): CtzUsuario {
  return {
    id: actor.id,
    email: actor.email,
    rol: actor.rol,
    nombre_completo: null,
    activo: true,
    created_at: "",
  };
}

export function parseActorPayload(value: unknown): SessionActor | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const email = typeof record.email === "string" ? record.email : "";
  if (!id || !email) return null;
  const rol: UserRole = record.rol === "admin" ? "admin" : "tienda";
  return { id, email, rol };
}

export function parseSessionActorHeader(request: Request): SessionActor | null {
  const raw = request.headers.get(CTZ_USER_HEADER);
  if (!raw) return null;
  try {
    return parseActorPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Reads the browser session actor for API headers. Safe to call on the server (returns null). */
export function readSessionActor(): SessionActor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: unknown } | unknown;
    if (parsed && typeof parsed === "object" && "user" in parsed) {
      return parseActorPayload((parsed as { user: unknown }).user);
    }
    return parseActorPayload(parsed);
  } catch {
    return null;
  }
}
