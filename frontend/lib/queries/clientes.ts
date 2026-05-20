import { matchesSearch, SEARCH_RESULT_LIMIT } from "../search";
import { supabase } from "../supabase";
import type { CtzCliente } from "../types/db";

/** Máximo de clientes por sucursal a traer para listado y filtro en memoria. */
const CLIENTES_FETCH_CAP = 5000;

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

  const { data } = await query.limit(CLIENTES_FETCH_CAP);
  const rows = (data as CtzCliente[] | null) ?? [];
  const trimmed = search.trim();
  if (!trimmed) return rows;

  return rows
    .filter(
      (c) =>
        matchesSearch(c.nombre_cliente, trimmed) ||
        (c.num_cliente ? matchesSearch(c.num_cliente, trimmed) : false) ||
        (c.empresa ? matchesSearch(c.empresa, trimmed) : false)
    )
    .slice(0, SEARCH_RESULT_LIMIT);
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
