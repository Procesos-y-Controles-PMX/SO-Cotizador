import {
  groupCotizacionesByRegionAndSucursal,
  sortRegionKeys,
} from "@/lib/cotizacion/groupByRegion";
import { formatTipoPago } from "@/lib/cotizacion/tipoPago";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import { money } from "@/lib/utils";

export const HISTORIAL_COTIZACIONES_XLSX_FILENAME = "historial-cotizaciones.xlsx";

const COLUMN_COUNT = 8;

const HEADERS = [
  "Folio",
  "Fecha",
  "Cliente",
  "Obra",
  "Total",
  "Tipo de pago",
  "Venta cerrada",
  "Cotizó",
] as const;

type SheetCell = string | null | { value: string; fontWeight?: "bold"; columnSpan?: number };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX");
}

function rowToCells(row: CotizacionWithRelations): SheetCell[] {
  return [
    row.folio,
    formatDate(row.created_at),
    row.ctz_clientes?.nombre_cliente ?? "-",
    row.nombre_obra ?? "-",
    money(row.total),
    formatTipoPago(row.tipo_pago),
    row.venta_cerrada ? "SI" : "NO",
    row.ctz_usuarios?.nombre_completo ?? row.ctz_usuarios?.email ?? "-",
  ];
}

function sectionTitle(text: string): SheetCell[] {
  const row: SheetCell[] = [{ value: text, fontWeight: "bold", columnSpan: COLUMN_COUNT }];
  while (row.length < COLUMN_COUNT) row.push(null);
  return row;
}

function buildGroupedSheet(rows: CotizacionWithRelations[]): SheetCell[][] {
  const byRegion = groupCotizacionesByRegionAndSucursal(rows);
  const sheet: SheetCell[][] = [];
  let firstRegion = true;

  for (const region of sortRegionKeys([...byRegion.keys()])) {
    if (!firstRegion) sheet.push(Array(COLUMN_COUNT).fill(null));
    firstRegion = false;
    sheet.push(sectionTitle(`REGIÓN: ${region}`));

    const bySucursal = byRegion.get(region)!;
    const sucursales = [...bySucursal.keys()].sort((a, b) => a.localeCompare(b, "es"));

    for (const sucursal of sucursales) {
      const cotizaciones = bySucursal
        .get(sucursal)!
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      sheet.push(sectionTitle(`  SUCURSAL: ${sucursal}`));
      sheet.push([...HEADERS]);

      let totalMonto = 0;
      let cerradas = 0;
      for (const cot of cotizaciones) {
        sheet.push(rowToCells(cot));
        totalMonto += cot.total;
        if (cot.venta_cerrada) cerradas += 1;
      }

      sheet.push([
        {
          value: `Subtotal (${cotizaciones.length} cotizaciones, ${cerradas} cerradas)`,
          fontWeight: "bold",
        },
        null,
        null,
        null,
        { value: money(totalMonto), fontWeight: "bold" },
        null,
        null,
        null,
      ]);
    }
  }

  return sheet;
}

export async function downloadHistorialCotizacionesExcel(rows: CotizacionWithRelations[]): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const sheetData = rows.length ? buildGroupedSheet(rows) : [[...HEADERS]];

  await writeXlsxFile(sheetData, {
    sheet: "Historial",
    columns: HEADERS.map(() => ({ width: 24 })),
  }).toFile(HISTORIAL_COTIZACIONES_XLSX_FILENAME);
}
