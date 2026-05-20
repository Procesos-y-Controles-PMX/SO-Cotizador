import { ilikePattern, SEARCH_RESULT_LIMIT } from "../search";
import { supabase } from "../supabase";
import type { CtzCliente } from "../types/db";

export type CreateClienteResult =
  | { ok: true; cliente: CtzCliente }
  | { ok: false; error: "duplicate" | "unknown" };

export async function listClientes(search: string, idSucursal: string): Promise<CtzCliente[]> {
  if (!supabase || !idSucursal) return [];
  const query = supabase
    .from("ctz_clientes")
    .select("*")
    .eq("activo", true)
    .eq("id_sucursal", idSucursal)
    .order("nombre_cliente");
  const trimmed = search.trim();
  if (!trimmed) {
    const { data } = await query.limit(SEARCH_RESULT_LIMIT);
    return (data as CtzCliente[] | null) ?? [];
  }
  const pattern = ilikePattern(trimmed);
  if (!pattern) return [];
  const { data } = await query
    .or(`nombre_cliente.ilike.${pattern},num_cliente.ilike.${pattern},empresa.ilike.${pattern}`)
    .limit(SEARCH_RESULT_LIMIT);
  return (data as CtzCliente[] | null) ?? [];
}

export async function getClienteById(id: string): Promise<CtzCliente | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("ctz_clientes").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as CtzCliente | null) ?? null;
}

export async function createCliente(payload: {
  id_sucursal: string;
  nombre_cliente: string;
  num_cliente?: string;
  empresa?: string;
  telefono?: string;
  correo?: string;
}): Promise<CreateClienteResult> {
  if (!supabase || !payload.id_sucursal) return { ok: false, error: "unknown" };
  const { data, error } = await supabase
    .from("ctz_clientes")
    .insert({
      id_sucursal: payload.id_sucursal,
      nombre_cliente: payload.nombre_cliente,
      num_cliente: payload.num_cliente || null,
      empresa: payload.empresa || null,
      telefono: payload.telefono || null,
      correo: payload.correo || null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: "unknown" };
  }
  return { ok: true, cliente: data as CtzCliente };
}
