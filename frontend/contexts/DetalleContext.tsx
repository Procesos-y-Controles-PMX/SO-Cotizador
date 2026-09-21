"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SearchHit } from "@/lib/queries/globalSearch";

/**
 * Canal para que una página abra el panel de detalle del shell.
 *
 * Sin esto la única forma de llenar el panel es la búsqueda global, y las
 * tablas de cada ruta quedan mudas: se ven filas que no se pueden seleccionar.
 *
 * `useDetalle` no revienta fuera del shell — devuelve un no-op. Así una página
 * puede ofrecer la selección sin exigir que el layout la envuelva.
 */

type DetalleContextValue = {
  abrir: (hit: SearchHit) => void;
  /** `${kind}:${id}` de lo seleccionado, para resaltar la fila. */
  seleccionadoKey: string | null;
  /** El panel ocupa ancho: las tablas pueden apretarse en vez de desbordarse. */
  abierto: boolean;
};

const SIN_SHELL: DetalleContextValue = {
  abrir: () => {},
  seleccionadoKey: null,
  abierto: false,
};

const DetalleContext = createContext<DetalleContextValue>(SIN_SHELL);

export function DetalleProvider({
  value,
  children,
}: {
  value: DetalleContextValue;
  children: ReactNode;
}) {
  return <DetalleContext.Provider value={value}>{children}</DetalleContext.Provider>;
}

export function useDetalle(): DetalleContextValue {
  return useContext(DetalleContext);
}
