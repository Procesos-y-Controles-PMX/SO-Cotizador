"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { guardarCotizacionDesdeBorrador } from "@/lib/borrador/guardar";
import {
  agregarProducto,
  crearBorrador,
  fijarCliente,
  fijarObra,
  desdeCotizacion,
  fijarSucursal,
  leerBorrador,
  persistirBorrador,
  type Borrador,
} from "@/lib/borrador/model";
import { listSucursales } from "@/lib/queries/sucursales";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import type { CtzProducto, CtzSucursal } from "@/lib/types/db";

/**
 * La cotización en curso vive aquí y no en una página: la barra inferior la
 * muestra en todas las rutas, y el usuario tiene que poder irse al historial o
 * al listado de SKUs sin perderla.
 */

type BorradorContextValue = {
  borrador: Borrador | null;
  expandido: boolean;
  guardando: boolean;
  setExpandido: (valor: boolean) => void;
  aplicar: (next: Borrador | null) => void;
  empezar: () => void;
  descartar: () => void;
  agregarSku: (producto: CtzProducto, etiqueta: string) => void;
  duplicar: (cotizacion: CotizacionWithRelations) => Promise<void>;
  usarSucursal: (sucursal: CtzSucursal) => void;
  usarCliente: (cliente: { id: string; nombre: string }) => void;
  usarObra: (obra: { id: string | null; nombre: string }) => void;
  guardar: () => Promise<void>;
};

const BorradorContext = createContext<BorradorContextValue | null>(null);

export function BorradorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Se hidrata después del montaje: en SSR no hay localStorage.
  useEffect(() => setBorrador(leerBorrador()), []);

  /** Un solo punto de escritura: el estado y localStorage no se separan. */
  const aplicar = useCallback((next: Borrador | null) => {
    setBorrador(next);
    persistirBorrador(next);
  }, []);

  /**
   * Duplicar carga la cotización en la barra. La sucursal se resuelve completa
   * porque la relación no trae dirección ni términos, y de ahí sale el PDF; si
   * no se puede, se duplica igual con lo que hay en vez de fallar.
   */
  const duplicar = useCallback(
    async (cotizacion: CotizacionWithRelations) => {
      let sucursal: CtzSucursal | null = null;
      try {
        const todas = await listSucursales();
        sucursal = todas.find((s) => s.id === cotizacion.id_sucursal) ?? null;
      } catch {
        /* sin catálogo se duplica con lo que trae la cotización */
      }

      aplicar(desdeCotizacion(cotizacion, sucursal));
      setExpandido(true);
      toast.success(`${cotizacion.folio} duplicada. Ajusta y guarda.`);
    },
    [aplicar],
  );

  const guardar = useCallback(async () => {
    if (!borrador || !user || guardando) return;
    setGuardando(true);
    const resultado = await guardarCotizacionDesdeBorrador(borrador, user);
    setGuardando(false);

    if (!resultado.ok) {
      toast.error(resultado.mensaje);
      return;
    }

    aplicar(null);
    setExpandido(false);
    toast.success("Cotización registrada.");
    router.push(`/cotizaciones/${resultado.id}`);
  }, [borrador, user, guardando, aplicar, router]);

  const value = useMemo<BorradorContextValue>(
    () => ({
      borrador,
      expandido,
      guardando,
      setExpandido,
      aplicar,
      empezar: () => {
        aplicar(crearBorrador());
        setExpandido(true);
      },
      descartar: () => {
        aplicar(null);
        setExpandido(false);
        toast.success("Borrador descartado.");
      },
      duplicar,
      agregarSku: (producto, etiqueta) => {
        aplicar(agregarProducto(borrador, producto));
        toast.success(`${etiqueta} agregado a la cotización.`);
      },
      usarSucursal: (sucursal) => {
        aplicar(fijarSucursal(borrador, sucursal));
        toast.success(`Cotizando desde ${sucursal.nombre}.`);
      },
      usarCliente: (cliente) => {
        aplicar(fijarCliente(borrador, cliente));
        toast.success(`Cotizando para ${cliente.nombre}.`);
      },
      usarObra: (obra) => {
        aplicar(fijarObra(borrador, obra));
        toast.success(`Obra ${obra.nombre} agregada.`);
      },
      guardar,
    }),
    [borrador, expandido, guardando, aplicar, guardar, duplicar],
  );

  return <BorradorContext.Provider value={value}>{children}</BorradorContext.Provider>;
}

export function useBorrador(): BorradorContextValue {
  const value = useContext(BorradorContext);
  if (!value) throw new Error("useBorrador debe usarse dentro de <BorradorProvider>");
  return value;
}
