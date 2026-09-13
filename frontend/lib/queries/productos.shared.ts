import { SEARCH_MIN_CHARS } from "../search";

/** Mínimo de caracteres para disparar búsqueda (reduce escaneos con términos de 1 letra). */
export const INVENTARIO_SEARCH_MIN_CHARS = SEARCH_MIN_CHARS;

export type ProductoBulkInsertRow = {
  sku: string | null;
  descripcion: string;
  unidad_medida: string | null;
  precio_unitario_base: number;
};
