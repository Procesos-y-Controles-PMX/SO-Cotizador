"use client";

import { useRef, useState } from "react";
import { Building2, ChevronDown, MapPin, Package, Trash2, UserRound } from "lucide-react";
import SearchCombobox, { type SearchComboboxOption } from "@/components/ui/SearchCombobox";
import { listClientes } from "@/lib/queries/clientes";
import { listObras } from "@/lib/queries/obras";
import { searchProductosActivosPorDescripcion, searchProductosActivosPorSku } from "@/lib/queries/productos";
import { listSucursales } from "@/lib/queries/sucursales";
import { matchesSearch } from "@/lib/search";
import type { CtzCliente, CtzObra, CtzProducto, CtzSucursal } from "@/lib/types/db";
import { cn, money } from "@/lib/utils";
import {
  actualizarPartida,
  agregarProducto,
  faltanteBorrador,
  fijarCliente,
  fijarObra,
  fijarSucursal,
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
        {/* Catálogos encadenados como la BD los exige: los clientes cuelgan de
            una sucursal y las obras de un cliente. Elegir aquí hace imposible
            la combinación que el insert rechazaría. */}
        <div className="grid gap-2 sm:grid-cols-3">
          <Catalogo
            icono={<Building2 className="h-4 w-4" />}
            label="Sucursal"
            placeholder="Busca una sucursal"
            valor={borrador.sucursal ? { id: borrador.sucursal.id, label: borrador.sucursal.nombre } : null}
            buscar={async (q) => {
              const todas = await listSucursales();
              return q ? todas.filter((item) => matchesSearch(item.nombre, q)) : todas;
            }}
            aOpcion={(item: CtzSucursal) => ({
              id: item.id,
              label: item.nombre,
              sublabel: item.region ?? undefined,
            })}
            onElegir={(item) => onCambio(fijarSucursal(borrador, item))}
          />

          <Catalogo
            icono={<UserRound className="h-4 w-4" />}
            label="Cliente"
            placeholder={borrador.sucursal ? "Busca un cliente" : "Elige la sucursal primero"}
            disabled={!borrador.sucursal}
            valor={borrador.cliente ? { id: borrador.cliente.id, label: borrador.cliente.nombre } : null}
            buscar={(q) => listClientes(q, borrador.sucursal!.id)}
            aOpcion={(item: CtzCliente) => ({ id: item.id, label: item.nombre_cliente })}
            onElegir={(item) =>
              onCambio(fijarCliente(borrador, { id: item.id, nombre: item.nombre_cliente }))
            }
          />

          <Catalogo
            icono={<MapPin className="h-4 w-4" />}
            label="Obra"
            placeholder={borrador.cliente ? "Busca una obra (opcional)" : "Elige el cliente primero"}
            disabled={!borrador.cliente}
            valor={borrador.obra?.id ? { id: borrador.obra.id, label: borrador.obra.nombre } : null}
            buscar={(q) => listObras(q, borrador.cliente!.id)}
            aOpcion={(item: CtzObra) => ({
              id: item.id,
              label: item.nombre_obra,
              sublabel: item.num_obra ?? undefined,
            })}
            onElegir={(item) => onCambio(fijarObra(borrador, { id: item.id, nombre: item.nombre_obra }))}
          />
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">Partidas ({borrador.partidas.length})</h3>
            <div className="w-full sm:w-80">
              {/* Se limpia tras cada alta (`key`) para poder encadenar productos. */}
              <Catalogo
                key={`sku-${borrador.partidas.length}`}
                icono={<Package className="h-4 w-4" />}
                label="Agregar producto"
                placeholder="Busca por SKU o descripción"
                compacto
                minChars={2}
                valor={null}
                buscar={buscarProductos}
                aOpcion={(item: CtzProducto) => ({
                  id: item.id,
                  label: item.sku ?? item.descripcion,
                  sublabel: item.descripcion,
                })}
                onElegir={(item) => onCambio(agregarProducto(borrador, item))}
              />
            </div>
          </div>

          {borrador.partidas.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 rounded-sm bg-muted px-3 py-5 text-sm text-fg-subtle">
              <Package className="h-4 w-4 shrink-0" />
              Agrega productos del catálogo aquí, o desde el panel de detalle al buscar un SKU arriba.
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

/** SKU y descripción son dos consultas distintas; el catálogo busca en ambas. */
async function buscarProductos(q: string): Promise<CtzProducto[]> {
  const [porSku, porDescripcion] = await Promise.all([
    searchProductosActivosPorSku(q),
    searchProductosActivosPorDescripcion(q),
  ]);
  const vistos = new Set<string>();
  return [...porSku, ...porDescripcion].filter((item) =>
    vistos.has(item.id) ? false : (vistos.add(item.id), true),
  );
}

/**
 * Selector de catálogo.
 *
 * `SearchCombobox` habla en opciones `{id,label}`, pero el borrador necesita la
 * entidad completa (la sucursal arrastra prefijo de folio, IVA y términos). Por
 * eso se guarda lo que devolvió la última búsqueda y se resuelve por id al
 * elegir, en vez de volver a consultar.
 */
function Catalogo<T>({
  icono,
  label,
  placeholder,
  valor,
  disabled,
  compacto,
  minChars = 0,
  buscar,
  aOpcion,
  onElegir,
}: {
  icono: React.ReactNode;
  label: string;
  placeholder: string;
  valor: SearchComboboxOption | null;
  disabled?: boolean;
  compacto?: boolean;
  /** 0 abre el catálogo completo al enfocar; el de productos exige escribir. */
  minChars?: number;
  buscar: (query: string) => Promise<T[]>;
  aOpcion: (item: T) => SearchComboboxOption;
  onElegir: (item: T) => void;
}) {
  const cache = useRef(new Map<string, T>());
  const [seleccion, setSeleccion] = useState<SearchComboboxOption | null>(valor);

  return (
    <div className={cn("min-w-0 rounded-sm bg-muted px-3 py-2", disabled && "opacity-60")}>
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-faint">
        <span className={cn("shrink-0", valor ? "text-brand" : "text-fg-faint")}>{icono}</span>
        {label}
      </span>
      <SearchCombobox
        value={compacto ? null : (valor ?? seleccion)}
        disabled={disabled}
        placeholder={placeholder}
        minChars={minChars}
        inputClassName="h-7 w-full bg-transparent px-0 text-sm text-fg outline-none placeholder:text-fg-subtle"
        onSearch={async (query) => {
          const items = await buscar(query);
          cache.current = new Map(items.map((item) => [aOpcion(item).id, item]));
          return items.map(aOpcion);
        }}
        onChange={(option) => {
          setSeleccion(option);
          if (!option) return;
          const item = cache.current.get(option.id);
          if (item) onElegir(item);
        }}
      />
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
