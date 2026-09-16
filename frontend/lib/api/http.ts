import { CTZ_USER_HEADER, readSessionActor } from "../session-actor";

function sessionHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const actor = readSessionActor();
  if (actor) {
    headers[CTZ_USER_HEADER] = JSON.stringify(actor);
  }
  return headers;
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, {
      method: "GET",
      headers: sessionHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function apiSend<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: sessionHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
