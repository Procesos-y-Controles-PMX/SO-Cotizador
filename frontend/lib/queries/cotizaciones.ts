import { supabase } from "../supabase";
import type { CtzCotizacion, CtzCotizacionItem, CtzUsuario } from "../types/db";

export type ItemInput = {
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
export function toItemInput(item: ItemInput): ItemInput {
  return {
    id_producto: item.id_producto,
    descripcion_registro: item.descripcion_registro,
    cantidad: item.cantidad,
    unidad_medida: item.unidad_medida,
    precio_unitario: item.precio_unitario,
    iva_porcentaje: item.iva_porcentaje,
    subtotal_item: item.subtotal_item,
    total_item: item.total_item,
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
  | "items"
  | "unknown";

export type CreateCotizacionResult =
  | { ok: true; id: string }
  | { ok: false; error: CreateCotizacionError; message?: string };

function mapCotizacionInsertError(error: { code?: string; message?: string }): CreateCotizacionResult {
  const message = error.message ?? "";
  if (error.code === "23505") return { ok: false, error: "duplicate_folio" };
  if (error.code === "23503") return { ok: false, error: "invalid_reference", message };
  if (message.toLowerCase().includes("cliente no pertenece")) {
    return { ok: false, error: "cliente_sucursal", message };
  }
  return { ok: false, error: "unknown", message };
}

export async function createCotizacion(payload: {
  cotizacion: Omit<CtzCotizacion, "id" | "created_at" | "updated_at">;
  items: ItemInput[];
}): Promise<CreateCotizacionResult> {
  if (!supabase) return { ok: false, error: "unknown" };

  const { data: inserted, error: insertHeaderError } = await supabase
    .from("ctz_cotizaciones")
    .insert(payload.cotizacion)
    .select("id")
    .single();

  if (insertHeaderError || !inserted?.id) {
    return mapCotizacionInsertError(insertHeaderError ?? { message: "Sin id" });
  }

  const { error: insertItemsError } = await supabase.from("ctz_cotizacion_items").insert(
    payload.items.map((item) => ({
      id_cotizacion: inserted.id,
      ...toItemInput(item),
    }))
  );

  if (insertItemsError) {
    await supabase.from("ctz_cotizaciones").delete().eq("id", inserted.id);
    return { ok: false, error: "items", message: insertItemsError.message };
  }

  return { ok: true, id: inserted.id };
}

export async function updateCotizacion(
  id: string,
  payload: Partial<CtzCotizacion>,
  items: ItemInput[]
): Promise<boolean> {
  if (!supabase) return false;
  const { error: headerError } = await supabase.from("ctz_cotizaciones").update(payload).eq("id", id);
  if (headerError) return false;

  const { error: deleteError } = await supabase.from("ctz_cotizacion_items").delete().eq("id_cotizacion", id);
  if (deleteError) return false;

  const { error: insertItemsError } = await supabase.from("ctz_cotizacion_items").insert(
    items.map((item) => ({
      id_cotizacion: id,
      ...toItemInput(item),
    }))
  );
  return !insertItemsError;
}

export async function deleteCotizacion(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error: itemsError } = await supabase.from("ctz_cotizacion_items").delete().eq("id_cotizacion", id);
  if (itemsError) return false;

  const { error: cotizacionError } = await supabase.from("ctz_cotizaciones").delete().eq("id", id);
  return !cotizacionError;
}

