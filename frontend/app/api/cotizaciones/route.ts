import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import { createCotizacion, listCotizaciones } from "@/lib/queries/cotizaciones";
import type { ProductoInput } from "@/lib/queries/cotizaciones.shared";
import type { CtzCotizacion } from "@/lib/types/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const unlimited = searchParams.get("unlimited") === "1";
    if (unlimited) {
      const rows = await listCotizaciones(session.user, search, { unlimited: true });
      return jsonOk(rows);
    }
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const result = await listCotizaciones(session.user, search, {
      page: Number.isFinite(page) ? page : 1,
      ...(Number.isFinite(pageSize) && pageSize > 0 ? { pageSize } : {}),
    });
    return jsonOk(result);
  } catch (err) {
    console.error("[api/cotizaciones GET]", err);
    return jsonError("No se pudieron cargar las cotizaciones.");
  }
}

export async function POST(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    const body = (await request.json()) as {
      op?: string;
      payload?: {
        cotizacion: Omit<CtzCotizacion, "id" | "created_at" | "updated_at">;
        productos: ProductoInput[];
      };
    };
    if (body.op !== "create" || !body.payload) {
      return jsonError("Operación no válida.", 400);
    }
    const result = await createCotizacion(body.payload);
    return jsonOk(result);
  } catch (err) {
    console.error("[api/cotizaciones POST]", err);
    return jsonError("No se pudo crear la cotización.");
  }
}
