"use client";

import { calcLineAmounts } from "@/lib/cotizacion/calcImportes";
import { toDbTipoPago } from "@/lib/cotizacion/tipoPago";
import { generarFolio } from "@/lib/folio";
import { createCotizacion, type ProductoInput } from "@/lib/queries/cotizaciones";
import type { CtzUsuario } from "@/lib/types/db";
import { faltanteBorrador, importes, type Borrador } from "./model";

/**
 * Persiste el borrador de la barra inferior.
 *
 * No reimplementa el guardado: arma el payload y se lo pasa a
 * `createCotizacion`, el mismo camino que usa `CotizacionForm` — con su inserción
 * de partidas y su rollback del encabezado si esas fallan. El reintento por
 * folio duplicado también es el del formulario: `generarFolio` lleva tiempo y
 * azar, así que un choque se resuelve volviéndolo a pedir.
 */

const INTENTOS_FOLIO = 3;

export type GuardarResultado =
  | { ok: true; id: string }
  | { ok: false; mensaje: string };

export async function guardarCotizacionDesdeBorrador(
  borrador: Borrador,
  usuario: CtzUsuario,
): Promise<GuardarResultado> {
  const faltante = faltanteBorrador(borrador);
  if (faltante) return { ok: false, mensaje: faltante };

  const sucursal = borrador.sucursal!;
  const cliente = borrador.cliente!;
  const totales = importes(borrador);

  const productos: ProductoInput[] = borrador.partidas
    .filter((partida) => partida.cantidad > 0)
    .map((partida) => {
      const linea = calcLineAmounts(partida.cantidad, partida.precioUnitario, borrador.ivaPct, false);
      return {
        id_producto: partida.idProducto,
        descripcion_registro: partida.descripcion,
        cantidad: partida.cantidad,
        unidad_medida: partida.unidad,
        precio_unitario: linea.precio_unitario,
        iva_porcentaje: borrador.ivaPct,
        subtotal_item: linea.subtotal_item,
        total_item: linea.total_item,
      };
    });

  const base = {
    id_usuario: usuario.id,
    id_sucursal: sucursal.id,
    id_cliente: cliente.id,
    id_obra: borrador.obra?.id ?? null,
    nombre_obra: borrador.obra?.id ? null : (borrador.obra?.nombre ?? null),
    tipo_pago: toDbTipoPago(borrador.tipoPago),
    referencia_pago: null,
    comentarios: null,
    // La barra captura precios netos; el PDF decide después si los muestra con IVA.
    mostrar_con_iva: false,
    iva_porcentaje: borrador.ivaPct,
    subtotal: totales.subtotal,
    iva_total: totales.iva,
    total: totales.total,
    terminos_adicionales: sucursal.terminos?.trim() || null,
    direccion_sucursal: sucursal.direccion?.trim() || null,
    venta_cerrada: false,
  };

  let ultimo = "";
  for (let intento = 0; intento < INTENTOS_FOLIO; intento++) {
    const resultado = await createCotizacion({
      cotizacion: { folio: generarFolio(sucursal.prefijoFolio), ...base },
      productos,
    });

    if (resultado.ok) return { ok: true, id: resultado.id };
    if (resultado.error !== "duplicate_folio") return { ok: false, mensaje: mensajeError(resultado.error) };
    ultimo = mensajeError(resultado.error);
  }

  return { ok: false, mensaje: ultimo || "No se pudo generar un folio único." };
}

function mensajeError(error: string): string {
  switch (error) {
    case "duplicate_folio":
      return "El folio ya existe. Intenta de nuevo.";
    case "invalid_reference":
      return "La sucursal, el cliente o la obra ya no existen. Vuelve a elegirlos.";
    case "cliente_sucursal":
      // La BD valida que el cliente cuelgue de la sucursal; la búsqueda global
      // no filtra por eso, así que este choque es esperable.
      return "Ese cliente u obra no pertenece a la sucursal elegida.";
    case "productos":
      return "No se pudieron guardar las partidas.";
    default:
      return "No se pudo guardar la cotización.";
  }
}
