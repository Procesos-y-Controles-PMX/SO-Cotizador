"use client";

import { Building2, ChevronUp, FilePlus2, Package, UserRound, X } from "lucide-react";
import { cn, money } from "@/lib/utils";
import { importes, PASOS_TOTALES, pasosListos, type Borrador } from "@/lib/borrador/model";

/**
 * Barra inferior persistente: el equivalente al reproductor de Spotify.
 *
 * No es una barra de estado — muestra el objeto en el que estás trabajando
 * (la cotización en curso) y te deja volver a él desde donde sea.
 */
export default function BorradorBar({
  borrador,
  onNuevo,
  onDescartar,
  onExpandir,
}: {
  borrador: Borrador | null;
  onNuevo: () => void;
  onDescartar: () => void;
  onExpandir: () => void;
}) {
  if (!borrador) {
    return (
      <div className={cn("neu-dark-canvas shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]", "mt-2 flex h-14 shrink-0 items-center justify-between gap-3 rounded-lg px-4")}>
        <p className="truncate text-sm text-fg-subtle">
          No hay ninguna cotización en curso.
        </p>
        <button
          type="button"
          onClick={onNuevo}
          className="neu-button inline-flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
        >
          <FilePlus2 className="h-4 w-4" />
          Empezar una
        </button>
      </div>
    );
  }

  const { total } = importes(borrador);
  const partidas = borrador.partidas.length;
  const pasos = pasosListos(borrador);
  const ultima = borrador.partidas[partidas - 1];

  return (
    <div className={cn("neu-dark-canvas shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]", "mt-2 flex h-16 shrink-0 items-center gap-4 rounded-lg px-3")}>
      {/* Izquierda: qué es. Ocupa el lugar de la carátula del álbum y, como
          ella, es lo que abre la vista completa. */}
      <button
        type="button"
        onClick={onExpandir}
        aria-label="Abrir la cotización en curso"
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-white"
          style={{ backgroundImage: "linear-gradient(150deg, var(--brand), var(--brand-active))" }}
          aria-hidden
        >
          <FilePlus2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg group-hover:text-brand">
            {borrador.cliente?.nombre ?? "Cotización sin cliente"}
          </p>
          <p className="truncate text-xs text-fg-subtle">
            {borrador.sucursal?.nombre ?? "Sin sucursal"}
            {ultima ? ` · último: ${ultima.sku}` : " · sin partidas"}
          </p>
        </div>
        <ChevronUp className="h-4 w-4 shrink-0 text-fg-faint group-hover:text-brand" />
      </button>

      {/* Centro: qué falta. Es la barra de progreso del reproductor. */}
      <div className="hidden min-w-0 flex-1 flex-col items-center gap-1.5 md:flex">
        <div className="flex items-center gap-3 text-xs">
          <Paso icono={<Building2 className="h-3.5 w-3.5" />} listo={Boolean(borrador.sucursal)}>
            Sucursal
          </Paso>
          <Paso icono={<UserRound className="h-3.5 w-3.5" />} listo={Boolean(borrador.cliente)}>
            Cliente
          </Paso>
          <Paso icono={<Package className="h-3.5 w-3.5" />} listo={partidas > 0}>
            {partidas === 1 ? "1 partida" : `${partidas} partidas`}
          </Paso>
        </div>
        <div className="h-1 w-full max-w-56 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${(pasos / PASOS_TOTALES) * 100}%` }}
          />
        </div>
      </div>

      {/* Derecha: cuánto va y a dónde sigue. */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">Total</p>
          <p className="font-display text-base font-semibold tabular-nums text-fg">{money(total)}</p>
        </div>
        <button
          type="button"
          onClick={onExpandir}
          className="neu-button inline-flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
        >
          Continuar
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDescartar}
          title="Descartar borrador"
          aria-label="Descartar borrador"
          className="neu-button flex h-9 w-9 items-center justify-center rounded-full text-fg-subtle hover:text-brand"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Paso({
  icono,
  listo,
  children,
}: {
  icono: React.ReactNode;
  listo: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        listo ? "font-semibold text-brand" : "text-fg-faint",
      )}
    >
      {icono}
      {children}
    </span>
  );
}
