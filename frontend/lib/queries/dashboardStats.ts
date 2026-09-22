import { supabase } from "../supabase";

const PAGE_SIZE = 1000;

/** Fila mínima de cotización para métricas del dashboard. */
export type DashboardCotizacionRow = {
  id: string;
  folio: string;
  created_at: string;
  id_sucursal: string;
  id_usuario: string;
  total: number;
  venta_cerrada: boolean;
  ctz_sucursales: { nombre: string; region: string | null } | null;
  ctz_usuarios: { email: string; nombre_completo: string | null } | null;
};

const DASHBOARD_SELECT =
  "id,folio,created_at,id_sucursal,id_usuario,total,venta_cerrada,ctz_sucursales(nombre,region),ctz_usuarios(email,nombre_completo)";

/** Partida de cotización con su SKU, para las métricas por material. */
export type DashboardItemRow = {
  id_cotizacion: string;
  id_producto: string | null;
  descripcion_registro: string;
  cantidad: number;
  unidad_medida: string | null;
  precio_unitario: number;
  total_item: number;
  ctz_productos: { sku: string | null } | null;
};

const DASHBOARD_ITEMS_SELECT =
  "id_cotizacion,id_producto,descripcion_registro,cantidad,unidad_medida,precio_unitario,total_item,ctz_productos(sku)";

/**
 * Todas las partidas (paginado). El dashboard ya agrega en cliente sobre el
 * total de cotizaciones; esto sigue el mismo camino para que los filtros de
 * zona, tienda, usuario y fecha apliquen igual, cruzando por `id_cotizacion`.
 */
export async function listItemsForDashboard(): Promise<DashboardItemRow[]> {
  if (!supabase) return [];
  const all: DashboardItemRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ctz_cotizacion_items")
      .select(DASHBOARD_ITEMS_SELECT)
      .range(from, from + PAGE_SIZE - 1);
    if (error) break;
    const batch = (data as unknown as DashboardItemRow[] | null) ?? [];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

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
