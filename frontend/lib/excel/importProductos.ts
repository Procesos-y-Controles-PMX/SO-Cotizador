import { parseExcelFile } from "./importCotizacionProductos";
import { cellToString, findColumnIndex } from "./importUsuarios";

export const PRODUCTOS_EXCEL_TEMPLATE_HEADERS = ["SKU", "Descripción", "U.M.", "Precio base"] as const;
export const PRODUCTOS_EXCEL_TEMPLATE_FILENAME = "plantilla-skus.xlsx";
export const PRODUCTOS_EXCEL_IMPORT_MAX_ROWS = 2000;

export type ProductosExcelOkRow = {
  excelRowIndex: number;
  sku: string | null;
  descripcion: string;
  unidad_medida: string | null;
  precio_unitario_base: number;
};

export type ProductosExcelFailRow = {
  excelRowIndex: number;
  label: string;
  reason: string;
};

export type ProductosExcelSkippedRow = {
  excelRowIndex: number;
  sku: string;
  reason: string;
};

export type ProductosExcelImportPreview = {
  ok: ProductosExcelOkRow[];
  failed: ProductosExcelFailRow[];
  skipped: ProductosExcelSkippedRow[];
};

export async function downloadProductosExcelTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const headers = [...PRODUCTOS_EXCEL_TEMPLATE_HEADERS];
  const blank = (): null[] => headers.map(() => null);
  const sheetData: (string | null)[][] = [headers, blank(), blank(), blank()];
  await writeXlsxFile(sheetData, {
    sheet: "SKUs",
    columns: [{ width: 18 }, { width: 48 }, { width: 10 }, { width: 14 }],
  }).toFile(PRODUCTOS_EXCEL_TEMPLATE_FILENAME);
}

export async function parseProductosExcelFile(file: File): Promise<unknown[][]> {
  return parseExcelFile(file);
}

function parsePrecio(raw: string): number | null {
  if (!raw) return 0;
  const cleaned = raw.replace(/[$\s]/g, "").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function resolveProductosExcelRows(
  rows: unknown[][],
  existingSkus: Set<string>
): { preview: ProductosExcelImportPreview; error: string | null } {
  const empty: ProductosExcelImportPreview = { ok: [], failed: [], skipped: [] };
  if (!rows.length) return { preview: empty, error: "El archivo no tiene filas." };

  const headerRow = rows[0];
  const skuCol = findColumnIndex(headerRow, [PRODUCTOS_EXCEL_TEMPLATE_HEADERS[0], "sku", "clave", "codigo"]);
  const descCol = findColumnIndex(headerRow, [
    PRODUCTOS_EXCEL_TEMPLATE_HEADERS[1],
    "descripcion",
    "producto",
    "nombre",
  ]);
  const umCol = findColumnIndex(headerRow, [
    PRODUCTOS_EXCEL_TEMPLATE_HEADERS[2],
    "um",
    "u.m.",
    "unidad",
    "unidad de medida",
    "unidad_medida",
  ]);
  const precioCol = findColumnIndex(headerRow, [
    PRODUCTOS_EXCEL_TEMPLATE_HEADERS[3],
    "precio base",
    "precio",
    "precio unitario",
    "precio_unitario_base",
  ]);

  if (descCol < 0) {
    return {
      preview: empty,
      error: 'No se encontró la columna "Descripción" en la primera fila.',
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > PRODUCTOS_EXCEL_IMPORT_MAX_ROWS) {
    return {
      preview: empty,
      error: `El archivo supera el máximo de ${PRODUCTOS_EXCEL_IMPORT_MAX_ROWS} filas de datos.`,
    };
  }

  const ok: ProductosExcelOkRow[] = [];
  const failed: ProductosExcelFailRow[] = [];
  const skipped: ProductosExcelSkippedRow[] = [];
  const seenSkusInFile = new Set<string>();

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    const excelRowIndex = idx + 2;
    const sku = skuCol >= 0 ? cellToString(row[skuCol]) : "";
    const descripcion = cellToString(row[descCol]);
    const unidadMedida = umCol >= 0 ? cellToString(row[umCol]) : "";
    const precioRaw = precioCol >= 0 ? cellToString(row[precioCol]) : "";

    if (!sku && !descripcion && !unidadMedida && !precioRaw) continue;

    const label = sku || descripcion || "(sin datos)";

    if (!descripcion) {
      failed.push({ excelRowIndex, label, reason: "Descripción vacía." });
      continue;
    }

    const precio = parsePrecio(precioRaw);
    if (precio === null) {
      failed.push({ excelRowIndex, label, reason: `Precio base inválido: "${precioRaw}".` });
      continue;
    }

    if (sku) {
      const skuKey = sku.toLowerCase();
      if (seenSkusInFile.has(skuKey)) {
        failed.push({ excelRowIndex, label, reason: "SKU duplicado en el archivo." });
        continue;
      }
      seenSkusInFile.add(skuKey);

      if (existingSkus.has(skuKey)) {
        skipped.push({ excelRowIndex, sku, reason: "SKU ya registrado en la base de datos." });
        continue;
      }
    }

    ok.push({
      excelRowIndex,
      sku: sku || null,
      descripcion,
      unidad_medida: unidadMedida || null,
      precio_unitario_base: precio,
    });
  }

  if (!ok.length && !failed.length && !skipped.length) {
    return { preview: empty, error: "No hay filas con datos para importar." };
  }

  return { preview: { ok, failed, skipped }, error: null };
}
