import { NextResponse } from "next/server";
import { missingSupabaseServerEnv } from "@/lib/supabase-server";

/** Comprueba qué variables de entorno faltan en el servidor (sin exponer valores). */
export async function GET() {
  const missing = missingSupabaseServerEnv();
  return NextResponse.json({
    ok: missing.length === 0,
    missing,
  });
}
