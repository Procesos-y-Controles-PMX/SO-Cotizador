"use client";

import { useEffect, useState } from "react";
import { getUsuarioByEmail } from "./queries/usuarios";
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

export async function loginByEmail(email: string): Promise<CtzUsuario | null> {
  const user = await getUsuarioByEmail(email);
  if (!user) return null;
  const store = getSessionStore();
  if (!store) return null;
  clearLegacySession();
  store.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
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
    return JSON.parse(raw) as CtzUsuario;
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
