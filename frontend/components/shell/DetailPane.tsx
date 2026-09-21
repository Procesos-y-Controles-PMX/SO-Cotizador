"use client";

import Link from "next/link";
import { Copy, FileText, Plus, X } from "lucide-react";
import { useBorrador } from "@/contexts/BorradorContext";
import { obraNombreCotizacion } from "@/lib/queries/obras";
import type { CotizacionWithRelations } from "@/lib/queries/cotizaciones";
import { GROUP_LABEL_SINGULAR, type SearchHit } from "@/lib/queries/globalSearch";
import { formatQuantity, money } from "@/lib/utils";

const GRADIENTE: Record<SearchHit["kind"], string> = {
  cotizacion: "linear-gradient(150deg, var(--brand), var(--brand-active))",
  cliente: "linear-gradient(150deg, var(--steel), #22324d)",
  obra: "linear-gradient(150deg, #b45309, #7c2d12)",
  sku: "linear-gradient(150deg, #0f766e, #134e4a)",
  sucursal: "linear-gradient(150deg, #6d28d9, #4c1d95)",
};

function fecha(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function sumTotales(rows: CotizacionWithRelations[]) {
  return rows.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle py-2 first:border-t-0">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-fg-strong">{value}</dd>
    </div>
  );
}

/** Portada del panel: ocupa el lugar del arte del álbum en Spotify. */
function Portada({
  kind,
  etiqueta,
  valor,
  pie,
  badge,
}: {
  kind: SearchHit["kind"];
  etiqueta: string;
  valor: string;
  pie?: string;
  badge?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg p-5 pt-14 text-white"
      style={{ backgroundImage: GRADIENTE[kind] }}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{etiqueta}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{valor}</p>
      {pie ? <p className="mt-1 text-xs text-white/75">{pie}</p> : null}
      {badge ? (
        <span className="mt-3 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

/** Cotizaciones que cuelgan de un cliente, obra o sucursal. */
function ListaCotizaciones({
  rows,
  onSelectHit,
}: {
  rows: CotizacionWithRelations[];
  onSelectHit: (hit: SearchHit) => void;
}) {
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() =>
              onSelectHit({
                kind: "cotizacion",
                id: row.id,
                titulo: row.folio,
                subtitulo: row.ctz_clientes?.nombre_cliente ?? "Sin cliente",
                meta: money(row.total),
                cotizacion: row,
              })
            }
            className="neu-tray w-full rounded-sm p-3 text-left transition-colors hover:bg-muted"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-fg">{row.folio}</p>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">{money(row.total)}</p>
            </div>
            <p className="mt-0.5 truncate text-xs text-fg-subtle">
              {obraNombreCotizacion(row)} · {fecha(row.created_at)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function DetailPane({
  hit,
  onClose,
  onSelectHit,
}: {
  hit: SearchHit;
  onClose: () => void;
  onSelectHit: (next: SearchHit) => void;
}) {
  // Las acciones alimentan la cotización en curso, que vive en el layout.
  const { agregarSku, usarCliente, usarObra, usarSucursal } = useBorrador();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-fg-faint">
          {GROUP_LABEL_SINGULAR[hit.kind]}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          className="neu-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {hit.kind === "cotizacion" ? <CuerpoCotizacion row={hit.cotizacion} /> : null}
        {hit.kind === "cliente" || hit.kind === "obra" ? (
          <CuerpoAgrupado hit={hit} onSelectHit={onSelectHit} />
        ) : null}
        {hit.kind === "sucursal" ? <CuerpoSucursal hit={hit} onSelectHit={onSelectHit} /> : null}
        {hit.kind === "sku" ? <CuerpoSku hit={hit} /> : null}
      </div>

      {hit.kind === "cotizacion" ? (
        <div className="flex shrink-0 gap-2 border-t border-line-subtle p-3">
          <Link
            href={`/cotizaciones/${hit.id}`}
            className="neu-button inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
          >
            <FileText className="h-4 w-4" />
            Ver completa
          </Link>
          <Link
            href={`/cotizaciones/nueva?copiar=${hit.id}`}
            title="Duplicar cotización"
            aria-label="Duplicar cotización"
            className="neu-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-fg-strong"
          >
            <Copy className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {hit.kind === "sku" ? (
        <div className="shrink-0 border-t border-line-subtle p-3">
          <button
            type="button"
            onClick={() => agregarSku(hit.producto, hit.titulo)}
            className="neu-button inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
          >
            <Plus className="h-4 w-4" />
            Agregar a la cotización
          </button>
        </div>
      ) : null}

      {hit.kind === "obra" || hit.kind === "sucursal" ? (
        <div className="shrink-0 border-t border-line-subtle p-3">
          <button
            type="button"
            onClick={() =>
              hit.kind === "obra"
                ? usarObra({ id: hit.id, nombre: hit.titulo })
                : usarSucursal(hit.sucursal)
            }
            className="neu-button inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
          >
            <Plus className="h-4 w-4" />
            {hit.kind === "obra" ? "Cotizar para esta obra" : "Cotizar desde esta sucursal"}
          </button>
        </div>
      ) : null}

      {hit.kind === "cliente" ? (
        <div className="shrink-0 border-t border-line-subtle p-3">
          <button
            type="button"
            onClick={() => usarCliente({ id: hit.id, nombre: hit.titulo })}
            className="neu-button inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-fg-strong"
          >
            <Plus className="h-4 w-4" />
            Cotizar para este cliente
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CuerpoCotizacion({ row }: { row: CotizacionWithRelations }) {
  const items = row.ctz_cotizacion_items ?? [];
  return (
    <>
      <Portada
        kind="cotizacion"
        etiqueta="Total"
        valor={money(row.total)}
        pie={row.mostrar_con_iva ? `IVA incluido · ${money(row.iva_total)}` : "Sin IVA"}
        badge={row.venta_cerrada ? "Venta cerrada" : undefined}
      />

      <h2 className="mt-4 font-display text-xl font-semibold leading-tight text-fg">
        {row.ctz_clientes?.nombre_cliente ?? "Sin cliente"}
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        {obraNombreCotizacion(row)} · {row.ctz_sucursales?.nombre ?? "—"}
      </p>

      <dl className="mt-5">
        <Dato label="Folio" value={row.folio} />
        <Dato label="Sucursal" value={row.ctz_sucursales?.nombre ?? "—"} />
        <Dato label="Región" value={row.ctz_sucursales?.region ?? "—"} />
        <Dato label="Tipo de pago" value={row.tipo_pago ?? "—"} />
        <Dato label="Registró" value={row.ctz_usuarios?.nombre_completo ?? row.ctz_usuarios?.email ?? "—"} />
        <Dato label="Fecha" value={fecha(row.created_at)} />
      </dl>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-fg">Productos ({items.length})</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-fg-subtle">Esta cotización no tiene partidas.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="neu-tray rounded-sm p-3">
                <p className="truncate text-sm font-medium text-fg">
                  {item.ctz_productos?.descripcion ?? item.descripcion_registro}
                </p>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <p className="truncate text-xs text-fg-subtle">
                    {formatQuantity(item.cantidad)} {item.unidad_medida ?? ""} × {money(item.precio_unitario)}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">{money(item.total_item)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {row.comentarios?.trim() ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-fg">Comentarios</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{row.comentarios}</p>
        </section>
      ) : null}
    </>
  );
}

function CuerpoAgrupado({
  hit,
  onSelectHit,
}: {
  hit: Extract<SearchHit, { kind: "cliente" | "obra" }>;
  onSelectHit: (next: SearchHit) => void;
}) {
  const rows = hit.cotizaciones;
  const cerradas = rows.filter((row) => row.venta_cerrada).length;
  return (
    <>
      <Portada
        kind={hit.kind}
        etiqueta="Cotizado"
        valor={money(sumTotales(rows))}
        pie={`${rows.length} cotización${rows.length === 1 ? "" : "es"}`}
        badge={cerradas > 0 ? `${cerradas} cerrada${cerradas === 1 ? "" : "s"}` : undefined}
      />

      <h2 className="mt-4 font-display text-xl font-semibold leading-tight text-fg">{hit.titulo}</h2>
      <p className="mt-1 text-sm text-fg-muted">{hit.subtitulo}</p>

      <dl className="mt-5">
        <Dato label="Cotizaciones" value={String(rows.length)} />
        <Dato label="Cerradas" value={`${cerradas} de ${rows.length}`} />
        <Dato label="Última" value={rows[0] ? fecha(rows[0].created_at) : "—"} />
      </dl>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-fg">Cotizaciones</h3>
        <ListaCotizaciones rows={rows} onSelectHit={onSelectHit} />
      </section>
    </>
  );
}

function CuerpoSucursal({
  hit,
  onSelectHit,
}: {
  hit: Extract<SearchHit, { kind: "sucursal" }>;
  onSelectHit: (next: SearchHit) => void;
}) {
  const { sucursal, cotizaciones } = hit;
  return (
    <>
      <Portada
        kind="sucursal"
        etiqueta="Prefijo de folio"
        valor={sucursal.prefijo_folio || "—"}
        pie={[sucursal.region, sucursal.ciudad].filter(Boolean).join(" · ") || undefined}
        badge={sucursal.activo ? undefined : "Inactiva"}
      />

      <h2 className="mt-4 font-display text-xl font-semibold leading-tight text-fg">{sucursal.nombre}</h2>
      <p className="mt-1 text-sm text-fg-muted">{sucursal.direccion ?? "Sin dirección registrada"}</p>

      <dl className="mt-5">
        <Dato label="Región" value={sucursal.region ?? "—"} />
        <Dato label="Ciudad" value={sucursal.ciudad ?? "—"} />
        <Dato label="Centro" value={sucursal.centro ?? "—"} />
        <Dato label="IVA" value={`${sucursal.iva_predeterminado}%`} />
      </dl>

      {cotizaciones.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-fg">En estos resultados</h3>
          <ListaCotizaciones rows={cotizaciones} onSelectHit={onSelectHit} />
        </section>
      ) : null}
    </>
  );
}

function CuerpoSku({ hit }: { hit: Extract<SearchHit, { kind: "sku" }> }) {
  const { producto } = hit;
  return (
    <>
      <Portada
        kind="sku"
        etiqueta="Precio base"
        valor={money(producto.precio_unitario_base)}
        pie={producto.unidad_medida ? `por ${producto.unidad_medida}` : undefined}
        badge={producto.activo ? undefined : "Inactivo"}
      />

      <h2 className="mt-4 font-display text-xl font-semibold leading-tight text-fg">{producto.descripcion}</h2>
      <p className="mt-1 font-mono text-sm text-fg-muted">{producto.sku ?? "Sin SKU"}</p>

      <dl className="mt-5">
        <Dato label="SKU" value={producto.sku ?? "—"} />
        <Dato label="Unidad" value={producto.unidad_medida ?? "—"} />
        <Dato label="Precio base" value={money(producto.precio_unitario_base)} />
        <Dato label="Estado" value={producto.activo ? "Activo" : "Inactivo"} />
      </dl>

      <p className="mt-6 text-sm text-fg-subtle">{hit.meta}</p>
    </>
  );
}
