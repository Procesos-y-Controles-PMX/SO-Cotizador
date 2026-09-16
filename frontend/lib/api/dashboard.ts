import type { DashboardCotizacionRow } from "../queries/dashboardStats.shared";
import { apiGet } from "./http";

export type { DashboardCotizacionRow } from "../queries/dashboardStats.shared";

export async function listCotizacionesForDashboard(): Promise<DashboardCotizacionRow[]> {
  return apiGet<DashboardCotizacionRow[]>("/api/dashboard/cotizaciones", []);
}
