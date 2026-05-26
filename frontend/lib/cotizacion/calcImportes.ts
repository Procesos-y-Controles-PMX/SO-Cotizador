export type IvaPct = 8 | 16;

export function normalizeIvaPct(value: number | undefined | null): IvaPct {
  const n = Math.round(Number(value));
  if (n === 8) return 8;
  return 16;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export type LineAmounts = {
  /** Siempre neto (antes de IVA), persistido en BD */
  precio_unitario: number;
  subtotal_item: number;
  total_item: number;
  /** Precio unitario con IVA incluido (para UI/PDF) */
  puConIva: number;
};

/**
 * @param precioCapturado Lo que escribe el usuario (antes de IVA o con IVA según preciosIncluyenIva)
 */
export function calcLineAmounts(
  cantidad: number,
  precioCapturado: number,
  ivaPct: IvaPct,
  preciosIncluyenIva: boolean
): LineAmounts {
  const qty = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
  const precio = Number.isFinite(precioCapturado) && precioCapturado >= 0 ? precioCapturado : 0;
  const factor = 1 + ivaPct / 100;

  if (preciosIncluyenIva) {
    const puConIva = round2(precio);
    const precio_unitario = factor > 0 ? round2(puConIva / factor) : 0;
    const total_item = round2(qty * puConIva);
    const subtotal_item = round2(qty * precio_unitario);
    return { precio_unitario, subtotal_item, total_item, puConIva };
  }

  const precio_unitario = round2(precio);
  const subtotal_item = round2(qty * precio_unitario);
  const total_item = round2(subtotal_item * factor);
  const puConIva = round2(precio_unitario * factor);
  return { precio_unitario, subtotal_item, total_item, puConIva };
}

/** Reconstruye el precio del input al cargar desde BD (no convierte al alternar el botón). */
export function precioCapturadoFromStored(
  producto: { precio_unitario: number; total_item: number; cantidad: number },
  preciosIncluyenIva: boolean
): number {
  if (preciosIncluyenIva && producto.cantidad > 0) {
    return round2(producto.total_item / producto.cantidad);
  }
  return producto.precio_unitario;
}
