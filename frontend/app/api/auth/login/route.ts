import { NextResponse } from "next/server";
import { createSupabaseServerClient, missingSupabaseServerEnv } from "@/lib/supabase-server";
import type { CtzUsuario } from "@/lib/types/db";

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

    const data = (candidates ?? []).find(
      (row) =>
        row.activo === true &&
        String(row.password ?? "").trim() === password,
    );

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas o usuario inactivo." },
        { status: 401 },
      );
    }

    const { password: _password, ...user } = data;
    return NextResponse.json({ ok: true, user: user as CtzUsuario });
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json({ ok: false, message: "Error al iniciar sesión." }, { status: 500 });
  }
}
