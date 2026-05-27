import JSZip from "jszip";
import { regionLabel, sortRegionKeys, sucursalLabel } from "@/lib/cotizacion/groupByRegion";
import {
  generateCotizacionPdfBlob,
  pdfFileNameFromFolio,
  sanitizeZipPathSegment,
} from "@/lib/pdf/cotizacionPdf";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export type BulkPdfScope =
  | { mode: "all" }
  | { mode: "region"; region: string }
  | { mode: "sucursal"; sucursalNombre: string };

export class NoCotizacionesForZipError extends Error {
  constructor() {
    super("No hay cotizaciones para descargar.");
    this.name = "NoCotizacionesForZipError";
  }
}

function filterRowsByScope(rows: CotizacionWithRelations[], scope: BulkPdfScope): CotizacionWithRelations[] {
  if (scope.mode === "all") return rows;
  if (scope.mode === "region") {
    return rows.filter((row) => regionLabel(row) === scope.region);
  }
  return rows.filter((row) => sucursalLabel(row) === scope.sucursalNombre);
}

function zipPathForQuote(scope: BulkPdfScope, row: CotizacionWithRelations, fileName: string): string {
  const region = sanitizeZipPathSegment(regionLabel(row));
  const sucursal = sanitizeZipPathSegment(sucursalLabel(row));

  if (scope.mode === "all") {
    return `pdf_regiones/${region}/${sucursal}/${fileName}`;
  }
  if (scope.mode === "region") {
    return `${region}/${sucursal}/${fileName}`;
  }
  return `${sucursal}/${fileName}`;
}

function sortRowsForZip(rows: CotizacionWithRelations[]): CotizacionWithRelations[] {
  const byRegion = new Map<string, Map<string, CotizacionWithRelations[]>>();

  for (const row of rows) {
    const region = regionLabel(row);
    const sucursal = sucursalLabel(row);
    if (!byRegion.has(region)) byRegion.set(region, new Map());
    const bySucursal = byRegion.get(region)!;
    if (!bySucursal.has(sucursal)) bySucursal.set(sucursal, []);
    bySucursal.get(sucursal)!.push(row);
  }

  const sorted: CotizacionWithRelations[] = [];
  for (const region of sortRegionKeys([...byRegion.keys()])) {
    const bySucursal = byRegion.get(region)!;
    const sucursales = [...bySucursal.keys()].sort((a, b) => a.localeCompare(b, "es"));
    for (const sucursal of sucursales) {
      const cotizaciones = bySucursal
        .get(sucursal)!
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      sorted.push(...cotizaciones);
    }
  }

  return sorted;
}

function zipDownloadFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `pdfs-cotizaciones-${date}.zip`;
}

export async function downloadCotizacionesPdfZip(
  rows: CotizacionWithRelations[],
  scope: BulkPdfScope,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const filtered = sortRowsForZip(filterRowsByScope(rows, scope));
  if (!filtered.length) {
    throw new NoCotizacionesForZipError();
  }

  const zip = new JSZip();
  const total = filtered.length;

  for (let i = 0; i < filtered.length; i += 1) {
    const row = filtered[i]!;
    const fileName = pdfFileNameFromFolio(row.folio);
    const path = zipPathForQuote(scope, row, fileName);
    const blob = await generateCotizacionPdfBlob(row);
    zip.file(path, blob);
    onProgress?.(i + 1, total);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zipDownloadFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}
