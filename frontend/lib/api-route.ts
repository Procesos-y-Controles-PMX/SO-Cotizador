import { NextResponse } from "next/server";
import {
  actorAsUsuario,
  parseSessionActorHeader,
  type SessionActor,
} from "./session-actor";
import type { CtzUsuario } from "./types/db";

export function unauthorizedResponse() {
  return NextResponse.json({ ok: false, message: "Sesión requerida." }, { status: 401 });
}

export function requireApiSession(
  request: Request
): { ok: true; actor: SessionActor; user: CtzUsuario } | { ok: false; response: NextResponse } {
  const actor = parseSessionActorHeader(request);
  if (!actor) return { ok: false, response: unauthorizedResponse() };
  return { ok: true, actor, user: actorAsUsuario(actor) };
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, message }, { status });
}
