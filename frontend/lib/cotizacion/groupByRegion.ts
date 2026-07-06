import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

const CHIAPAS_VER_TAB_LABEL = "Chiapas - Ver -Tab";
const MERGE_INTO_CHIAPAS_VER_TAB = new Set(["Chiapas", "Veracruz-Tabasco", "Veracruz", "Tabasco"]);

/** Agrupa Chiapas y Veracruz-Tabasco bajo una sola etiqueta en gráficos y reportes. */
export function displayRegionLabel(rawRegion: string): string {
  const trimmed = rawRegion.trim();
  if (!trimmed || trimmed === "Sin región") return "Sin región";
  if (MERGE_INTO_CHIAPAS_VER_TAB.has(trimmed)) return CHIAPAS_VER_TAB_LABEL;
  return trimmed;
}

export function regionLabel(row: CotizacionWithRelations): string {
  return displayRegionLabel(row.ctz_sucursales?.region?.trim() || "Sin región");
}

export function sucursalLabel(row: CotizacionWithRelations): string {
  return row.ctz_sucursales?.nombre?.trim() || "Sin sucursal";
}

export function sortRegionKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === "Sin región") return 1;
    if (b === "Sin región") return -1;
    return a.localeCompare(b, "es");
  });
}

export function groupCotizacionesByRegionAndSucursal(
  rows: CotizacionWithRelations[]
): Map<string, Map<string, CotizacionWithRelations[]>> {
  const byRegion = new Map<string, Map<string, CotizacionWithRelations[]>>();

  for (const row of rows) {
    const region = regionLabel(row);
    const sucursal = sucursalLabel(row);
    if (!byRegion.has(region)) byRegion.set(region, new Map());
    const bySucursal = byRegion.get(region)!;
    if (!bySucursal.has(sucursal)) bySucursal.set(sucursal, []);
    bySucursal.get(sucursal)!.push(row);
  }

  return byRegion;
}

export function uniqueRegionsFromRows(rows: CotizacionWithRelations[]): string[] {
  return sortRegionKeys([...new Set(rows.map(regionLabel))]);
}

export function uniqueSucursalesFromRows(rows: CotizacionWithRelations[], region?: string): string[] {
  const filtered = region ? rows.filter((row) => regionLabel(row) === region) : rows;
  return [...new Set(filtered.map(sucursalLabel))].sort((a, b) => a.localeCompare(b, "es"));
}
