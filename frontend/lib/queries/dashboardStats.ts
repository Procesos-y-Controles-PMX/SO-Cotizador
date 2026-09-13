import "server-only";

import { createSupabaseServerClient } from "../supabase-server";
import type { DashboardCotizacionRow } from "./dashboardStats.shared";

export type { DashboardCotizacionRow };

const PAGE_SIZE = 1000;

const DASHBOARD_SELECT =
  "id,created_at,id_sucursal,id_usuario,total,venta_cerrada,ctz_sucursales(nombre,region),ctz_usuarios(email,nombre_completo)";

/** Todas las cotizaciones (paginado) con sucursal y usuario, para el dashboard admin. */
export async function listCotizacionesForDashboard(): Promise<DashboardCotizacionRow[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const all: DashboardCotizacionRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ctz_cotizaciones")
      .select(DASHBOARD_SELECT)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    const batch = (data as unknown as DashboardCotizacionRow[] | null) ?? [];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
