"use client";

import { Building2, ChevronDown, MapPin, Search, Trash2, UserRound } from "lucide-react";
import { cn, money } from "@/lib/utils";
import {
  actualizarPartida,
  faltanteBorrador,
  importes,
  listaParaGuardar,
  quitarPartida,
  type Borrador,
} from "@/lib/borrador/model";

const COLS = "grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_2.25rem]";
const INPUT =
  "neu-inset h-9 w-full rounded-sm px-2 text-right text-sm tabular-nums text-fg outline-none focus:ring-1 focus:ring-brand";

/**
 * La barra expandida: todo el proceso de la cotización sin salir de la pantalla.
 *
 * Ocupa una altura media fija, no la pantalla completa — el historial y la
 * búsqueda tienen que seguir visibles arriba, porque de ahí sale todo lo que
 * entra aquí. Su altura no la ajusta el usuario a propósito: la manda el
 * contenido, a diferencia de las columnas, que sí se arrastran.
 *
 * El contexto (sucursal, cliente, obra) no se elige aquí con comboboxes — se
 * elige desde la búsqueda de arriba, que sigue viva mientras esto está abierto.
 * Por eso los chips vacíos mandan a buscar en vez de abrir un selector.
 */
export default function BorradorSheet({
  borrador,
  onCambio,
  onColapsar,
  onGuardar,
  guardando,
}: {
  borrador: Borrador;
  onCambio: (next: Borrador) => void;
  onColapsar: () => void;
  onGuardar: () => void;
  guardando: boolean;
}) {
  const { subtotal, iva, total } = importes(borrador);
  const puedeGuardar = listaParaGuardar(borrador) && !guardando;

  return (
    <div className="neu-raised mt-2 flex h-[min(44vh,30rem)] shrink-0 flex-col overflow-hidden rounded-lg">
      <div
        className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 text-white"
        style={{
          backgroundImage:
            "linear-gradient(120deg, var(--brand), color-mix(in srgb, var(--brand) 60%, var(--neu-bg)))",
        }}
      >
        <p className="min-w-0 truncate">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            Cotización en curso ·{" "}
          </span>
          <span className="font-display text-base font-semibold">
            {borrador.cliente?.nombre ?? "Sin cliente"}
          </span>
        </p>
        <button
          type="button"
          onClick={onColapsar}
          aria-label="Colapsar cotización"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Chip icono={<Building2 className="h-4 w-4" />} label="Sucursal" valor={borrador.sucursal?.nombre ?? null} />
          <Chip icono={<UserRound className="h-4 w-4" />} label="Cliente" valor={borrador.cliente?.nombre ?? null} />
          <Chip icono={<MapPin className="h-4 w-4" />} label="Obra" valor={borrador.obra?.nombre ?? null} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Grupo label="Tipo de pago">
            {(["Contado", "Crédito"] as const).map((opcion) => (
              <Opcion
                key={opcion}
                activo={borrador.tipoPago === opcion}
                onClick={() => onCambio({ ...borrador, tipoPago: opcion })}
              >
                {opcion}
              </Opcion>
            ))}
          </Grupo>
          <Grupo label="IVA">
            {([16, 8] as const).map((pct) => (
              <Opcion
                key={pct}
                activo={borrador.ivaPct === pct}
                onClick={() => onCambio({ ...borrador, ivaPct: pct })}
              >
                {pct}%
              </Opcion>
            ))}
          </Grupo>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-fg">Partidas ({borrador.partidas.length})</h3>

          {borrador.partidas.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 rounded-sm bg-muted px-3 py-5 text-sm text-fg-subtle">
              <Search className="h-4 w-4 shrink-0" />
              Busca un SKU arriba y agrégalo desde el panel de detalle.
            </p>
          ) : (
            <>
              <div
                className={cn(
                  "mt-3 grid items-center gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-fg-faint",
                  COLS,
                )}
              >
                <span>Producto</span>
                <span className="text-right">Cantidad</span>
                <span className="text-right">P. unitario</span>
                <span className="text-right">Importe</span>
                <span />
              </div>

              <ul className="space-y-1">
                {borrador.partidas.map((partida) => (
                  <li
                    key={partida.idProducto}
                    className={cn("grid items-center gap-2 rounded-sm px-2 py-2 hover:bg-muted", COLS)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{partida.sku}</span>
                      <span className="block truncate text-xs text-fg-subtle">{partida.descripcion}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={partida.cantidad}
                        aria-label={`Cantidad de ${partida.sku}`}
                        onChange={(event) =>
                          onCambio(
                            actualizarPartida(borrador, partida.idProducto, {
                              cantidad: Number(event.target.value) || 0,
                            }),
                          )
                        }
                        className={INPUT}
                      />
                      <span className="shrink-0 text-[11px] text-fg-faint">{partida.unidad}</span>
                    </span>

                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={partida.precioUnitario}
                      aria-label={`Precio unitario de ${partida.sku}`}
                      onChange={(event) =>
                        onCambio(
                          actualizarPartida(borrador, partida.idProducto, {
                            precioUnitario: Number(event.target.value) || 0,
                          }),
                        )
                      }
                      className={INPUT}
                    />

                    <span className="text-right text-sm font-semibold tabular-nums text-fg">
                      {money(partida.cantidad * partida.precioUnitario)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onCambio(quitarPartida(borrador, partida.idProducto))}
                      title="Quitar partida"
                      aria-label={`Quitar ${partida.sku}`}
                      className="neu-button flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:text-brand"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-line-subtle px-4 py-2.5">
        <Importe label="Subtotal" valor={subtotal} />
        <Importe label={`IVA ${borrador.ivaPct}%`} valor={iva} />
        <Importe label="Total" valor={total} fuerte />
        <button
          type="button"
          onClick={onGuardar}
          disabled={!puedeGuardar}
          title={faltanteBorrador(borrador) ?? undefined}
          className={cn(
            "neu-button inline-flex h-10 items-center rounded-sm px-5 text-sm font-semibold",
            puedeGuardar ? "text-brand" : "cursor-not-allowed text-fg-faint opacity-60",
          )}
        >
          {guardando ? "Guardando…" : "Guardar cotización"}
        </button>
      </div>
    </div>
  );
}

function Chip({ icono, label, valor }: { icono: React.ReactNode; label: string; valor: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-sm bg-muted px-3 py-2">
      <span className={cn("shrink-0", valor ? "text-brand" : "text-fg-faint")}>{icono}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-fg-faint">{label}</span>
        <span className={cn("block truncate text-sm", valor ? "text-fg" : "text-fg-subtle")}>
          {valor ?? "Elígela desde la búsqueda"}
        </span>
      </span>
    </div>
  );
}

function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Opcion({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "h-8 rounded-sm px-3 text-xs font-semibold transition-colors",
        activo ? "bg-brand-tint text-brand" : "text-fg-subtle hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Importe({ label, valor, fuerte }: { label: string; valor: number; fuerte?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">{label}</p>
      <p
        className={cn(
          "tabular-nums",
          fuerte ? "font-display text-xl font-semibold text-fg" : "text-sm text-fg-muted",
        )}
      >
        {money(valor)}
      </p>
    </div>
  );
}
