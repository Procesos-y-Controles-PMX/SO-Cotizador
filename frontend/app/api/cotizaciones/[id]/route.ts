import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import {
  deleteCotizacion,
  getCotizacionById,
  updateCotizacion,
  updateVentaCerradaCotizacion,
} from "@/lib/queries/cotizaciones";
import type { ProductoInput } from "@/lib/queries/cotizaciones.shared";
import type { CtzCotizacion } from "@/lib/types/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { id } = await context.params;
    const row = await getCotizacionById(id);
    return jsonOk(row);
  } catch (err) {
    console.error("[api/cotizaciones/:id GET]", err);
    return jsonError("No se pudo cargar la cotización.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      op?: string;
      payload?: Partial<CtzCotizacion>;
      productos?: ProductoInput[];
      ventaCerrada?: boolean;
    };

    if (body.op === "delete") {
      const ok = await deleteCotizacion(id);
      return jsonOk({ ok });
    }

    if (body.op === "venta_cerrada") {
      const result = await updateVentaCerradaCotizacion(
        session.user,
        id,
        Boolean(body.ventaCerrada)
      );
      return jsonOk(result);
    }

    if (body.op === "update" && body.payload && body.productos) {
      const ok = await updateCotizacion(id, body.payload, body.productos);
      return jsonOk({ ok });
    }

    return jsonError("Operación no válida.", 400);
  } catch (err) {
    console.error("[api/cotizaciones/:id POST]", err);
    return jsonError("No se pudo actualizar la cotización.");
  }
}
