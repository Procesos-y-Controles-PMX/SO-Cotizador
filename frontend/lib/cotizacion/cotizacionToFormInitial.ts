import type { CotizacionWithRelations, ProductoInput } from "@/lib/queries/cotizaciones";
import type { CtzCotizacion, CtzUsuario } from "@/lib/types/db";

export type CotizacionFormInitial = {
  id?: string;
  id_sucursal: string;
  id_cliente: string | null;
  id_obra: string | null;
  nombre_obra: string | null;
  tipo_pago: "Contado" | "Crédito" | "Credito" | null;
  referencia_pago: string | null;
  comentarios: string | null;
  mostrar_con_iva: boolean;
  iva_porcentaje?: number;
  productos: ProductoInput[];
};

export function cotizacionToFormInitial(
  data: CotizacionWithRelations,
  options?: { includeId?: boolean }
): CotizacionFormInitial {
  const initial: CotizacionFormInitial = {
    id_sucursal: data.id_sucursal,
    id_cliente: data.id_cliente,
    id_obra: data.id_obra,
    nombre_obra: data.nombre_obra,
    tipo_pago: data.tipo_pago,
    referencia_pago: data.referencia_pago,
    comentarios: data.comentarios,
    mostrar_con_iva: data.mostrar_con_iva,
    iva_porcentaje: data.iva_porcentaje ?? data.ctz_cotizacion_items[0]?.iva_porcentaje ?? 16,
    productos: data.ctz_cotizacion_items.map((row) => ({
      id_producto: row.id_producto,
      descripcion_registro: row.descripcion_registro,
      cantidad: row.cantidad,
      unidad_medida: row.unidad_medida,
      precio_unitario: row.precio_unitario,
      iva_porcentaje: row.iva_porcentaje,
      subtotal_item: row.subtotal_item,
      total_item: row.total_item,
    })),
  };

  if (options?.includeId !== false) {
    initial.id = data.id;
  }

  return initial;
}

export function canDuplicateCotizacion(
  user: Pick<CtzUsuario, "id" | "rol">,
  cotizacion: Pick<CtzCotizacion, "id_usuario">
): boolean {
  return user.rol === "admin" || cotizacion.id_usuario === user.id;
}
