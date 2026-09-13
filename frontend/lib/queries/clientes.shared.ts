import type { CtzCliente } from "../types/db";

export type CreateClienteResult =
  | { ok: true; cliente: CtzCliente }
  | { ok: false; error: "duplicate" | "unknown" };
