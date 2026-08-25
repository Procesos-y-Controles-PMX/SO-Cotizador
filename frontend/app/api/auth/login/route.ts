import { NextResponse } from "next/server";
import { isOwnerAdminEmail } from "@/lib/owner-admin";
import { createSupabaseServerClient, missingSupabaseServerEnv } from "@/lib/supabase-server";
import type { CtzUsuario } from "@/lib/types/db";
import { clientMetaFromRequest, logSoFailedAccess } from "@/lib/so-access-log";
import { scorePasswordCloseness } from "@/lib/password-closeness";

const USUARIO_SESSION_SELECT =
  "id, email, nombre_completo, rol, activo, created_at";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email ?? "");
    const password = (body.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Credenciales requeridas." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      const missing = missingSupabaseServerEnv();
      return NextResponse.json(
        {
          ok: false,
          message:
            missing.length > 0
              ? `Faltan variables en el servidor: ${missing.join(", ")}. Configúralas en Vercel y vuelve a desplegar.`
              : "Servidor sin configuración de base de datos.",
        },
        { status: 500 },
      );
    }

    const { data: candidates, error } = await supabase
      .from("ctz_usuarios")
      .select(`${USUARIO_SESSION_SELECT}, password`)
      .ilike("email", email);

    if (error) {
      console.error("Login query error:", error.message);
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas o usuario inactivo." },
        { status: 401 },
      );
    }

    const data = (candidates ?? []).find((row) => {
      const passwordMatch = String(row.password ?? "").trim() === password;
      if (!passwordMatch) return false;
      if (isOwnerAdminEmail(email)) return true;
      return row.activo === true;
    });

    if (!data) {
      const first = (candidates ?? [])[0];
      const meta = clientMetaFromRequest(request);
      const close = first
        ? scorePasswordCloseness(password, String(first.password ?? ""), email)
        : { closeness: "n_a" as const, distance: null, attemptLen: password.length, hint: null };
      void logSoFailedAccess({
        app: "cotizador",
        correo: email,
        nombre: first?.nombre_completo,
        reason: first ? (first.activo === true || isOwnerAdminEmail(email) ? "wrong_password" : "inactive") : "unknown_email",
        closeness: close.closeness,
        distance: close.distance,
        attemptLen: close.attemptLen,
        hint: close.hint,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas o usuario inactivo." },
        { status: 401 },
      );
    }

    const { password: _password, ...user } = data;
    const sessionUser = {
      ...user,
      rol: isOwnerAdminEmail(email) ? "admin" : user.rol,
      activo: isOwnerAdminEmail(email) ? true : user.activo,
    } as CtzUsuario;
    return NextResponse.json({ ok: true, user: sessionUser });
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ ok: false, message: "Error al iniciar sesión." }, { status: 500 });
  }
}
