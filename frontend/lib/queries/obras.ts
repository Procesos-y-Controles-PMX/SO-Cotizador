import "server-only";

import { matchesSearch, SEARCH_RESULT_LIMIT } from "../search";
import { createSupabaseServerClient } from "../supabase-server";
import type { CtzObra } from "../types/db";
import type { CreateObraResult } from "./obras.shared";

export type { CreateObraResult };
export { obraLabelCotizacion, obraNombreCotizacion, obraToOption } from "./obras.shared";

const OBRAS_FETCH_CAP = 5000;

export async function listObras(search: string, idCliente: string): Promise<CtzObra[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !idCliente) return [];
  const { data } = await supabase
    .from("ctz_obras")
    .select("*")
    .eq("activo", true)
    .eq("id_cliente", idCliente)
    .order("nombre_obra")
    .limit(OBRAS_FETCH_CAP);

  const rows = (data as CtzObra[] | null) ?? [];
  const trimmed = search.trim();
  if (!trimmed) return rows;

  return rows
    .filter(
      (obra) =>
        matchesSearch(obra.nombre_obra, trimmed) ||
        (obra.num_obra ? matchesSearch(obra.num_obra, trimmed) : false) ||
        (obra.referencia_pago ? matchesSearch(obra.referencia_pago, trimmed) : false)
    )
    .slice(0, SEARCH_RESULT_LIMIT);
}

export async function getObraById(id: string): Promise<CtzObra | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("ctz_obras").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as CtzObra | null) ?? null;
}

export async function createObra(payload: {
  id_cliente: string;
  nombre_obra: string;
  num_obra?: string;
  referencia_pago?: string;
}): Promise<CreateObraResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase || !payload.id_cliente) return { ok: false, error: "unknown" };
  const { data, error } = await supabase
    .from("ctz_obras")
    .insert({
      id_cliente: payload.id_cliente,
      nombre_obra: payload.nombre_obra,
      num_obra: payload.num_obra || null,
      referencia_pago: payload.referencia_pago || null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, obra: data as CtzObra };
}
