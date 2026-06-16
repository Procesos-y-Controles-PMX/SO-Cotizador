import type { SearchComboboxOption } from "@/components/ui/SearchCombobox";
import { matchesSearch, SEARCH_RESULT_LIMIT } from "../search";
import { supabase } from "../supabase";
import type { CtzObra } from "../types/db";

const OBRAS_FETCH_CAP = 5000;

export type CreateObraResult =
  | { ok: true; obra: CtzObra }
  | { ok: false; error: "duplicate" | "unknown" };

export function obraToOption(obra: CtzObra): SearchComboboxOption {
  const num = obra.num_obra?.trim();
  const label = `${num || "-"} ${obra.nombre_obra}`;
  return { id: obra.id, label, sublabel: obra.referencia_pago ?? undefined };
}

export function obraNombreCotizacion(cotizacion: {
  nombre_obra: string | null;
  ctz_obras?: { nombre_obra: string } | null;
}): string {
  return cotizacion.ctz_obras?.nombre_obra ?? cotizacion.nombre_obra ?? "-";
}

export function obraLabelCotizacion(cotizacion: {
  nombre_obra: string | null;
  ctz_obras?: { nombre_obra: string; num_obra: string | null } | null;
}): string {
  const nombre = cotizacion.ctz_obras?.nombre_obra ?? cotizacion.nombre_obra;
  if (!nombre) return "-";
  const num = cotizacion.ctz_obras?.num_obra?.trim();
  return `${num || "-"} ${nombre}`;
}

export async function listObras(search: string, idCliente: string): Promise<CtzObra[]> {
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
