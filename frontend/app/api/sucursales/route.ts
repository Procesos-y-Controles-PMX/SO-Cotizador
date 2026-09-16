import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import { deleteSucursal, listSucursales, updateSucursal } from "@/lib/queries/sucursales";
import type { SucursalUpdatePatch } from "@/lib/queries/sucursales.shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "1";
    const rows = await listSucursales({ includeInactive });
    return jsonOk(rows);
  } catch (err) {
    console.error("[api/sucursales GET]", err);
    return jsonError("No se pudieron cargar las sucursales.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      id?: string;
      patch?: Partial<SucursalUpdatePatch>;
    };
    if (body.op === "update" && body.id && body.patch) {
      const ok = await updateSucursal(body.id, body.patch);
      return jsonOk({ ok });
    }
    if (body.op === "delete" && body.id) {
      return jsonOk(await deleteSucursal(body.id));
    }
    return jsonError("Operación no válida.", 400);
  } catch (err) {
    console.error("[api/sucursales POST]", err);
    return jsonError("No se pudo completar la operación de sucursal.");
  }
}
