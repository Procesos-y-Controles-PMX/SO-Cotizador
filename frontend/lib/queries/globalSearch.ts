import { listCotizaciones, type CotizacionWithRelations } from "./cotizaciones";
import { listInventarioProductos } from "./productos";
import { listSucursales } from "./sucursales";
import { obraNombreCotizacion } from "./obras";
import { matchesSearch, SEARCH_MIN_CHARS } from "../search";
import type { CtzProducto, CtzSucursal, CtzUsuario } from "../types/db";

/**
 * Búsqueda global del shell. Cotizaciones y SKUs salen de sus
 * consultas de siempre (la de cotizaciones ya viene acotada por rol); clientes
 * y obras se derivan de las cotizaciones visibles, así heredan ese mismo
 * alcance sin inventar reglas de permisos nuevas.
 */
export type SearchHit =
  | {
      kind: "cotizacion";
      id: string;
      titulo: string;
      subtitulo: string;
      meta: string;
      cotizacion: CotizacionWithRelations;
    }
  | {
      kind: "cliente";
      id: string;
      titulo: string;
      subtitulo: string;
      meta: string;
      cotizaciones: CotizacionWithRelations[];
    }
  | {
      kind: "obra";
      id: string;
      titulo: string;
      subtitulo: string;
      meta: string;
      cotizaciones: CotizacionWithRelations[];
    }
  | {
      kind: "sku";
      id: string;
      titulo: string;
      subtitulo: string;
      meta: string;
      producto: CtzProducto;
    }
  | {
      kind: "sucursal";
      id: string;
      titulo: string;
      subtitulo: string;
      meta: string;
      sucursal: CtzSucursal;
      cotizaciones: CotizacionWithRelations[];
    };

export type SearchHitKind = SearchHit["kind"];

export type SearchGroup = {
  key: string;
  label: string;
  /** Coincidencias laterales: no empatan con el texto, cuelgan de lo que sí. */
  relacionado?: boolean;
  hits: SearchHit[];
};

export const GROUP_LABEL: Record<SearchHitKind, string> = {
  cotizacion: "Cotizaciones",
  cliente: "Clientes",
  obra: "Obras",
  sku: "SKUs",
  sucursal: "Sucursales",
};

export const GROUP_LABEL_SINGULAR: Record<SearchHitKind, string> = {
  cotizacion: "Cotización",
  cliente: "Cliente",
  obra: "Obra",
  sku: "SKU",
  sucursal: "Sucursal",
};

const MAX_POR_GRUPO = 8;
const COTIZACIONES_SCAN = 60;

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function sumTotales(rows: CotizacionWithRelations[]): number {
  return rows.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
}

/** Agrupa cotizaciones por una llave derivada y arma los hits de ese tipo. */
function agrupar(
  rows: CotizacionWithRelations[],
  kind: "cliente" | "obra",
  llave: (row: CotizacionWithRelations) => { id: string; titulo: string; subtitulo: string } | null,
  q: string,
): SearchHit[] {
  const mapa = new Map<string, { titulo: string; subtitulo: string; rows: CotizacionWithRelations[] }>();
  for (const row of rows) {
    const key = llave(row);
    if (!key) continue;
    const found = mapa.get(key.id);
    if (found) found.rows.push(row);
    else mapa.set(key.id, { titulo: key.titulo, subtitulo: key.subtitulo, rows: [row] });
  }
  return [...mapa.entries()]
    .filter(([, value]) => matchesSearch(value.titulo, q))
    .sort((a, b) => b[1].rows.length - a[1].rows.length)
    .slice(0, MAX_POR_GRUPO)
    .map(([id, value]) => ({
      kind,
      id,
      titulo: value.titulo,
      subtitulo: value.subtitulo,
      meta: `${value.rows.length} cotización${value.rows.length === 1 ? "" : "es"} · ${money(sumTotales(value.rows))}`,
      cotizaciones: value.rows,
    }));
}

export async function globalSearch(user: CtzUsuario, q: string): Promise<SearchGroup[]> {
  const trimmed = q.trim();
  if (trimmed.length < SEARCH_MIN_CHARS) return [];

  const esAdmin = user.rol === "admin";
  const [cotResult, productos, sucursales] = await Promise.all([
    listCotizaciones(user, trimmed, { page: 1, pageSize: COTIZACIONES_SCAN }),
    listInventarioProductos(trimmed),
    esAdmin ? listSucursales() : Promise.resolve<CtzSucursal[]>([]),
  ]);

  const rows = cotResult.rows;

  const cotizacionHits: SearchHit[] = rows.slice(0, MAX_POR_GRUPO).map((row) => ({
    kind: "cotizacion",
    id: row.id,
    titulo: row.folio,
    subtitulo: row.ctz_clientes?.nombre_cliente ?? "Sin cliente",
    meta: `${obraNombreCotizacion(row)} · ${money(row.total)}`,
    cotizacion: row,
  }));

  const clienteHits = agrupar(rows, "cliente", (row) =>
    row.id_cliente && row.ctz_clientes
      ? {
          id: row.id_cliente,
          titulo: row.ctz_clientes.nombre_cliente,
          subtitulo: row.ctz_sucursales?.nombre ?? "—",
        }
      : null,
    trimmed,
  );

  const obraHits = agrupar(rows, "obra", (row) => {
    const nombre = obraNombreCotizacion(row);
    if (!nombre || nombre === "-") return null;
    return {
      id: row.id_obra ?? `sin-id:${nombre}`,
      titulo: nombre,
      subtitulo: row.ctz_clientes?.nombre_cliente ?? "Sin cliente",
    };
  }, trimmed);

  const skuHits: SearchHit[] = productos.slice(0, MAX_POR_GRUPO).map((producto) => ({
    kind: "sku",
    id: producto.id,
    titulo: producto.sku ?? "Sin SKU",
    subtitulo: producto.descripcion,
    meta: `${money(producto.precio_unitario_base)} · ${producto.unidad_medida ?? "—"}`,
    producto,
  }));

  const sucursalHits: SearchHit[] = sucursales
    .filter(
      (s) =>
        matchesSearch(s.nombre, trimmed) ||
        (s.region ? matchesSearch(s.region, trimmed) : false) ||
        (s.ciudad ? matchesSearch(s.ciudad, trimmed) : false),
    )
    .slice(0, MAX_POR_GRUPO)
    .map((sucursal) => {
      const propias = rows.filter((row) => row.id_sucursal === sucursal.id);
      return {
        kind: "sucursal" as const,
        id: sucursal.id,
        titulo: sucursal.nombre,
        subtitulo: [sucursal.region, sucursal.ciudad].filter(Boolean).join(" · ") || "—",
        meta: `Folio ${sucursal.prefijo_folio}${propias.length ? ` · ${propias.length} en resultados` : ""}`,
        sucursal,
        cotizaciones: propias,
      };
    });

  const directos: SearchGroup[] = [
    { key: "cotizacion", label: GROUP_LABEL.cotizacion, hits: cotizacionHits },
    { key: "cliente", label: GROUP_LABEL.cliente, hits: clienteHits },
    { key: "obra", label: GROUP_LABEL.obra, hits: obraHits },
    { key: "sku", label: GROUP_LABEL.sku, hits: skuHits },
    { key: "sucursal", label: GROUP_LABEL.sucursal, hits: sucursalHits },
  ];

  const yaListados = new Set(directos.flatMap((g) => g.hits).map((h) => `${h.kind}:${h.id}`));
  const relacionados = derivarRelacionados(rows, sucursales, yaListados);

  return [
    ...directos,
    { key: "relacionado", label: "Relacionados", relacionado: true, hits: relacionados },
  ].filter((group) => group.hits.length > 0);
}

/**
 * Lo que no empató con el texto pero cuelga de lo que sí: los SKUs más
 * cotizados dentro de los resultados y las sucursales donde cayeron. Es la
 * banda que en apps con mucho contenido evita que la búsqueda se sienta plana.
 */
function derivarRelacionados(
  rows: CotizacionWithRelations[],
  sucursales: CtzSucursal[],
  yaListados: Set<string>,
): SearchHit[] {
  if (rows.length === 0) return [];

  const porSku = new Map<string, { producto: CtzProducto; veces: number; importe: number }>();
  for (const row of rows) {
    for (const item of row.ctz_cotizacion_items ?? []) {
      if (!item.id_producto) continue;
      const found = porSku.get(item.id_producto);
      if (found) {
        found.veces += 1;
        found.importe += Number(item.total_item) || 0;
        continue;
      }
      porSku.set(item.id_producto, {
        producto: {
          id: item.id_producto,
          sku: item.ctz_productos?.sku ?? null,
          descripcion: item.ctz_productos?.descripcion ?? item.descripcion_registro,
          unidad_medida: item.unidad_medida,
          precio_unitario_base: Number(item.precio_unitario) || 0,
          activo: true,
          created_at: item.created_at,
        },
        veces: 1,
        importe: Number(item.total_item) || 0,
      });
    }
  }

  const skus: SearchHit[] = [...porSku.values()]
    .filter((entry) => !yaListados.has(`sku:${entry.producto.id}`))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 4)
    .map((entry) => ({
      kind: "sku",
      id: entry.producto.id,
      titulo: entry.producto.sku ?? "Sin SKU",
      subtitulo: entry.producto.descripcion,
      meta: `En ${entry.veces} de estas cotizaciones · ${money(entry.importe)}`,
      producto: entry.producto,
    }));

  const sucursalPorId = new Map(sucursales.map((s) => [s.id, s]));
  const conteoSucursal = new Map<string, CotizacionWithRelations[]>();
  for (const row of rows) {
    const lista = conteoSucursal.get(row.id_sucursal);
    if (lista) lista.push(row);
    else conteoSucursal.set(row.id_sucursal, [row]);
  }

  const sedes: SearchHit[] = [...conteoSucursal.entries()]
    .filter(([id]) => !yaListados.has(`sucursal:${id}`))
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([id, propias]) => {
      const sucursal = sucursalPorId.get(id);
      const nombre = sucursal?.nombre ?? propias[0]?.ctz_sucursales?.nombre ?? "Sucursal";
      return {
        kind: "sucursal" as const,
        id,
        titulo: nombre,
        subtitulo: sucursal?.region ?? propias[0]?.ctz_sucursales?.region ?? "—",
        meta: `${propias.length} cotización${propias.length === 1 ? "" : "es"} en estos resultados`,
        sucursal:
          sucursal ?? {
            id,
            nombre,
            prefijo_folio: propias[0]?.ctz_sucursales?.prefijo_folio ?? "",
            region: propias[0]?.ctz_sucursales?.region ?? null,
            iva_predeterminado: 0,
            ciudad: null,
            centro: null,
            direccion: null,
            terminos_adicionales: null,
            activo: true,
            created_at: new Date().toISOString(),
          },
        cotizaciones: propias,
      };
    });

  return [...skus, ...sedes];
}
