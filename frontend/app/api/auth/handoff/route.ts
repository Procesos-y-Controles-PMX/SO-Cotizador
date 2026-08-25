import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isOwnerAdminEmail } from "@/lib/owner-admin";
import type { CtzUsuario } from "@/lib/types/db";

/**
 * Verifies a short-lived handoff token issued by SO-Portal and returns the
 * user payload so the client can establish its normal session.
 */
export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ ok: false, message: "Token requerido." }, { status: 400 });
    }

    const secret = (process.env.PORTAL_HANDOFF_SECRET ?? "").trim();
    if (!secret) {
      return NextResponse.json(
        { ok: false, message: "Handoff no configurado en el servidor." },
        { status: 500 },
      );
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: "so-portal",
    });

    if (payload.app !== "cotizador") {
      return NextResponse.json({ ok: false, message: "Token de otra aplicación." }, { status: 401 });
    }

    const user = (payload.session as { user?: CtzUsuario } | undefined)?.user;
    if (!user?.id || !user?.email) {
      return NextResponse.json({ ok: false, message: "Token inválido." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: isOwnerAdminEmail(user.email) ? { ...user, rol: "admin", activo: true } : user,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado. Inicia sesión de nuevo." },
      { status: 401 },
    );
  }
}
