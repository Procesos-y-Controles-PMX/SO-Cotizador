import type { CtzCotizacion, CtzCotizacionItem } from "../types/db";

export type ProductoInput = {
  id_producto: string | null;
  descripcion_registro: string;
  cantidad: number;
  unidad_medida: string | null;
  precio_unitario: number;
  iva_porcentaje: number;
  subtotal_item: number;
  total_item: number;
};

/** Solo columnas de ctz_cotizacion_items (evita enviar campos UI a PostgREST). */
export function toProductoInput(producto: ProductoInput): ProductoInput {
  return {
    id_producto: producto.id_producto,
    descripcion_registro: producto.descripcion_registro,
    cantidad: producto.cantidad,
    unidad_medida: producto.unidad_medida,
    precio_unitario: producto.precio_unitario,
    iva_porcentaje: producto.iva_porcentaje,
    subtotal_item: producto.subtotal_item,
    total_item: producto.total_item,
  };
}

export type CotizacionWithRelations = CtzCotizacion & {
  ctz_clientes: { nombre_cliente: string } | null;
  ctz_obras: { nombre_obra: string; num_obra: string | null; referencia_pago: string | null } | null;
  ctz_sucursales: {
    nombre: string;
    region: string | null;
    prefijo_folio: string;
  } | null;
  ctz_usuarios: { email: string; nombre_completo: string | null; rol: string } | null;
  ctz_cotizacion_items: (CtzCotizacionItem & {
    ctz_productos: { sku: string | null; descripcion: string } | null;
  })[];
};

export type CreateCotizacionError =
  | "duplicate_folio"
  | "invalid_reference"
  | "cliente_sucursal"
  | "productos"
  | "tipo_pago_invalido"
  | "unknown";

export type CreateCotizacionResult =
  | { ok: true; id: string }
  | { ok: false; error: CreateCotizacionError; message?: string };

export type UpdateVentaCerradaResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "unknown"; message?: string };
