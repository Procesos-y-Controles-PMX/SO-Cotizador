"use client";

import { useEffect, useState } from "react";
import { getUsuarioByEmail } from "./queries/usuarios";
import type { CtzUsuario } from "./types/db";

const SESSION_KEY = "ctz_session";

export async function loginByEmail(email: string): Promise<CtzUsuario | null> {
  const user = await getUsuarioByEmail(email);
  if (!user) return null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): CtzUsuario | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
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
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  return { user, loading };
}

