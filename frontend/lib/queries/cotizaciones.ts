import { toDbTipoPago } from "../cotizacion/tipoPago";
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
  ctz_sucursales: { nombre: string; prefijo_folio: string; terminos_adicionales: string | null; direccion: string | null } | null;
  ctz_usuarios: { email: string; nombre_completo: string | null; rol: string } | null;
  ctz_cotizacion_items: (CtzCotizacionItem & {
    ctz_productos: { sku: string | null; descripcion: string } | null;
  })[];
};

export async function listCotizaciones(user: CtzUsuario, search = ""): Promise<CotizacionWithRelations[]> {
  if (!supabase) return [];
  let query = supabase
    .from("ctz_cotizaciones")
    .select(
      `
      *,
      ctz_clientes(nombre_cliente),
      ctz_sucursales(nombre,prefijo_folio,terminos_adicionales,direccion),
      ctz_usuarios(email,nombre_completo,rol),
      ctz_cotizacion_items(*,ctz_productos(sku,descripcion))
    `
    )
    .order("created_at", { ascending: false });

  if (user.rol === "tienda") {
    query = query.eq("id_usuario", user.id);
  }

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`folio.ilike.${term},nombre_obra.ilike.${term}`);
  }

  const { data } = await query.limit(100);
  return (data as CotizacionWithRelations[] | null) ?? [];
}

export async function getCotizacionById(id: string): Promise<CotizacionWithRelations | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("ctz_cotizaciones")
    .select(
      `
      *,
      ctz_clientes(nombre_cliente),
      ctz_sucursales(nombre,prefijo_folio,terminos_adicionales,direccion),
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
