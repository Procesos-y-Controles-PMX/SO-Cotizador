"use client";

import { useCallback, useEffect, useState } from "react";
import type { CtzUsuario } from "./types/db";
import {
  createSessionTimestamps,
  getSessionExpiryReason,
  useSessionTimeout,
  type SessionTimestamps,
} from "./session-timeout";

const SESSION_KEY = "ctz_session";

type StoredSession = {
  user: CtzUsuario;
  issuedAt: number;
  lastActivityAt: number;
};

function getSessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

/** Limpia sesión antigua en localStorage (persistía al cerrar pestaña). */
function clearLegacySession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

function stripPassword(user: CtzUsuario & { password?: string }): CtzUsuario {
  if (user.password !== undefined) {
    const { password: _p, ...rest } = user;
    return rest;
  }
  return user;
}

function parseStoredSession(
  raw: string
): { session: StoredSession; migrated: boolean } | null {
  try {
    const parsed = JSON.parse(raw) as
      | (CtzUsuario & { password?: string })
      | (Partial<StoredSession> & { user?: CtzUsuario & { password?: string } });

    // New format: { user, issuedAt, lastActivityAt }
    if (
      parsed &&
      typeof parsed === "object" &&
      "user" in parsed &&
      parsed.user &&
      typeof (parsed as StoredSession).issuedAt === "number" &&
      typeof (parsed as StoredSession).lastActivityAt === "number"
    ) {
      const session = parsed as StoredSession;
      return {
        session: {
          user: stripPassword(session.user),
          issuedAt: session.issuedAt,
          lastActivityAt: session.lastActivityAt,
        },
        migrated: false,
      };
    }

    // Legacy format: raw user object — migrate with a fresh clock.
    if (parsed && typeof parsed === "object" && "id" in parsed && "email" in parsed) {
      const timestamps = createSessionTimestamps();
      return {
        session: {
          user: stripPassword(parsed as CtzUsuario & { password?: string }),
          ...timestamps,
        },
        migrated: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function writeSession(user: CtzUsuario, timestamps: SessionTimestamps): void {
  const store = getSessionStore();
  if (!store) return;
  clearLegacySession();
  const payload: StoredSession = { user, ...timestamps };
  store.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearSessionStore(): void {
  clearLegacySession();
  getSessionStore()?.removeItem(SESSION_KEY);
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
    writeSession(payload.user, createSessionTimestamps());
    return { ok: true, user: payload.user };
  } catch {
    return { ok: false, message: "No se pudo contactar al servidor de autenticación." };
  }
}

export function logout(): void {
  clearSessionStore();
}

export function getSessionTimestamps(): SessionTimestamps | null {
  const store = getSessionStore();
  if (!store) return null;
  const raw = store.getItem(SESSION_KEY);
  if (!raw) return null;
  const parsed = parseStoredSession(raw);
  if (!parsed) return null;
  return {
    issuedAt: parsed.session.issuedAt,
    lastActivityAt: parsed.session.lastActivityAt,
  };
}

export function setSessionTimestamps(timestamps: SessionTimestamps): void {
  const user = getCurrentUser({ skipExpiryCheck: true });
  if (!user) return;
  writeSession(user, timestamps);
}

export function getCurrentUser(options?: {
  skipExpiryCheck?: boolean;
}): CtzUsuario | null {
  const store = getSessionStore();
  if (!store) return null;
  const raw = store.getItem(SESSION_KEY);
  if (!raw) return null;

  const parsed = parseStoredSession(raw);
  if (!parsed) {
    clearSessionStore();
    return null;
  }

  const { session, migrated } = parsed;

  if (!options?.skipExpiryCheck && getSessionExpiryReason(session)) {
    clearSessionStore();
    return null;
  }

  if (migrated) {
    writeSession(session.user, {
      issuedAt: session.issuedAt,
      lastActivityAt: session.lastActivityAt,
    });
  }

  return session.user;
}

export function useAuth(): { user: CtzUsuario | null; loading: boolean } {
  const [user, setUser] = useState<CtzUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const expire = useCallback(() => {
    logout();
    setUser(null);
  }, []);

  useEffect(() => {
    clearLegacySession();
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  useSessionTimeout({
    enabled: Boolean(user),
    getTimestamps: getSessionTimestamps,
    setTimestamps: setSessionTimestamps,
    onExpire: expire,
  });

  return { user, loading };
}
