import { regionLabel, sortRegionKeys, sucursalLabel } from "@/lib/cotizacion/groupByRegion";
import { formatTipoPago } from "@/lib/cotizacion/tipoPago";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";

export const HISTORIAL_COTIZACIONES_XLSX_FILENAME = "historial-cotizaciones.xlsx";

const HEADERS = [
  "Región",
  "Sucursal",
  "Folio",
  "Fecha",
  "Cliente",
  "Obra",
  "Subtotal cotización",
  "IVA cotización",
  "Total cotización",
  "Tipo de pago",
  "Venta cerrada",
  "Cotizó",
  "SKU",
  "Producto",
  "UM",
  "Cantidad",
  "Precio unitario",
  "Subtotal línea",
  "Total línea",
] as const;

type SheetCell = string | number | null;
type SheetRow = SheetCell[];

function toNum(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX");
}

function sortCotizaciones(rows: CotizacionWithRelations[]): CotizacionWithRelations[] {
  const regionOrder = new Map(sortRegionKeys([...new Set(rows.map(regionLabel))]).map((r, i) => [r, i]));

  return [...rows].sort((a, b) => {
    const ra = regionOrder.get(regionLabel(a)) ?? 999;
    const rb = regionOrder.get(regionLabel(b)) ?? 999;
    if (ra !== rb) return ra - rb;

    const sucCmp = sucursalLabel(a).localeCompare(sucursalLabel(b), "es");
    if (sucCmp !== 0) return sucCmp;

    const dateCmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (dateCmp !== 0) return dateCmp;

    return a.folio.localeCompare(b.folio, "es");
  });
}

function cotizacionBaseCells(row: CotizacionWithRelations): SheetRow {
  return [
    regionLabel(row),
    sucursalLabel(row),
    row.folio,
    formatDate(row.created_at),
    row.ctz_clientes?.nombre_cliente ?? "-",
    row.nombre_obra ?? "-",
    toNum(row.subtotal),
    toNum(row.iva_total),
    toNum(row.total),
    formatTipoPago(row.tipo_pago),
    row.venta_cerrada ? "SI" : "NO",
    row.ctz_usuarios?.nombre_completo ?? row.ctz_usuarios?.email ?? "-",
  ];
}

function productoCells(
  item: CotizacionWithRelations["ctz_cotizacion_items"][number]
): SheetRow {
  const productoNombre =
    item.descripcion_registro?.trim() ||
    item.ctz_productos?.descripcion?.trim() ||
    "-";

  return [
    item.ctz_productos?.sku?.trim() || "-",
    productoNombre,
    item.unidad_medida?.trim() || "-",
    toNum(item.cantidad),
    toNum(item.precio_unitario),
    toNum(item.subtotal_item),
    toNum(item.total_item),
  ];
}

const EMPTY_PRODUCTO_CELLS: SheetRow = ["-", "-", "-", null, null, null, null];

function buildFlatSheet(rows: CotizacionWithRelations[]): SheetRow[] {
  const sheet: SheetRow[] = [[...HEADERS]];
  const sorted = sortCotizaciones(rows);

  for (const cot of sorted) {
    const base = cotizacionBaseCells(cot);
    const items = cot.ctz_cotizacion_items ?? [];

    if (!items.length) {
      sheet.push([...base, ...EMPTY_PRODUCTO_CELLS]);
      continue;
    }

    for (const item of items) {
      sheet.push([...base, ...productoCells(item)]);
    }
  }

  return sheet;
}

export async function downloadHistorialCotizacionesExcel(rows: CotizacionWithRelations[]): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const sheetData = buildFlatSheet(rows);

  await writeXlsxFile(sheetData, {
    sheet: "Historial",
    columns: [
      { width: 18 },
      { width: 22 },
      { width: 20 },
      { width: 12 },
      { width: 24 },
      { width: 22 },
      { width: 16 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 22 },
      { width: 14 },
      { width: 36 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
    ],
  }).toFile(HISTORIAL_COTIZACIONES_XLSX_FILENAME);
}
