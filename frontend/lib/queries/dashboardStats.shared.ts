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
