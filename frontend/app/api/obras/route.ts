import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import { createObra, getObraById, listObras } from "@/lib/queries/obras";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) return jsonOk(await getObraById(id));
    const idCliente = searchParams.get("idCliente") ?? "";
    const search = searchParams.get("search") ?? "";
    return jsonOk(await listObras(search, idCliente));
  } catch (err) {
    console.error("[api/obras GET]", err);
    return jsonError("No se pudieron cargar las obras.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      payload?: {
        id_cliente: string;
        nombre_obra: string;
        num_obra?: string;
        referencia_pago?: string;
      };
    };
    if (body.op !== "create" || !body.payload) {
      return jsonError("Operación no válida.", 400);
    }
    return jsonOk(await createObra(body.payload));
  } catch (err) {
    console.error("[api/obras POST]", err);
    return jsonError("No se pudo crear la obra.");
  }
}
