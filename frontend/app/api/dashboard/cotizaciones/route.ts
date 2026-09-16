import { jsonError, jsonOk, requireApiSession } from "@/lib/api-route";
import { listCotizacionesForDashboard } from "@/lib/queries/dashboardStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireApiSession(request);
  if (!session.ok) return session.response;

  try {
    return jsonOk(await listCotizacionesForDashboard());
  } catch (err) {
    console.error("[api/dashboard/cotizaciones GET]", err);
    return jsonError("No se pudieron cargar las métricas.");
  }
}
