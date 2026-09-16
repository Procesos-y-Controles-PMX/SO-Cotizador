import type { CtzCliente } from "../types/db";
import type { CreateClienteResult } from "../queries/clientes.shared";
import { apiGet, apiSend } from "./http";

export type { CreateClienteResult } from "../queries/clientes.shared";

export async function listClientes(search: string, idSucursal: string): Promise<CtzCliente[]> {
  if (!idSucursal) return [];
  const params = new URLSearchParams({ idSucursal });
  if (search) params.set("search", search);
  return apiGet<CtzCliente[]>(`/api/clientes?${params.toString()}`, []);
}

export async function getClienteById(id: string): Promise<CtzCliente | null> {
  return apiGet<CtzCliente | null>(`/api/clientes?id=${encodeURIComponent(id)}`, null);
}

export async function createCliente(payload: {
  id_sucursal: string;
  nombre_cliente: string;
  num_cliente?: string;
  empresa?: string;
  telefono?: string;
  correo?: string;
}): Promise<CreateClienteResult> {
  return apiSend<CreateClienteResult>("/api/clientes", { op: "create", payload }, {
    ok: false,
    error: "unknown",
  });
}
