"use client";

import { calcLineAmounts, normalizeIvaPct, type IvaPct } from "@/lib/cotizacion/calcImportes";
import type { CtzProducto, CtzSucursal } from "@/lib/types/db";

/**
 * Cotización en curso: el objeto que vive en la barra inferior y sobrevive a la
 * navegación entre rutas.
 *
 * Guarda **ids**, no nombres: lo que se arma aquí termina en `createCotizacion`,
 * que necesita `id_sucursal`, `id_cliente` e `id_obra` reales. El nombre va al
 * lado sólo para pintarlo sin volver a consultar.
 *
 * Los importes salen de `calcLineAmounts`, el mismo cálculo del formulario
 * completo, así que los totales de la barra son los que se persisten.
 */

const KEY = "so-cotizador-borrador";

export type BorradorPartida = {
  idProducto: string;
  sku: string;
  descripcion: string;
  unidad: string | null;
  /** Neto, antes de IVA — igual que `precio_unitario` en BD. */
  precioUnitario: number;
  cantidad: number;
};

export type BorradorSucursal = {
  id: string;
  nombre: string;
  prefijoFolio: string;
  direccion: string | null;
  terminos: string | null;
};

export type Borrador = {
  sucursal: BorradorSucursal | null;
  cliente: { id: string; nombre: string } | null;
  /** `id` null = obra suelta capturada por nombre, como en el formulario. */
  obra: { id: string | null; nombre: string } | null;
  tipoPago: "Contado" | "Crédito";
  ivaPct: IvaPct;
  partidas: BorradorPartida[];
  creadoEn: string;
};

export function crearBorrador(): Borrador {
  return {
    sucursal: null,
    cliente: null,
    obra: null,
    tipoPago: "Contado",
    ivaPct: 16,
    partidas: [],
    creadoEn: new Date().toISOString(),
  };
}

/** Un borrador guardado por una versión anterior no debe tumbar la pantalla. */
function sanear(raw: unknown): Borrador | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<Borrador>;
  if (!Array.isArray(parsed.partidas)) return null;
  return {
    ...crearBorrador(),
    ...parsed,
    ivaPct: normalizeIvaPct(parsed.ivaPct),
    partidas: parsed.partidas.filter((partida) => partida && typeof partida.idProducto === "string"),
  };
}

export function leerBorrador(): Borrador | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanear(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function persistirBorrador(borrador: Borrador | null) {
  try {
    if (borrador) window.localStorage.setItem(KEY, JSON.stringify(borrador));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* modo privado: el borrador se pierde al recargar, nada más */
  }
}

/** Agregar dos veces el mismo SKU suma cantidad, no duplica la partida. */
export function agregarProducto(borrador: Borrador | null, producto: CtzProducto): Borrador {
  const base = borrador ?? crearBorrador();
  const yaEsta = base.partidas.some((partida) => partida.idProducto === producto.id);

  if (yaEsta) {
    return {
      ...base,
      partidas: base.partidas.map((partida) =>
        partida.idProducto === producto.id ? { ...partida, cantidad: partida.cantidad + 1 } : partida,
      ),
    };
  }

  return {
    ...base,
    partidas: [
      ...base.partidas,
      {
        idProducto: producto.id,
        sku: producto.sku ?? "—",
        descripcion: producto.descripcion,
        unidad: producto.unidad_medida,
        precioUnitario: Number(producto.precio_unitario_base) || 0,
        cantidad: 1,
      },
    ],
  };
}

export function actualizarPartida(
  borrador: Borrador,
  idProducto: string,
  patch: Partial<Pick<BorradorPartida, "cantidad" | "precioUnitario">>,
): Borrador {
  return {
    ...borrador,
    partidas: borrador.partidas.map((partida) =>
      partida.idProducto === idProducto ? { ...partida, ...patch } : partida,
    ),
  };
}

export function quitarPartida(borrador: Borrador, idProducto: string): Borrador {
  return {
    ...borrador,
    partidas: borrador.partidas.filter((partida) => partida.idProducto !== idProducto),
  };
}

/**
 * La sucursal arrastra su IVA predeterminado y sus términos, igual que en el
 * formulario: elegirla no es sólo etiquetar, define cómo se cobra.
 */
export function fijarSucursal(borrador: Borrador | null, sucursal: CtzSucursal): Borrador {
  const base = borrador ?? crearBorrador();
  return {
    ...base,
    sucursal: {
      id: sucursal.id,
      nombre: sucursal.nombre,
      prefijoFolio: sucursal.prefijo_folio,
      direccion: sucursal.direccion,
      terminos: sucursal.terminos_adicionales,
    },
    ivaPct: normalizeIvaPct(sucursal.iva_predeterminado),
  };
}

export function fijarCliente(borrador: Borrador | null, cliente: { id: string; nombre: string }): Borrador {
  const base = borrador ?? crearBorrador();
  // Cambiar de cliente invalida la obra: las obras cuelgan de un cliente.
  const mismoCliente = base.cliente?.id === cliente.id;
  return { ...base, cliente, obra: mismoCliente ? base.obra : null };
}

export function fijarObra(borrador: Borrador | null, obra: { id: string | null; nombre: string }): Borrador {
  return { ...(borrador ?? crearBorrador()), obra };
}

export type Importes = { subtotal: number; iva: number; total: number };

export function importes(borrador: Borrador | null): Importes {
  if (!borrador) return { subtotal: 0, iva: 0, total: 0 };

  return borrador.partidas.reduce<Importes>(
    (acc, partida) => {
      // `false`: los precios del borrador son netos, como los guarda la BD.
      const linea = calcLineAmounts(partida.cantidad, partida.precioUnitario, borrador.ivaPct, false);
      return {
        subtotal: acc.subtotal + linea.subtotal_item,
        iva: acc.iva + (linea.total_item - linea.subtotal_item),
        total: acc.total + linea.total_item,
      };
    },
    { subtotal: 0, iva: 0, total: 0 },
  );
}

export const PASOS_TOTALES = 3;

export function pasosListos(borrador: Borrador | null): number {
  if (!borrador) return 0;
  return (
    (borrador.sucursal ? 1 : 0) +
    (borrador.cliente ? 1 : 0) +
    (borrador.partidas.some((partida) => partida.cantidad > 0) ? 1 : 0)
  );
}

/** Lo que `createCotizacion` exige como mínimo para no rebotar. */
export function listaParaGuardar(borrador: Borrador | null): boolean {
  return pasosListos(borrador) === PASOS_TOTALES;
}

export function faltanteBorrador(borrador: Borrador | null): string | null {
  if (!borrador?.sucursal) return "Falta la sucursal.";
  if (!borrador.cliente) return "Falta el cliente.";
  if (!borrador.partidas.some((partida) => partida.cantidad > 0)) return "Falta al menos una partida con cantidad.";
  return null;
}
