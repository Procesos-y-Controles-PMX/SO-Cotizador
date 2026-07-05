import type { CtzProducto } from "@/lib/types/db";

export const PRODUCTOS_EXPORT_FILENAME = "listado-skus.xlsx";

const HEADERS = ["SKU", "Descripción", "U.M.", "Precio base", "Activo"] as const;

function sortProductos(rows: CtzProducto[]): CtzProducto[] {
  return [...rows].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    return a.descripcion.localeCompare(b.descripcion, "es");
  });
}

export async function downloadProductosExcel(productos: CtzProducto[]): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const sorted = sortProductos(productos);
  const sheetData: (string | null)[][] = [
    [...HEADERS],
    ...sorted.map((p) => [
      p.sku ?? "",
      p.descripcion,
      p.unidad_medida ?? "",
      p.precio_unitario_base.toFixed(2),
      p.activo ? "Sí" : "No",
    ]),
  ];

  await writeXlsxFile(sheetData, {
    sheet: "Listado de SKUs",
    columns: [{ width: 18 }, { width: 48 }, { width: 10 }, { width: 14 }, { width: 10 }],
  }).toFile(PRODUCTOS_EXPORT_FILENAME);
}
