import { toDbTipoPago } from "../cotizacion/tipoPago";
import { PAGE_SIZE, pageRange, type PaginatedResult } from "../pagination";
import { ilikePattern } from "../search";
import { supabase } from "../supabase";
import type { CtzCotizacion, CtzCotizacionItem, CtzUsuario } from "../types/db";

export type ProductoInput = {
  id_producto: string | null;
  descripcion_registro: string;
  cantidad: number;
  unidad_medida: string | null;
  precio_unitario: number;
  iva_porcentaje: number;
  subtotal_item: number;
  total_item: number;
};

/** Solo columnas de ctz_cotizacion_items (evita enviar campos UI a PostgREST). */
export function toProductoInput(producto: ProductoInput): ProductoInput {
  return {
    id_producto: producto.id_producto,
    descripcion_registro: producto.descripcion_registro,
    cantidad: producto.cantidad,
    unidad_medida: producto.unidad_medida,
    precio_unitario: producto.precio_unitario,
    iva_porcentaje: producto.iva_porcentaje,
    subtotal_item: producto.subtotal_item,
    total_item: producto.total_item,
  };
}

export type CotizacionWithRelations = CtzCotizacion & {
  ctz_clientes: { nombre_cliente: string } | null;
  ctz_obras: { nombre_obra: string; num_obra: string | null; referencia_pago: string | null } | null;
  ctz_sucursales: {
    nombre: string;
    region: string | null;
    prefijo_folio: string;
  } | null;
  ctz_usuarios: { email: string; nombre_completo: string | null; rol: string } | null;
  ctz_cotizacion_items: (CtzCotizacionItem & {
    ctz_productos: { sku: string | null; descripcion: string } | null;
  })[];
};

const SEARCH_RELATED_ID_CAP = 200;

async function buildCotizacionesSearchOr(search: string): Promise<string | null> {
  const pattern = ilikePattern(search);
  if (!pattern || !supabase) return null;

  const [clientesRes, sucursalesRes, obrasRes] = await Promise.all([
    supabase.from("ctz_clientes").select("id").ilike("nombre_cliente", pattern).limit(SEARCH_RELATED_ID_CAP),
    supabase.from("ctz_sucursales").select("id").ilike("nombre", pattern).limit(SEARCH_RELATED_ID_CAP),
    supabase.from("ctz_obras").select("id").ilike("nombre_obra", pattern).limit(SEARCH_RELATED_ID_CAP),
  ]);

  const parts = [`folio.ilike.${pattern}`, `nombre_obra.ilike.${pattern}`];
  const clienteIds = (clientesRes.data ?? []).map((row) => row.id as string);
  const sucursalIds = (sucursalesRes.data ?? []).map((row) => row.id as string);
  const obraIds = (obrasRes.data ?? []).map((row) => row.id as string);
  if (clienteIds.length) parts.push(`id_cliente.in.(${clienteIds.join(",")})`);
  if (sucursalIds.length) parts.push(`id_sucursal.in.(${sucursalIds.join(",")})`);
  if (obraIds.length) parts.push(`id_obra.in.(${obraIds.join(",")})`);
  return parts.join(",");
}

const COTIZACIONES_SELECT = `
      *,
      ctz_clientes(nombre_cliente),
      ctz_obras(nombre_obra,num_obra,referencia_pago),
      ctz_sucursales(nombre,region,prefijo_folio),
      ctz_usuarios(email,nombre_completo,rol),
      ctz_cotizacion_items(*,ctz_productos(sku,descripcion))
    `;

export async function listCotizaciones(
  user: CtzUsuario,
  search?: string,
  options?: { unlimited: true }
): Promise<CotizacionWithRelations[]>;
export async function listCotizaciones(
  user: CtzUsuario,
  search?: string,
  options?: { page?: number; pageSize?: number }
): Promise<PaginatedResult<CotizacionWithRelations>>;
export async function listCotizaciones(
  user: CtzUsuario,
  search = "",
  options?: { unlimited?: boolean; page?: number; pageSize?: number }
): Promise<CotizacionWithRelations[] | PaginatedResult<CotizacionWithRelations>> {
  if (!supabase) {
    if (options?.unlimited) return [];
    return { rows: [], total: 0 };
  }

  let query = supabase
    .from("ctz_cotizaciones")
    .select(COTIZACIONES_SELECT, { count: options?.unlimited ? undefined : "exact" })
    .order("created_at", { ascending: false });

  if (user.rol === "tienda") {
    query = query.eq("id_usuario", user.id);
  }

  if (search.trim()) {
    const orFilter = await buildCotizacionesSearchOr(search);
    if (orFilter) query = query.or(orFilter);
  }

  if (options?.unlimited) {
    const { data } = await query;
    return (data as CotizacionWithRelations[] | null) ?? [];
  }

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? PAGE_SIZE;
  const { from, to } = pageRange(page, pageSize);
  const { data, count } = await query.range(from, to);
  return {
    rows: (data as CotizacionWithRelations[] | null) ?? [],
    total: count ?? 0,
  };
}

export async function getCotizacionById(id: string): Promise<CotizacionWithRelations | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("ctz_cotizaciones")
    .select(
      `
      *,
      ctz_clientes(nombre_cliente),
      ctz_obras(nombre_obra,num_obra,referencia_pago),
      ctz_sucursales(nombre,region,prefijo_folio),
      ctz_usuarios(email,nombre_completo,rol),
      ctz_cotizacion_items(*,ctz_productos(sku,descripcion))
    `
    )
    .eq("id", id)
    .single();
  return (data as CotizacionWithRelations | null) ?? null;
}

export type CreateCotizacionError =
  | "duplicate_folio"
  | "invalid_reference"
  | "cliente_sucursal"
  | "productos"
  | "tipo_pago_invalido"
  | "unknown";

function normalizeCotizacionTipoPago<T extends { tipo_pago?: string | null }>(cotizacion: T): T {
  if (cotizacion.tipo_pago === undefined) return cotizacion;
  return { ...cotizacion, tipo_pago: toDbTipoPago(cotizacion.tipo_pago) };
}

export type CreateCotizacionResult =
  | { ok: true; id: string }
  | { ok: false; error: CreateCotizacionError; message?: string };

function mapCotizacionInsertError(error: { code?: string; message?: string }): CreateCotizacionResult {
  const message = error.message ?? "";
  const lower = message.toLowerCase();
  if (error.code === "23505") return { ok: false, error: "duplicate_folio" };
  if (error.code === "23503") return { ok: false, error: "invalid_reference", message };
  if (lower.includes("cliente no pertenece")) {
    return { ok: false, error: "cliente_sucursal", message };
  }
  if (lower.includes("obra no pertenece")) {
    return { ok: false, error: "cliente_sucursal", message };
  }
  if (
    error.code === "23514" ||
    lower.includes("tipo_pago") ||
    lower.includes("check constraint")
  ) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createCotizacion] tipo_pago:", message);
    }
    return { ok: false, error: "tipo_pago_invalido", message };
  }
  return { ok: false, error: "unknown", message };
}

export async function createCotizacion(payload: {
  cotizacion: Omit<CtzCotizacion, "id" | "created_at" | "updated_at">;
  productos: ProductoInput[];
}): Promise<CreateCotizacionResult> {
  if (!supabase) return { ok: false, error: "unknown" };

  const cotizacionRow = normalizeCotizacionTipoPago(payload.cotizacion);

  const { data: inserted, error: insertHeaderError } = await supabase
    .from("ctz_cotizaciones")
    .insert(cotizacionRow)
    .select("id")
    .single();

  if (insertHeaderError || !inserted?.id) {
    return mapCotizacionInsertError(insertHeaderError ?? { message: "Sin id" });
  }

  const { error: insertProductosError } = await supabase.from("ctz_cotizacion_items").insert(
    payload.productos.map((producto) => ({
      id_cotizacion: inserted.id,
      ...toProductoInput(producto),
    }))
  );

  if (insertProductosError) {
    await supabase.from("ctz_cotizaciones").delete().eq("id", inserted.id);
    return { ok: false, error: "productos", message: insertProductosError.message };
  }

  return { ok: true, id: inserted.id };
}

export async function updateCotizacion(
  id: string,
  payload: Partial<CtzCotizacion>,
  productos: ProductoInput[]
): Promise<boolean> {
  if (!supabase) return false;
  const headerPayload = normalizeCotizacionTipoPago(payload);
  const { error: headerError } = await supabase.from("ctz_cotizaciones").update(headerPayload).eq("id", id);
  if (headerError) return false;

  const { error: deleteError } = await supabase.from("ctz_cotizacion_items").delete().eq("id_cotizacion", id);
  if (deleteError) return false;

  const { error: insertProductosError } = await supabase.from("ctz_cotizacion_items").insert(
    productos.map((producto) => ({
      id_cotizacion: id,
      ...toProductoInput(producto),
    }))
  );
  return !insertProductosError;
}

export async function deleteCotizacion(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error: productosError } = await supabase.from("ctz_cotizacion_items").delete().eq("id_cotizacion", id);
  if (productosError) return false;

  const { error: cotizacionError } = await supabase.from("ctz_cotizaciones").delete().eq("id", id);
  return !cotizacionError;
}

export type UpdateVentaCerradaResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "unknown"; message?: string };

export async function updateVentaCerradaCotizacion(
  user: CtzUsuario,
  id: string,
  ventaCerrada: boolean
): Promise<UpdateVentaCerradaResult> {
  if (!supabase) return { ok: false, error: "unknown" };

  let query = supabase.from("ctz_cotizaciones").update({ venta_cerrada: ventaCerrada }).eq("id", id);
  if (user.rol !== "admin") {
    query = query.eq("id_usuario", user.id);
  }

  const { data, error } = await query.select("id");
  if (error) return { ok: false, error: "unknown", message: error.message };
  if (!data || data.length === 0) return { ok: false, error: "forbidden" };

  return { ok: true };
}
