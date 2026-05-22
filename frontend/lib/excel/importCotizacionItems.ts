import { calcLineAmounts, normalizeIvaPct } from "@/lib/cotizacion/calcImportes";
import type { ItemInput } from "@/lib/queries/cotizaciones";
import type { CtzProducto } from "@/lib/types/db";

export const EXCEL_IMPORT_MAX_ROWS = 500;

/** Fila 1 de la plantilla .xlsx descargable; misma semántica que `resolveExcelRowsToImport`. */
export const COTIZACION_ITEMS_EXCEL_TEMPLATE_HEADERS = [
  "SKU (obligatorio)",
  "Cantidad (opcional)",
  "Precio (opcional)",
] as const;

export const COTIZACION_ITEMS_EXCEL_TEMPLATE_FILENAME = "plantilla-items-cotizacion.xlsx";

/** Genera y descarga la plantilla vacía (encabezados + filas en blanco para captura). */
export async function downloadCotizacionItemsExcelTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const headers = [...COTIZACION_ITEMS_EXCEL_TEMPLATE_HEADERS];
  const blank = (): null[] => headers.map(() => null);
  const sheetData: (string | null)[][] = [headers, blank(), blank(), blank()];
  await writeXlsxFile(sheetData, {
    sheet: "Items",
    columns: headers.map(() => ({ width: 24 })),
  }).toFile(COTIZACION_ITEMS_EXCEL_TEMPLATE_FILENAME);
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function normalizeSkuKey(sku: string): string {
  return sku.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDecimal(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Mapa SKU normalizado -> producto (primer match si hubiera duplicado en BD). */
export function buildSkuProductMap(productos: CtzProducto[]): Map<string, CtzProducto> {
  const map = new Map<string, CtzProducto>();
  for (const p of productos) {
    if (p.sku == null || !String(p.sku).trim()) continue;
    const key = normalizeSkuKey(String(p.sku));
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

function normalizeHeader(h: unknown): string {
  return stripAccents(cellToString(h).toLowerCase()).replace(/\s+/g, " ");
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function stripKnownHeaderSuffix(label: string): string {
  return label
    .replace(/\s*\(\s*obligatorio\s*\)\s*$/i, "")
    .replace(/\s*\(\s*opcional\s*\)\s*$/i, "")
    .trim();
}

function findColumnIndex(headers: unknown[], candidates: string[]): number {
  const lowered = candidates.map((c) =>
    stripKnownHeaderSuffix(stripAccents(c.toLowerCase()).replace(/\s+/g, " "))
  );
  for (let i = 0; i < headers.length; i++) {
    const raw = normalizeHeader(headers[i]);
    if (!raw) continue;
    const h = stripKnownHeaderSuffix(raw);
    if (!h) continue;
    for (const c of lowered) {
      if (h === c || h.replace(/\s/g, "") === c.replace(/\s/g, "")) return i;
    }
  }
  return -1;
}

export type ExcelImportOkRow = {
  excelRowIndex: number;
  skuRaw: string;
  product: CtzProducto;
  cantidad: number;
  precio_unitario: number;
};

export type ExcelImportFailRow = {
  excelRowIndex: number;
  skuRaw: string;
  reason: string;
};

export type ExcelImportPreview = {
  ok: ExcelImportOkRow[];
  failed: ExcelImportFailRow[];
};

/**
 * rows: primera fila = encabezados; siguientes = datos.
 * Encabezados reconocidos (mayúsculas/minúsculas indistinto; se ignoran acentos en la búsqueda):
 * - SKU (obligatorio) o "SKU", "clave", "codigo", etc.
 * - Cantidad (opcional) o "cantidad", "qty", etc.
 * - Precio (opcional) o "precio", "p.u.", etc.
 * El IVA es global en la cotización (no se lee del Excel; si el archivo trae columna IVA, se ignora).
 * La unidad de medida no se toma del Excel: siempre la del catalogo al hacer match por SKU.
 * Los sufijos "(obligatorio)" y "(opcional)" en el título se quitan solo para emparejar la columna.
 */
export function resolveExcelRowsToImport(
  rows: unknown[][],
  skuMap: Map<string, CtzProducto>
): { preview: ExcelImportPreview; error: string | null } {
  if (!rows.length) return { preview: { ok: [], failed: [] }, error: "El archivo no tiene filas." };

  const headerRow = rows[0];
  const skuCol = findColumnIndex(headerRow, [
    COTIZACION_ITEMS_EXCEL_TEMPLATE_HEADERS[0],
    "sku",
    "sku (obligatorio)",
    "clave",
    "codigo",
    "código",
    "codigo sku",
  ]);
  if (skuCol < 0) return { preview: { ok: [], failed: [] }, error: "No se encontro columna SKU (ej. SKU o SKU (obligatorio))." };

  const cantCol = findColumnIndex(headerRow, [
    COTIZACION_ITEMS_EXCEL_TEMPLATE_HEADERS[1],
    "cantidad",
    "cantidad (opcional)",
    "cant",
    "qty",
    "piezas",
  ]);
  const precioCol = findColumnIndex(headerRow, [
    COTIZACION_ITEMS_EXCEL_TEMPLATE_HEADERS[2],
    "precio",
    "precio (opcional)",
    "p.u.",
    "pu",
    "precio unitario",
    "precio unit.",
  ]);

  const ok: ExcelImportOkRow[] = [];
  const failed: ExcelImportFailRow[] = [];

  const dataRows = rows.slice(1);
  if (dataRows.length > EXCEL_IMPORT_MAX_ROWS) {
    return {
      preview: { ok: [], failed: [] },
      error: `El archivo supera el maximo de ${EXCEL_IMPORT_MAX_ROWS} filas de datos.`,
    };
  }

  dataRows.forEach((row, idx) => {
    const excelRowIndex = idx + 2;
    const skuRaw = cellToString(row[skuCol]);
    if (!skuRaw) return;

    const key = normalizeSkuKey(skuRaw);
    const product = skuMap.get(key);
    if (!product) {
      failed.push({ excelRowIndex, skuRaw, reason: "SKU no encontrado en catalogo." });
      return;
    }

    let cantidad = 1;
    if (cantCol >= 0) {
      const c = parseDecimal(cellToString(row[cantCol]));
      if (c !== null && c > 0) cantidad = c;
    }

    let precio_unitario = product.precio_unitario_base;
    if (precioCol >= 0) {
      const p = parseDecimal(cellToString(row[precioCol]));
      if (p !== null && p >= 0) precio_unitario = p;
    }

    ok.push({
      excelRowIndex,
      skuRaw,
      product,
      cantidad,
      precio_unitario,
    });
  });

  if (!ok.length && !failed.length) {
    return { preview: { ok: [], failed: [] }, error: "No hay filas con SKU para importar." };
  }

  return { preview: { ok, failed }, error: null };
}

export async function parseExcelFile(file: File): Promise<unknown[][]> {
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = await readXlsxFile(file);
  const first = sheets[0]?.data;
  if (!first) return [];
  return first as unknown[][];
}

export function previewOkToItemInputs(
  rows: ExcelImportOkRow[],
  ivaPorcentaje: number,
  preciosIncluyenIva: boolean
): ItemInput[] {
  const iva = normalizeIvaPct(ivaPorcentaje);
  return rows.map((r) => {
    const amounts = calcLineAmounts(r.cantidad, r.precio_unitario, iva, preciosIncluyenIva);
    return {
      id_producto: r.product.id,
      descripcion_registro: r.product.descripcion,
      cantidad: r.cantidad,
      unidad_medida: r.product.unidad_medida,
      iva_porcentaje: iva,
      ...amounts,
    };
  });
}
