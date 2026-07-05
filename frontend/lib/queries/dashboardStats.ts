import { supabase } from "../supabase";

const PAGE_SIZE = 1000;

/** Fila mínima de cotización para métricas del dashboard. */
export type DashboardCotizacionRow = {
  id: string;
  created_at: string;
  id_sucursal: string;
  id_usuario: string;
  total: number;
  venta_cerrada: boolean;
  ctz_sucursales: { nombre: string; region: string | null } | null;
  ctz_usuarios: { email: string; nombre_completo: string | null } | null;
};

const DASHBOARD_SELECT =
  "id,created_at,id_sucursal,id_usuario,total,venta_cerrada,ctz_sucursales(nombre,region),ctz_usuarios(email,nombre_completo)";

/** Todas las cotizaciones (paginado) con sucursal y usuario, para el dashboard admin. */
export async function listCotizacionesForDashboard(): Promise<DashboardCotizacionRow[]> {
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
