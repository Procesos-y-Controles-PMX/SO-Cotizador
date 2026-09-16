import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import { createCliente, getClienteById, listClientes } from "@/lib/queries/clientes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) return jsonOk(await getClienteById(id));
    const idSucursal = searchParams.get("idSucursal") ?? "";
    const search = searchParams.get("search") ?? "";
    return jsonOk(await listClientes(search, idSucursal));
  } catch (err) {
    console.error("[api/clientes GET]", err);
    return jsonError("No se pudieron cargar los clientes.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      payload?: {
        id_sucursal: string;
        nombre_cliente: string;
        num_cliente?: string;
        empresa?: string;
        telefono?: string;
        correo?: string;
      };
    };
    if (body.op !== "create" || !body.payload) {
      return jsonError("Operación no válida.", 400);
    }
    return jsonOk(await createCliente(body.payload));
  } catch (err) {
    console.error("[api/clientes POST]", err);
    return jsonError("No se pudo crear el cliente.");
  }
}
