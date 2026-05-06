import { supabase } from "../supabase";
import type { CtzCliente } from "../types/db";

export async function listClientes(search = ""): Promise<CtzCliente[]> {
  if (!supabase) return [];
  const query = supabase.from("ctz_clientes").select("*").eq("activo", true).order("nombre_cliente");
  if (!search.trim()) {
    const { data } = await query.limit(50);
    return (data as CtzCliente[] | null) ?? [];
  }
  const term = `%${search.trim()}%`;
  const { data } = await query.or(`nombre_cliente.ilike.${term},num_cliente.ilike.${term}`).limit(50);
  return (data as CtzCliente[] | null) ?? [];
}

export async function createCliente(payload: {
  nombre_cliente: string;
  num_cliente?: string;
  empresa?: string;
  telefono?: string;
  correo?: string;
}): Promise<CtzCliente | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("ctz_clientes")
    .insert({
      nombre_cliente: payload.nombre_cliente,
      num_cliente: payload.num_cliente || null,
      empresa: payload.empresa || null,
      telefono: payload.telefono || null,
      correo: payload.correo || null,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as CtzCliente;
}

