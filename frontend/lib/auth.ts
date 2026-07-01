"use client";

import { useEffect, useState } from "react";
import type { CtzUsuario } from "./types/db";

const SESSION_KEY = "ctz_session";

function getSessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

/** Limpia sesión antigua en localStorage (persistía al cerrar pestaña). */
function clearLegacySession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export type LoginResult =
  | { ok: true; user: CtzUsuario }
  | { ok: false; message: string };

export async function loginByEmailPassword(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      user?: CtzUsuario;
      message?: string;
    };

    if (!response.ok || !payload.ok || !payload.user) {
      return {
        ok: false,
        message:
          payload.message ??
          "Credenciales inválidas o usuario inactivo.",
      };
    }

    const store = getSessionStore();
    if (!store) {
      return { ok: false, message: "No se pudo guardar la sesión en el navegador." };
    }
    clearLegacySession();
    store.setItem(SESSION_KEY, JSON.stringify(payload.user));
    return { ok: true, user: payload.user };
  } catch {
    return { ok: false, message: "No se pudo contactar al servidor de autenticación." };
  }
}

export function logout(): void {
  clearLegacySession();
  getSessionStore()?.removeItem(SESSION_KEY);
}

export function getCurrentUser(): CtzUsuario | null {
  const store = getSessionStore();
  if (!store) return null;
  const raw = store.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CtzUsuario & { password?: string };
    if (parsed.password !== undefined) {
      const { password: _p, ...user } = parsed;
      return user;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useAuth(): { user: CtzUsuario | null; loading: boolean } {
  const [user, setUser] = useState<CtzUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearLegacySession();
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  return { user, loading };
}
