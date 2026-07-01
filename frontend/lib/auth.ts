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

export async function loginByEmailPassword(
  email: string,
  password: string
): Promise<CtzUsuario | null> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { ok?: boolean; user?: CtzUsuario };
  if (!payload.ok || !payload.user) return null;

  const store = getSessionStore();
  if (!store) return null;
  clearLegacySession();
  store.setItem(SESSION_KEY, JSON.stringify(payload.user));
  return payload.user;
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
