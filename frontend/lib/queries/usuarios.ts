import { supabase } from "../supabase";
import type { CtzUsuario } from "../types/db";

export async function getUsuarioByEmail(email: string): Promise<CtzUsuario | null> {
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("ctz_usuarios")
    .select("*")
    .ilike("email", normalized)
    .eq("activo", true)
    .maybeSingle();

  if (error) return null;
  return (data as CtzUsuario | null) ?? null;
}

