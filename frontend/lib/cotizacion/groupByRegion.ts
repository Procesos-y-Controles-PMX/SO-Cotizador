import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export function regionLabel(row: CotizacionWithRelations): string {
  return row.ctz_sucursales?.region?.trim() || "Sin región";
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
